import {
    hit,
    toRegExp,
    logMessage,
    getXhrData,
    objectToString,
    matchRequestProps,
    // following helpers should be imported and injected
    // because they are used by helpers above
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet m3u-prune
 *
 * @description
 * Removes content from the specified M3U file.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#m3u-prunejs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('m3u-prune'[, propsToRemove[, urlToMatch]])
 * ```
 *
 * - `propsToRemove` — optional, string or regular expression
 *   to match the URL line (segment) which will be removed alongside with its tags
 * - `urlToMatch` — optional, string or regular expression for matching the request's URL
 *
 * > Usage with no arguments will log response payload and URL to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Removes a tag which contains `example.com/video/`, from all requests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('m3u-prune', 'example.com/video/')
 *     ```
 *
 * 1. Removes a line which contains `example.com/video/`, only if request's URL contains `.m3u8`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('m3u-prune', 'example.com/video/', '.m3u8')
 *     ```
 *
 * 1. Call with no arguments will log response payload and URL at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('m3u-prune')
 *     ```
 *
 * 1. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
 *
 *     ```adblock
 *     example.org#%#//scriptlet('m3u-prune', '', '.m3u8')
 *     ```
 *
 * @added v1.9.1.
 */
/* eslint-enable max-len */

export function m3uPrune(source, propsToRemove, urlToMatch = '') {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect
    if (typeof Reflect === 'undefined'
        || typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    let shouldPruneResponse = false;

    const urlMatchRegexp = toRegExp(urlToMatch);

    const SEGMENT_MARKER = '#';

    const AD_MARKER = {
        ASSET: '#EXT-X-ASSET:',
        CUE: '#EXT-X-CUE:',
        CUE_IN: '#EXT-X-CUE-IN',
        DISCONTINUITY: '#EXT-X-DISCONTINUITY',
        EXTINF: '#EXTINF',
        EXTM3U: '#EXTM3U',
        SCTE35: '#EXT-X-SCTE35:',
    };

    const COMCAST_AD_MARKER = {
        AD: '-AD-',
        VAST: '-VAST-',
        VMAP_AD: '-VMAP-AD-',
        VMAP_AD_BREAK: '#EXT-X-VMAP-AD-BREAK:',
    };

    // List of tags which should not be removed
    const TAGS_ALLOWLIST = [
        '#EXT-X-TARGETDURATION',
        '#EXT-X-MEDIA-SEQUENCE',
        '#EXT-X-DISCONTINUITY-SEQUENCE',
        '#EXT-X-ENDLIST',
        '#EXT-X-PLAYLIST-TYPE',
        '#EXT-X-I-FRAMES-ONLY',
        '#EXT-X-MEDIA',
        '#EXT-X-STREAM-INF',
        '#EXT-X-I-FRAME-STREAM-INF',
        '#EXT-X-SESSION-DATA',
        '#EXT-X-SESSION-KEY',
        '#EXT-X-INDEPENDENT-SEGMENTS',
        '#EXT-X-START',
    ];

    const isAllowedTag = (str) => {
        return TAGS_ALLOWLIST.some((el) => str.startsWith(el));
    };

    /**
     * Sets an item in array to undefined, if it contains one of the
     * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY
     *
     * @param {Array} lines
     * @param {number} i
     * @returns {object} { array, index }
     */
    const pruneExtinfFromVmapBlock = (lines, i) => {
        let array = lines.slice();
        let index = i;
        if (array[index].includes(AD_MARKER.EXTINF)) {
            array[index] = undefined;
            index += 1;
            if (array[index].includes(AD_MARKER.DISCONTINUITY)) {
                array[index] = undefined;
                index += 1;
                const prunedExtinf = pruneExtinfFromVmapBlock(array, index);
                array = prunedExtinf.array;
                index = prunedExtinf.index;
            }
        }
        return { array, index };
    };

    /**
     * Sets an item in array to undefined, if it contains one of the
     * COMCAST_AD_MARKER: COMCAST_AD_MARKER.VMAP_AD, COMCAST_AD_MARKER.VAST, COMCAST_AD_MARKER.AD
     *
     * @param {Array} lines
     * @returns {Array}
     */
    const pruneVmapBlock = (lines) => {
        let array = lines.slice();
        for (let i = 0; i < array.length - 1; i += 1) {
            if (array[i].includes(COMCAST_AD_MARKER.VMAP_AD)
                || array[i].includes(COMCAST_AD_MARKER.VAST)
                || array[i].includes(COMCAST_AD_MARKER.AD)) {
                array[i] = undefined;
                if (array[i + 1].includes(AD_MARKER.EXTINF)) {
                    i += 1;
                    const prunedExtinf = pruneExtinfFromVmapBlock(array, i);
                    array = prunedExtinf.array;
                    // It's necessary to subtract 1 from "i",
                    // otherwise one line will be skipped
                    i = prunedExtinf.index - 1;
                }
            }
        }
        return array;
    };

    /**
     * Sets an item in array to undefined, if it contains one of the
     * AD_MARKER: AD_MARKER.CUE, AD_MARKER.ASSET, AD_MARKER.SCTE35, AD_MARKER.CUE_IN
     *
     * @param {string} line
     * @param {number} index
     * @param {Array} array
     * @returns {string|undefined}
     */

    const pruneSpliceoutBlock = (line, index, array) => {
        if (!line.startsWith(AD_MARKER.CUE)) {
            return line;
        }
        line = undefined;
        index += 1;
        if (array[index].startsWith(AD_MARKER.ASSET)) {
            array[index] = undefined;
            index += 1;
        }
        if (array[index].startsWith(AD_MARKER.SCTE35)) {
            array[index] = undefined;
            index += 1;
        }
        if (array[index].startsWith(AD_MARKER.CUE_IN)) {
            array[index] = undefined;
            index += 1;
        }
        if (array[index].startsWith(AD_MARKER.SCTE35)) {
            array[index] = undefined;
        }
        return line;
    };

    const removeM3ULineRegexp = toRegExp(propsToRemove);

    /**
     * Sets an item in array to undefined, if it contains removeM3ULineRegexp and one of the
     * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY
     *
     * @param {string} line
     * @param {number} index
     * @param {Array} array
     * @returns {string|undefined}
     */

    const pruneInfBlock = (line, index, array) => {
        if (!line.startsWith(AD_MARKER.EXTINF)) {
            return line;
        }
        if (!removeM3ULineRegexp.test(array[index + 1])) {
            return line;
        }
        if (!isAllowedTag(array[index])) {
            array[index] = undefined;
        }
        index += 1;
        if (!isAllowedTag(array[index])) {
            array[index] = undefined;
        }
        index += 1;
        if (array[index].startsWith(AD_MARKER.DISCONTINUITY)) {
            array[index] = undefined;
        }
        return line;
    };

    /**
     * Removes block of segments (if it contains removeM3ULineRegexp) until another segment occurs
     *
     * @param {Array} lines
     * @returns {Array}
     */
    const pruneSegments = (lines) => {
        for (let i = 0; i < lines.length - 1; i += 1) {
            if (lines[i]?.startsWith(SEGMENT_MARKER) && removeM3ULineRegexp.test(lines[i])) {
                const segmentName = lines[i].substring(0, lines[i].indexOf(':'));
                if (!segmentName) {
                    return lines;
                }
                lines[i] = undefined;
                i += 1;
                for (let j = i; j < lines.length; j += 1) {
                    if (!lines[j].includes(segmentName)
                        && !isAllowedTag(lines[j])) {
                        lines[j] = undefined;
                    } else {
                        i = j - 1;
                        break;
                    }
                }
            }
        }
        return lines;
    };

    /**
     * Determines if text contains "#EXTM3U" or "VMAP_AD_BREAK"
     *
     * @param {*} text
     * @returns {boolean}
     */
    const isM3U = (text) => {
        if (typeof text === 'string') {
            // Check if "text" starts with "#EXTM3U" or with "VMAP_AD_BREAK"
            // If so, then it might be an M3U file and should be pruned or logged
            const trimmedText = text.trim();
            return trimmedText.startsWith(AD_MARKER.EXTM3U)
                || trimmedText.startsWith(COMCAST_AD_MARKER.VMAP_AD_BREAK);
        }
        return false;
    };

    /**
     * Determines if pruning is needed
     *
     * @param {string} text
     * @param {RegExp} regexp
     * @returns {boolean}
     */
    const isPruningNeeded = (text, regexp) => isM3U(text) && regexp.test(text);

    /**
     * Prunes lines which contain removeM3ULineRegexp and specific AD_MARKER
     *
     * @param {string} text
     * @returns {string}
     */
    // TODO: make it compatible with $hls modifier
    const pruneM3U = (text) => {
        let lines = text.split(/\r?\n/);

        if (text.includes(COMCAST_AD_MARKER.VMAP_AD_BREAK)) {
            lines = pruneVmapBlock(lines);
            return lines.filter((l) => !!l).join('\n');
        }

        lines = pruneSegments(lines);

        return lines
            .map((line, index, array) => {
                if (typeof line === 'undefined') {
                    return line;
                }
                line = pruneSpliceoutBlock(line, index, array);
                if (typeof line !== 'undefined') {
                    line = pruneInfBlock(line, index, array);
                }
                return line;
            })
            .filter((l) => !!l)
            .join('\n');
    };

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    let xhrData;

    const openWrapper = (target, thisArg, args) => {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);

        if (matchRequestProps(source, urlToMatch, xhrData)) {
            thisArg.shouldBePruned = true;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePruned) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = (target, thisArg, args) => {
                // Collect headers
                thisArg.collectedHeaders.push(args);
                return Reflect.apply(target, thisArg, args);
            };

            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };

            // setRequestHeader can only be called on open xhr object,
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        const allowedResponseTypeValues = ['', 'text'];
        // Do nothing if request do not match
        // or response type is not a string
        if (!thisArg.shouldBePruned || !allowedResponseTypeValues.includes(thisArg.responseType)) {
            return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', () => {
            if (forgedRequest.readyState !== 4) {
                return;
            }

            const {
                readyState,
                response,
                responseText,
                responseURL,
                responseXML,
                status,
                statusText,
            } = forgedRequest;

            // Extract content from response
            const content = responseText || response;
            if (typeof content !== 'string') {
                return;
            }

            if (!propsToRemove) {
                if (isM3U(response)) {
                    const message = `XMLHttpRequest.open() URL: ${responseURL}\nresponse: ${response}`;
                    logMessage(source, message);
                }
            } else {
                shouldPruneResponse = isPruningNeeded(response, removeM3ULineRegexp);
            }
            const responseContent = shouldPruneResponse ? pruneM3U(response) : response;
            // Manually put required values into target XHR object
            // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
            Object.defineProperties(thisArg, {
                // original values
                readyState: { value: readyState, writable: false },
                responseURL: { value: responseURL, writable: false },
                responseXML: { value: responseXML, writable: false },
                status: { value: status, writable: false },
                statusText: { value: statusText, writable: false },
                // modified values
                response: { value: responseContent, writable: false },
                responseText: { value: responseContent, writable: false },
            });

            // Mock events
            setTimeout(() => {
                const stateEvent = new Event('readystatechange');
                thisArg.dispatchEvent(stateEvent);

                const loadEvent = new Event('load');
                thisArg.dispatchEvent(loadEvent);

                const loadEndEvent = new Event('loadend');
                thisArg.dispatchEvent(loadEndEvent);
            }, 1);
            hit(source);
        });

        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach((header) => {
            const name = header[0];
            const value = header[1];

            forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];

        try {
            nativeSend.call(forgedRequest, args);
        } catch {
            return Reflect.apply(target, thisArg, args);
        }
        return undefined;
    };

    const openHandler = {
        apply: openWrapper,
    };

    const sendHandler = {
        apply: sendWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);

    const nativeFetch = window.fetch;

    const fetchWrapper = async (target, thisArg, args) => {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            const response = await nativeFetch(...args);
            // It's required to fix issue with - Request with body": Failed to execute 'fetch' on 'Window':
            // Cannot construct a Request with a Request object that has already been used.
            // For example, it occurs on youtube when scriptlet is used without arguments
            const clonedResponse = response.clone();
            const responseText = await response.text();
            // If "propsToRemove" is not defined, then response should be logged only
            if (!propsToRemove && isM3U(responseText)) {
                const message = `fetch URL: ${fetchURL}\nresponse text: ${responseText}`;
                logMessage(source, message);
                return clonedResponse;
            }
            if (isPruningNeeded(responseText, removeM3ULineRegexp)) {
                const prunedText = pruneM3U(responseText);
                hit(source);
                return new Response(prunedText, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                });
            }
            return clonedResponse;
        }
        return Reflect.apply(target, thisArg, args);
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };
    window.fetch = new Proxy(window.fetch, fetchHandler);
}

m3uPrune.names = [
    'm3u-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'm3u-prune.js',
    'ubo-m3u-prune.js',
    'ubo-m3u-prune',
];

m3uPrune.injections = [
    hit,
    toRegExp,
    logMessage,
    getXhrData,
    objectToString,
    matchRequestProps,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
];
