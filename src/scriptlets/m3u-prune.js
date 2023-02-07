import {
    hit,
    toRegExp,
    logMessage,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet m3u-prune
 * @description
 * Removes content from the specified M3U file.
 *
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('m3u-prune'[, propsToRemove[, urlToMatch]])
 * ```
 *
 * - `propsToRemove` - optional, string or regular expression to match the URL line (segment) which will be removed alongside with its tags
 * - `urlToMatch` - optional, string or regular expression for matching the request's URL
 * > Usage with no arguments will log response payload and URL to browser console;
 * which is useful for debugging but prohibited for production filter lists.
 *
 * **Examples**
 * 1. Removes a tag which contains `tvessaiprod.nbcuni.com/video/`, from all requests
 *     ```
 *     example.org#%#//scriptlet('m3u-prune', 'tvessaiprod.nbcuni.com/video/')
 *     ```
 *
 * 2. Removes a line which contains `tvessaiprod.nbcuni.com/video/`, only if request's URL contains `.m3u8`
 *     ```
 *     example.org#%#//scriptlet('m3u-prune', 'tvessaiprod.nbcuni.com/video/', '.m3u8')
 *     ```
 *
 * 3. Call with no arguments will log response payload and URL at the console
 *     ```
 *     example.org#%#//scriptlet('m3u-prune')
 *     ```
 *
 * 4. Call with only `urlToMatch` argument will log response payload and URL only for the matched URL
 *     ```
 *     example.org#%#//scriptlet('m3u-prune', '', '.m3u8')
 *     ```
 */
/* eslint-enable max-len */

export function m3uPrune(source, propsToRemove, urlToMatch) {
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
     * @returns {Object} { array, index }
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
        let lines = text.split(/\n\r|\n|\r/);

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

    const xhrWrapper = (target, thisArg, args) => {
        const xhrURL = args[1];
        if (typeof xhrURL !== 'string' || xhrURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(xhrURL)) {
            thisArg.addEventListener('readystatechange', function pruneResponse() {
                if (thisArg.readyState === 4) {
                    const { response } = thisArg;
                    thisArg.removeEventListener('readystatechange', pruneResponse);
                    // If "propsToRemove" is not defined, then response should be logged only
                    if (!propsToRemove) {
                        if (isM3U(response)) {
                            const message = `XMLHttpRequest.open() URL: ${xhrURL}\nresponse: ${response}`;
                            logMessage(source, message);
                        }
                    } else {
                        shouldPruneResponse = isPruningNeeded(response, removeM3ULineRegexp);
                    }
                    if (shouldPruneResponse) {
                        const prunedResponseContent = pruneM3U(response);
                        Object.defineProperty(thisArg, 'response', {
                            value: prunedResponseContent,
                        });
                        Object.defineProperty(thisArg, 'responseText', {
                            value: prunedResponseContent,
                        });
                        hit(source);
                    }
                }
            });
        }
        return Reflect.apply(target, thisArg, args);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };
    // eslint-disable-next-line max-len
    window.XMLHttpRequest.prototype.open = new Proxy(window.XMLHttpRequest.prototype.open, xhrHandler);

    const nativeFetch = window.fetch;

    const fetchWrapper = async (target, thisArg, args) => {
        const fetchURL = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            const response = await nativeFetch(...args);
            const responseText = await response.text();
            // If "propsToRemove" is not defined, then response should be logged only
            if (!propsToRemove && isM3U(responseText)) {
                const message = `fetch URL: ${fetchURL}\nresponse text: ${responseText}`;
                logMessage(source, message);
                return Reflect.apply(target, thisArg, args);
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
            return Reflect.apply(target, thisArg, args);
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
];
