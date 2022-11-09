import {
    hit,
    toRegExp,
    startsWith,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet m3u-prune
 *
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
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    const urlMatchRegexp = toRegExp(urlToMatch);

    const AD_MARKER = {
        ASSET: '#EXT-X-ASSET:',
        CUE: '#EXT-X-CUE:',
        CUE_IN: '#EXT-X-CUE-IN',
        DISCONTINUITY: '#EXT-X-DISCONTINUITY',
        EXT_X_KEY: '#EXT-X-KEY:METHOD=NONE',
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

    const UPLYNK_AD_MARKER = {
        SEGMENT: '#UPLYNK-SEGMENT',
    };

    /**
    * Sets an item in array to undefined, if it contains one of the
    * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY
    * @param {Array} lines
    * @param {number} i
    * @returns {Object} { array, index }
    */
    const pruneExtinfFromVmapBlock = (lines, i) => {
        let array = lines.slice();
        let index = i;
        if (array[index].indexOf(AD_MARKER.EXTINF) > -1) {
            array[index] = undefined;
            index += 1;
            if (array[index].indexOf(AD_MARKER.DISCONTINUITY) > -1) {
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
    * @param {Array} lines
    * @returns {Array}
    */
    const pruneVmapBlock = (lines) => {
        let array = lines.slice();
        for (let i = 0; i < array.length - 1; i += 1) {
            if (array[i].indexOf(COMCAST_AD_MARKER.VMAP_AD) > -1
                || array[i].indexOf(COMCAST_AD_MARKER.VAST) > -1
                || array[i].indexOf(COMCAST_AD_MARKER.AD) > -1) {
                array[i] = undefined;
                if (array[i + 1].indexOf(AD_MARKER.EXTINF) > -1) {
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
    * @param {Array} lines
    * @param {number} i
    * @returns {Array}
    */
    const pruneSpliceoutBlock = (lines, i) => {
        if (!startsWith(lines[i], AD_MARKER.CUE)) {
            return lines;
        }
        lines[i] = undefined;
        i += 1;
        if (startsWith(lines[i], AD_MARKER.ASSET)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKER.SCTE35)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKER.CUE_IN)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKER.SCTE35)) {
            lines[i] = undefined;
        }
        return lines;
    };

    const removeM3ULineRegexp = toRegExp(propsToRemove);

    /**
    * Sets an item in array to undefined, if it contains removeM3ULineRegexp and one of the
    * AD_MARKER: AD_MARKER.EXTINF, AD_MARKER.DISCONTINUITY, AD_MARKER.EXT_X_KEY
    * @param {Array} lines
    * @param {number} i
    * @returns {Array}
    */
    const pruneInfBlock = (lines, i) => {
        if (!startsWith(lines[i], AD_MARKER.EXTINF)) {
            return lines;
        }
        if (!removeM3ULineRegexp.test(lines[i + 1])) {
            return lines;
        }
        lines[i] = undefined;
        lines[i + 1] = undefined;
        i += 2;
        if (startsWith(lines[i], AD_MARKER.DISCONTINUITY)) {
            lines[i] = undefined;
        }
        i += 1;
        if (startsWith(lines[i], AD_MARKER.EXT_X_KEY)) {
            lines[i] = undefined;
        }
        return lines;
    };

    /**
    * Sets an item in array to undefined, if it contains removeM3ULineRegexp
    * and UPLYNK_AD_MARKER.SEGMENT
    * @param {Array} lines
    * @returns {Array}
    */
    const pruneUplynkSegments = (lines) => {
        for (let i = 0; i < lines.length - 1; i += 1) {
            if (removeM3ULineRegexp.test(lines[i])) {
                lines[i] = undefined;
                i += 1;
                for (let j = i; j < lines.length; j += 1) {
                    if (lines[j].indexOf(UPLYNK_AD_MARKER.SEGMENT) < 0) {
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
    * @param {string} text
    * @returns {boolean}
    */
    const isM3U = (text) => {
        // Check if "text" starts with "#EXTM3U" or with "VMAP_AD_BREAK"
        // If so, then it might be an M3U file and should be pruned or logged
        const trimmedText = text.trim();
        if (startsWith(trimmedText, AD_MARKER.EXTM3U)
            || startsWith(trimmedText, COMCAST_AD_MARKER.VMAP_AD_BREAK)) {
            return true;
        }
        return false;
    };

    /**
    * Determines if pruning is needed
    * @param {string} text
    * @param {RegExp} regexp
    * @returns {boolean}
    */
    const isPruningNeeded = (text, regexp) => {
        return isM3U(text)
            && regexp.test(text);
    };

    /**
    * Prunes lines which contain removeM3ULineRegexp and specific AD_MARKER
    * @param {string} text
    * @returns {string}
    */
    const pruneM3U = (text) => {
        let lines = text.split(/\n\r|\n|\r/);

        if (text.indexOf(COMCAST_AD_MARKER.VMAP_AD_BREAK) > -1) {
            lines = pruneVmapBlock(lines);
            return lines.filter((l) => l !== undefined).join('\n');
        }

        if (text.indexOf(UPLYNK_AD_MARKER.SEGMENT) > -1) {
            lines = pruneUplynkSegments(lines);
            return lines.filter((l) => l !== undefined).join('\n');
        }
        for (let i = 0; i < lines.length; i += 1) {
            lines = pruneSpliceoutBlock(lines, i);
            lines = pruneInfBlock(lines, i);
        }
        return lines.filter((l) => l !== undefined).join('\n');
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
                            log(`XMLHttpRequest.open() URL: ${xhrURL}\nresponse: ${response}`);
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

    // eslint-disable-next-line compat/compat
    const nativeFetch = window.fetch;

    const fetchWrapper = (target, thisArg, args) => {
        const fetchURL = args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            return Reflect.apply(target, thisArg, args);
        }
        if (urlMatchRegexp.test(fetchURL)) {
            return nativeFetch.apply(this, args).then((response) => {
                return response.text().then((text) => {
                    // If "propsToRemove" is not defined, then response should be logged only
                    if (!propsToRemove && isM3U(text)) {
                        log(`fetch URL: ${fetchURL}\nresponse text: ${text}`);
                        return Reflect.apply(target, thisArg, args);
                    }
                    shouldPruneResponse = isPruningNeeded(text, removeM3ULineRegexp);
                    if (shouldPruneResponse) {
                        const prunedText = pruneM3U(text);
                        hit(source);
                        return new Response(prunedText, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });
                    }
                    return Reflect.apply(target, thisArg, args);
                });
            });
        }
        return Reflect.apply(target, thisArg, args);
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };
    // eslint-disable-next-line compat/compat
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
    startsWith,
];
