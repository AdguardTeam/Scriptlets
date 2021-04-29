import {
    hit,
    getFetchData,
    objectToString,
    convertMatchPropsToObj,
    noopPromiseResolve,
    // following helpers should be imported and injected
    // because they are used by heplers above
    toRegExp,
    getRequestData,
    getObjectEntries,
    getObjectFromEntries,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-fetch
 *
 * @description
 * Prevents `fetch` calls if **all** given parameters match
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-fetch-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-fetch'[, propsToMatch])
 * ```
 *
 * - `propsToMatch` - optional, string of space-separated properties to match; possible props:
 *   - string or regular expression for matching the URL passed to fetch call; empty string or wildcard `*` for all fetch calls match
 *   - colon-separated pairs `name:value` where
 *     - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
 *     - `value` is string or regular expression for matching the value of the option passed to fetch call
 *
 * > Usage with no arguments will log fetch calls to browser console;
 * which is usefull for debugging but permitted for production filter lists.
 *
 * **Examples**
 * 1. Prevent all fetch calls
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '*')
 *     ```
 *
 * 2. Prevent fetch call for specific url
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '/url\\.part/')
 *     ```
 *
 * 3. Prevent fetch call for specific request method
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', 'method:HEAD')
 *     ```
 *
 * 4. Prevent fetch call for specific url and request method
 *     ```
 *     example.org#%#//scriptlet('prevent-fetch', '/specified_url_part/ method:/HEAD|GET/')
 *     ```
 */
/* eslint-enable max-len */
export function preventFetch(source, propsToMatch) {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined') {
        return;
    }

    const handlerWrapper = (target, thisArg, args) => {
        let shouldPrevent = false;
        const fetchData = getFetchData(args);
        if (typeof propsToMatch === 'undefined') {
            // log if no propsToMatch given
            const logMessage = `log: fetch( ${objectToString(fetchData)} )`;
            hit(source, logMessage);
        } else if (propsToMatch === '' || propsToMatch === '*') {
            // prevent all fetch calls
            shouldPrevent = true;
        } else {
            const matchData = convertMatchPropsToObj(propsToMatch);
            // prevent only if all props match
            shouldPrevent = Object.keys(matchData)
                .every((matchKey) => {
                    const matchValue = matchData[matchKey];
                    return Object.prototype.hasOwnProperty.call(fetchData, matchKey)
                        && matchValue.test(fetchData[matchKey]);
                });
        }

        if (shouldPrevent) {
            hit(source);
            return noopPromiseResolve();
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
    convertMatchPropsToObj,
    noopPromiseResolve,
    toRegExp,
    getRequestData,
    getObjectEntries,
    getObjectFromEntries,
];
