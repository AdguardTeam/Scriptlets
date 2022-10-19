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
 * - `propsToRemove` - optional, selector of elements which will be removed from M3U file
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
 * 2. Removes a tag which contains `tvessaiprod.nbcuni.com/video/`, only if request's URL contains `.m3u8`
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

    const AD_MARKERS = {
        EXTM3U: '#EXTM3U',
        CUE: '#EXT-X-CUE:TYPE="SpliceOut"',
        CUE_IN: '#EXT-X-CUE-IN',
        ASSET: '#EXT-X-ASSET:CAID',
        SCTE35: '#EXT-X-SCTE35:',
        EXTINF: '#EXTINF',
        DISCONTINUITY: '#EXT-X-DISCONTINUITY',
        VMAP_AD_BREAK: '#EXT-X-VMAP-AD-BREAK:',
    };

    const reM3u = toRegExp(propsToRemove);
    const pruneSpliceoutBlock = (lines, i) => {
        if (startsWith(lines[i], AD_MARKERS.CUE) === false) {
            return false;
        }
        lines[i] = undefined;
        i += 1;
        if (startsWith(lines[i], AD_MARKERS.ASSET)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKERS.SCTE35)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKERS.CUE_IN)) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], AD_MARKERS.SCTE35)) {
            lines[i] = undefined;
        }
        return true;
    };

    const pruneInfBlock = (lines, i) => {
        if (startsWith(lines[i], AD_MARKERS.EXTINF) === false) {
            return false;
        }
        if (reM3u.test(lines[i + 1]) === false) {
            return false;
        }
        lines[i] = undefined;
        lines[i + 1] = undefined;
        i += 2;
        if (startsWith(lines[i], AD_MARKERS.DISCONTINUITY)) {
            lines[i] = undefined;
        }
        return true;
    };

    const isM3U = (text) => {
        // Check if "text" starts with "#EXTM3U" or with "VMAP_AD_BREAK"
        // If so, then it might be an M3U file and should be pruned or logged
        const trimedText = text.trim();
        // eslint-disable-next-line max-len
        if (startsWith(trimedText, AD_MARKERS.EXTM3U) || startsWith(trimedText, AD_MARKERS.VMAP_AD_BREAK)) {
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
        if (text.indexOf(AD_MARKERS.VMAP_AD_BREAK) > -1) {
            text = '';
            return text;
        }

        const lines = text.split(/\n\r|\n|\r/);

        for (let i = 0; i < lines.length; i += 1) {
            if (lines[i] !== undefined) {
                if (!pruneSpliceoutBlock(lines, i)) {
                    pruneInfBlock(lines, i);
                }
            }
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
                        // pruneXML sets shouldPruneResponse to false
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
                    // pruneXML sets shouldPruneResponse to false
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
