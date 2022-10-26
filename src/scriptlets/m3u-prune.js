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
 * - `propsToRemove` - optional, string or regular expression to match the directives content of M3U file which will be removed
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

    let shouldPruneResponse = true;
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    if (!propsToRemove) {
        // If "propsToRemove" is not defined, then response shouldn't be pruned
        // but it should be logged in browser console
        shouldPruneResponse = false;
    }

    const urlMatchRegexp = toRegExp(urlToMatch);

    const AD_MARKER = {
        AD: '-AD-',
        ASSET: '#EXT-X-ASSET:CAID',
        CUE: '#EXT-X-CUE:TYPE="SpliceOut"',
        CUE_IN: '#EXT-X-CUE-IN',
        DISCONTINUITY: '#EXT-X-DISCONTINUITY',
        EXTINF: '#EXTINF',
        EXTM3U: '#EXTM3U',
        SCTE35: '#EXT-X-SCTE35:',
        VAST: '-VAST-',
        VMAP_AD: '-VMAP-AD-',
        VMAP_AD_BREAK: '#EXT-X-VMAP-AD-BREAK:',
    };

    const pruneExtinfFromVmapBlock = (lines, i) => {
        let array = lines.slice();
        let index = i;
        if (array[index].indexOf(AD_MARKER.EXTINF) > -1) {
            array[index] = undefined;
            index += 1;
            if (array[index].indexOf(AD_MARKER.DISCONTINUITY) > -1) {
                array[index] = undefined;
                index += 1;
                const pruneExtinf = pruneExtinfFromVmapBlock(array, index);
                array = pruneExtinf.array;
                index = pruneExtinf.index;
            }
        }
        return { array, index };
    };
    const pruneVmapBlock = (lines) => {
        let array = lines.slice();
        for (let i = 0; i < array.length - 1; i += 1) {
            // eslint-disable-next-line max-len
            if (array[i].indexOf(AD_MARKER.VMAP_AD) > -1 || array[i].indexOf(AD_MARKER.VAST) > -1 || array[i].indexOf(AD_MARKER.AD) > -1) {
                array[i] = undefined;
                if (array[i + 1].indexOf(AD_MARKER.EXTINF) > -1) {
                    i += 1;
                    const pruneExtinf = pruneExtinfFromVmapBlock(array, i);
                    array = pruneExtinf.array;
                    // It's necessary to subtract 1 from "i",
                    // otherwise one line will be skipped
                    i = pruneExtinf.index - 1;
                }
            }
        }
        return array;
    };

    const pruneSpliceoutBlock = (lines, i) => {
        const array = lines.slice();
        if (!startsWith(array[i], AD_MARKER.CUE)) {
            return array;
        }
        array[i] = undefined;
        i += 1;
        if (startsWith(array[i], AD_MARKER.ASSET)) {
            array[i] = undefined;
            i += 1;
        }
        if (startsWith(array[i], AD_MARKER.SCTE35)) {
            array[i] = undefined;
            i += 1;
        }
        if (startsWith(array[i], AD_MARKER.CUE_IN)) {
            array[i] = undefined;
            i += 1;
        }
        if (startsWith(array[i], AD_MARKER.SCTE35)) {
            array[i] = undefined;
        }
        return array;
    };

    const removeM3ULineRegexp = toRegExp(propsToRemove);

    const pruneInfBlock = (lines, i) => {
        const array = lines.slice();
        if (!startsWith(array[i], AD_MARKER.EXTINF)) {
            return array;
        }
        if (!removeM3ULineRegexp.test(array[i + 1])) {
            return array;
        }
        array[i] = undefined;
        array[i + 1] = undefined;
        i += 2;
        if (startsWith(array[i], AD_MARKER.DISCONTINUITY)) {
            array[i] = undefined;
        }
        return array;
    };

    const isM3U = (text) => {
        // Check if "text" starts with "#EXTM3U" or with "VMAP_AD_BREAK"
        // If so, then it might be an M3U file and should be pruned or logged
        const trimmedText = text.trim();
        // eslint-disable-next-line max-len
        if (startsWith(trimmedText, AD_MARKER.EXTM3U) || startsWith(trimmedText, AD_MARKER.VMAP_AD_BREAK)) {
            return true;
        }
        return false;
    };

    const pruneM3U = (text) => {
        if (!isM3U(text)) {
            shouldPruneResponse = false;
            return text;
        }
        if (text.indexOf(propsToRemove) === -1) {
            shouldPruneResponse = false;
            return text;
        }

        let lines = text.split(/\n\r|\n|\r/);

        if (text.indexOf(AD_MARKER.VMAP_AD_BREAK) > -1) {
            lines = pruneVmapBlock(lines);
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
                    if (!shouldPruneResponse) {
                        if (isM3U(response)) {
                            log(`XMLHttpRequest.open() URL: ${xhrURL}\nresponse: ${response}`);
                        }
                    } else {
                        // In case if response shouldn't be pruned
                        // pruneM3U sets shouldPruneResponse to false
                        const prunedResponseContent = pruneM3U(response);
                        if (shouldPruneResponse) {
                            Object.defineProperty(thisArg, 'response', {
                                value: prunedResponseContent,
                            });
                            Object.defineProperty(thisArg, 'responseText', {
                                value: prunedResponseContent,
                            });
                            hit(source);
                        }
                        // In case if response shouldn't be pruned
                        // pruneM3U sets shouldPruneResponse to false
                        // so it's necessary to set it to true again
                        // otherwise response will be only logged
                        shouldPruneResponse = true;
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
                    if (!shouldPruneResponse) {
                        if (isM3U(text)) {
                            log(`fetch URL: ${fetchURL}\nresponse text: ${text}`);
                        }
                        return Reflect.apply(target, thisArg, args);
                    }
                    const prunedText = pruneM3U(text);
                    if (shouldPruneResponse) {
                        hit(source);
                        return new Response(prunedText, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });
                    }
                    // In case if response shouldn't be pruned
                    // pruneM3U sets shouldPruneResponse to false
                    // so it's necessary to set it to true again
                    // otherwise response will be only logged
                    shouldPruneResponse = true;
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
