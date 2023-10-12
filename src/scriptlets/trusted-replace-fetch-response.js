import {
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    // following helpers should be imported and injected
    // because they are used by helpers above
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-fetch-response
 *
 * @description
 * Replaces response text content of `fetch` requests if **all** given parameters match.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-fetch-response'[, pattern, replacement[, propsToMatch]])
 * ```
 *
 * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
 * If set, `replacement` is required. Possible values:
 *     - `*` to match all text content
 *     - non-empty string
 *     - regular expression
 * - `replacement` — optional, should be set if `pattern` is set. String to replace the response text content
 *   matched by `pattern`. Empty string to remove content. Defaults to empty string.
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to fetch call;
 *       empty string, wildcard `*` or invalid regular expression will match all fetch calls
 *     - colon-separated pairs `name:value` where
 *         <!-- markdownlint-disable-next-line line-length -->
 *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
 *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
 *           invalid regular expression will cause any value matching
 *
 * > Usage with no arguments will log fetch calls to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Scriptlet does nothing if response body can't be converted to text.
 *
 * ### Examples
 *
 * 1. Log all fetch calls
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response')
 *     ```
 *
 * 1. Replace response text content of fetch requests with specific url
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of fetch responses with specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'method:GET')
 *     ```
 *
 * 1. Replace response text content of fetch requests matching by URL regex and request methods
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove text content of all fetch responses for example.com
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'example.com')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedReplaceFetchResponse(source, pattern = '', replacement = '', propsToMatch = '') {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    // Only allow pattern as empty string for logging purposes
    if (pattern === '' && replacement !== '') {
        logMessage(source, 'Pattern argument should not be empty string');
        return;
    }
    const shouldLog = pattern === '' && replacement === '';

    const nativeRequestClone = Request.prototype.clone;
    const nativeFetch = fetch;

    let shouldReplace = false;
    let fetchData;

    const handlerWrapper = (target, thisArg, args) => {
        fetchData = getFetchData(args, nativeRequestClone);

        if (shouldLog) {
            // log if no propsToMatch given
            logMessage(source, `fetch( ${objectToString(fetchData)} )`, true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }

        shouldReplace = matchRequestProps(source, propsToMatch, fetchData);

        if (!shouldReplace) {
            return Reflect.apply(target, thisArg, args);
        }

        /**
         * Create new Response object using original response' properties
         * and given text as body content
         *
         * @param {Response} response original response to copy properties from
         * @param {string} textContent text to set as body content
         * @returns {Response}
         */
        const forgeResponse = (response, textContent) => {
            const {
                bodyUsed,
                headers,
                ok,
                redirected,
                status,
                statusText,
                type,
                url,
            } = response;

            const forgedResponse = new Response(textContent, {
                status,
                statusText,
                headers,
            });

            // Manually set properties which can't be set by Response constructor
            Object.defineProperties(forgedResponse, {
                url: { value: url },
                type: { value: type },
                ok: { value: ok },
                bodyUsed: { value: bodyUsed },
                redirected: { value: redirected },
            });

            return forgedResponse;
        };

        // eslint-disable-next-line prefer-spread
        return nativeFetch.apply(null, args)
            .then((response) => {
                return response.text()
                    .then((bodyText) => {
                        const patternRegexp = pattern === '*'
                            ? /(\n|.)*/
                            : toRegExp(pattern);

                        const modifiedTextContent = bodyText.replace(patternRegexp, replacement);
                        const forgedResponse = forgeResponse(response, modifiedTextContent);

                        hit(source);
                        return forgedResponse;
                    })
                    .catch(() => {
                        // log if response body can't be converted to a string
                        const fetchDataStr = objectToString(fetchData);
                        const message = `Response body can't be converted to text: ${fetchDataStr}`;
                        logMessage(source, message);
                        return Reflect.apply(target, thisArg, args);
                    });
            })
            .catch(() => Reflect.apply(target, thisArg, args));
    };

    const fetchHandler = {
        apply: handlerWrapper,
    };

    fetch = new Proxy(fetch, fetchHandler); // eslint-disable-line no-global-assign
}

trustedReplaceFetchResponse.names = [
    'trusted-replace-fetch-response',
    // trusted scriptlets support no aliases
];

trustedReplaceFetchResponse.injections = [
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
];
