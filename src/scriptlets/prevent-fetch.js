import {
    hit,
    getFetchData,
    objectToString,
    matchRequestProps,
    logMessage,
    modifyResponse,
    // following helpers should be imported and injected
    // because they are used by helpers above
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    getObjectEntries,
    getObjectFromEntries,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-fetch
 * @description
 * Prevents `fetch` calls if **all** given parameters match.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-fetch-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-fetch'[, propsToMatch[, responseBody[, responseType]]])
 * ```
 *
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *   - string or regular expression for matching the URL passed to fetch call;
 *     empty string, wildcard `*` or invalid regular expression will match all fetch calls
 *   - colon-separated pairs `name:value` where
 *     - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
 *     - `value` is string or regular expression for matching the value of the option passed to fetch call;
 *       invalid regular expression will cause any value matching
 * - `responseBody` — optional, string for defining response body value,
 *   defaults to `emptyObj`. Possible values:
 *    - `emptyObj` — empty object
 *    - `emptyArr` — empty array
 * - `responseType` — optional, string for defining response type,
 * original response type is used if not specified. Possible values:
 *    - `default`
 *    - `opaque`
 *
 * > Usage with no arguments will log fetch calls to browser console;
 * which is useful for debugging but not permitted for production filter lists.
 *
 * **Examples**
 * 1. Log all fetch calls
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch')
 *     ```
 *
 * 2. Prevent all fetch calls
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '*')
 *     OR
 *     example.org#%#//scriptlet('prevent-fetch', '')
 *     ```
 *
 * 3. Prevent fetch call for specific url
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '/url\\.part/')
 *     ```
 *
 * 4. Prevent fetch call for specific request method
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', 'method:HEAD')
 *     ```
 *
 * 5. Prevent fetch call for specific url and request method
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/')
 *     ```
 *
 * 6. Prevent fetch call and specify response body value
 *     ```
 *     ! Specify response body for fetch call to a specific url
 *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/', 'emptyArr')
 *
 *     ! Specify response body for all fetch calls
 *     example.org#%#//scriptlet('prevent-fetch', '', 'emptyArr')
 *     ```
 *
 * 7. Prevent all fetch calls and specify response type value
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '*', '', 'opaque')
 *     ```
 */
/* eslint-enable max-len */
export function preventFetch(source, propsToMatch, responseBody = 'emptyObj', responseType) {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    let strResponseBody;
    if (responseBody === '' || responseBody === 'emptyObj') {
        strResponseBody = '{}';
    } else if (responseBody === 'emptyArr') {
        strResponseBody = '[]';
    } else {
        logMessage(source, `Invalid responseBody parameter: '${responseBody}'`);
        return;
    }

    const isResponseTypeSpecified = typeof responseType !== 'undefined';
    const isResponseTypeSupported = (responseType) => {
        const SUPPORTED_TYPES = [
            'default',
            'opaque',
        ];
        return SUPPORTED_TYPES.includes(responseType);
    };
    // Skip disallowed response types,
    // specified responseType has limited list of possible values
    if (isResponseTypeSpecified
        && !isResponseTypeSupported(responseType)) {
        logMessage(source, `Invalid responseType parameter: '${responseType}'`);
        return;
    }

    const handlerWrapper = async (target, thisArg, args) => {
        let shouldPrevent = false;
        const fetchData = getFetchData(args);
        if (typeof propsToMatch === 'undefined') {
            logMessage(source, `fetch( ${objectToString(fetchData)} )`, true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }

        shouldPrevent = matchRequestProps(source, propsToMatch, fetchData);

        if (shouldPrevent) {
            hit(source);
            const origResponse = await Reflect.apply(target, thisArg, args);
            return modifyResponse(
                origResponse,
                {
                    body: strResponseBody,
                    type: responseType,
                },
            );
        }

        return Reflect.apply(target, thisArg, args);
    };

    const fetchHandler = {
        apply: handlerWrapper,
    };

    fetch = new Proxy(fetch, fetchHandler); // eslint-disable-line no-global-assign
}

preventFetch.names = [
    'prevent-fetch',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-fetch-if.js',
    'ubo-no-fetch-if.js',
    'ubo-no-fetch-if',
];

preventFetch.injections = [
    hit,
    getFetchData,
    objectToString,
    matchRequestProps,
    logMessage,
    modifyResponse,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    getObjectEntries,
    getObjectFromEntries,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
];
