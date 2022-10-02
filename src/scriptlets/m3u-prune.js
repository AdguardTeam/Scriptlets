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
 * example.org#%#//scriptlet('m3u-prune'[, propsToRemove[, urlToMatch[, optionalRegExp]]])
 * ```
 *
 * - `propsToRemove` - required, selector of elements which will be removed from M3U file
 * - `urlToMatch` - optional, string or regular expression for matching the request's URL
 * - `optionalRegExp` - optional, string or regular expression for matching a content which will be removed from response
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
 * 2. Removes everything from response what is matched by RegExp, only if request's URL contains `.m3u8`
 *     ```
 *     example.org#%#//scriptlet('m3u-prune', 'VMAP-AD', '.m3u8', '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/')
 *     ```
 */
/* eslint-disable max-len */

export function m3uPrune(source, propsToRemove, urlToMatch, optionalRegExp) {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    if (typeof propsToRemove === 'undefined') {
        return;
    }

    urlToMatch = toRegExp(urlToMatch);

    if (optionalRegExp) {
        optionalRegExp = toRegExp(optionalRegExp);
    }

    const regexpPrune = (text) => {
        // Adding 'g' flag to replace all occurrences
        optionalRegExp = new RegExp(optionalRegExp, 'g');
        text = text.replace(optionalRegExp, '');
        return text;
    };

    const reM3u = toRegExp(propsToRemove);
    const pruneSpliceoutBlock = (lines, i) => {
        if (startsWith(lines[i], '#EXT-X-CUE:TYPE="SpliceOut"') === false) {
            return false;
        }
        lines[i] = undefined; i += 1;
        if (startsWith(lines[i], '#EXT-X-ASSET:CAID')) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], '#EXT-X-SCTE35:')) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], '#EXT-X-CUE-IN')) {
            lines[i] = undefined;
            i += 1;
        }
        if (startsWith(lines[i], '#EXT-X-SCTE35:')) {
            lines[i] = undefined;
            i += 1;
        }
        return true;
    };

    const pruneInfBlock = (lines, i) => {
        if (startsWith(lines[i], '#EXTINF') === false) {
            return false;
        }
        if (reM3u.test(lines[i + 1]) === false) {
            return false;
        }
        lines[i] = undefined;
        lines[i + 1] = undefined;
        i += 2;
        if (startsWith(lines[i], '#EXT-X-DISCONTINUITY')) {
            lines[i] = undefined;
            i += 1;
        }
        return true;
    };

    const prunerM3U = (text) => {
        if ((/^\s*(#EXTM3U|#EXT-X-VMAP-AD-BREAK:)/.test(text)) === false) {
            return text;
        }
        if ((/^\s*#EXT-X-VMAP-AD-BREAK:/.test(text))) {
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
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }
        if (urlToMatch.test(xhrURL)) {
            thisArg.addEventListener('readystatechange', () => {
                if (thisArg.readyState === 4) {
                    let { response } = thisArg;
                    if (reM3u.test(response)) {
                        if (optionalRegExp) {
                            response = regexpPrune(response);
                        } else {
                            response = prunerM3U(response);
                        }
                    }
                    Object.defineProperty(thisArg, 'response', {
                        value: response,
                    });
                    Object.defineProperty(thisArg, 'responseText', {
                        value: response,
                    });
                    hit(source);
                }
            });
        }
        hit(source);
        return Reflect.apply(target, thisArg, args);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };
    window.XMLHttpRequest.prototype.open = new Proxy(window.XMLHttpRequest.prototype.open, xhrHandler);

    // eslint-disable-next-line compat/compat
    const realFetch = window.fetch;

    const fetchWrapper = (target, thisArg, args) => {
        const fetchURL = args[0];
        if (typeof fetchURL !== 'string' || fetchURL.length === 0) {
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }
        if (urlToMatch.test(fetchURL)) {
            hit(source);
            return realFetch.apply(this, args).then((response) => {
                return response.text().then((text) => {
                    if (reM3u.test(text)) {
                        if (optionalRegExp) {
                            text = regexpPrune(text);
                        } else {
                            text = prunerM3U(text);
                        }
                    }
                    return new Response(text, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                    });
                });
            });
        }
        hit(source);
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
];

m3uPrune.injections = [
    hit,
    toRegExp,
    startsWith,
];
