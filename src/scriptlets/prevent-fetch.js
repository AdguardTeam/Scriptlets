import {
    hit,
    getFetchData,
    objectToString,
    matchRequestProps,
    logMessage,
    noopPromiseResolve,
    modifyResponse,
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
 * @scriptlet prevent-fetch
 *
 * @description
 * Prevents `fetch` calls if **all** given parameters match.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-fetch-ifjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-fetch'[, propsToMatch[, responseBody[, responseType]]])
 * ```
 *
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to fetch call;
 *       empty string, wildcard `*` or invalid regular expression will match all fetch calls
 *     - colon-separated pairs `name:value` where
 *         <!-- markdownlint-disable-next-line line-length -->
 *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
 *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
 *           invalid regular expression will cause any value matching
 * - `responseBody` — optional, string for defining response body value,
 *   defaults to `emptyObj`. Possible values:
 *     - `emptyObj` — empty object
 *     - `emptyArr` — empty array
 *     - `emptyStr` — empty string
 * - `responseType` — optional, string for defining response type,
 *   original response type is used if not specified. Possible values:
 *     - `default`
 *     - `opaque`
 *
 * > Usage with no arguments will log fetch calls to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Log all fetch calls
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch')
 *     ```
 *
 * 1. Prevent all fetch calls
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch', '*')
 *     ! or
 *     example.org#%#//scriptlet('prevent-fetch', '')
 *     ```
 *
 * 1. Prevent fetch call for specific url
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch', '/url\\.part/')
 *     ```
 *
 * 1. Prevent fetch call for specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch', 'method:HEAD')
 *     ```
 *
 * 1. Prevent fetch call for specific url and request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/')
 *     ```
 *
 * 1. Prevent fetch call and specify response body value
 *
 *     ```adblock
 *     ! Specify response body for fetch call to a specific url
 *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/', 'emptyArr')
 *
 *     ! Specify response body for all fetch calls
 *     example.org#%#//scriptlet('prevent-fetch', '', 'emptyArr')
 *     ```
 *
 * 1. Prevent all fetch calls and specify response type value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-fetch', '*', '', 'opaque')
 *     ```
 *
 * @added v1.3.18.
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

    const nativeRequestClone = Request.prototype.clone;

    let strResponseBody;
    if (responseBody === '' || responseBody === 'emptyObj') {
        strResponseBody = '{}';
    } else if (responseBody === 'emptyArr') {
        strResponseBody = '[]';
    } else if (responseBody === 'emptyStr') {
        strResponseBody = '';
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
        const fetchData = getFetchData(args, nativeRequestClone);
        if (typeof propsToMatch === 'undefined') {
            logMessage(source, `fetch( ${objectToString(fetchData)} )`, true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }

        shouldPrevent = matchRequestProps(source, propsToMatch, fetchData);

        if (shouldPrevent) {
            hit(source);
            try {
                const origResponse = await Reflect.apply(target, thisArg, args);
                // In the case of apps, the blocked request has status 500
                // and no error is thrown, so it's necessary to check response.ok
                // https://github.com/AdguardTeam/Scriptlets/issues/334
                if (!origResponse.ok) {
                    return noopPromiseResolve(strResponseBody, fetchData.url, responseType);
                }
                return modifyResponse(
                    origResponse,
                    {
                        body: strResponseBody,
                        type: responseType,
                    },
                );
            } catch (ex) {
                // https://github.com/AdguardTeam/Scriptlets/issues/334
                return noopPromiseResolve(strResponseBody, fetchData.url, responseType);
            }
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
    noopPromiseResolve,
    modifyResponse,
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
