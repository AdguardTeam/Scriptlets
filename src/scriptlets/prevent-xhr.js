import {
    hit,
    objectToString,
    getWildcardSymbol,
    convertMatchPropsToObj,
    // following helpers should be imported and injected
    // because they are used by heplers above
    toRegExp,
    isEmptyObject,
    getObjectEntries,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-xhr
 *
 * @description
 * Prevents `xhr` calls if **all** given parameters match.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-xhr-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-xhr'[, propsToMatch])
 * ```
 *
 * - propsToMatch - optional, string of space-separated properties to match; possible props:
 *   - string or regular expression for matching the URL passed to `.open()` call; empty string or wildcard * for all `.open()` calls match
 *   - colon-separated pairs name:value where
 *     - name is XMLHttpRequest object property name
 *     - value is string or regular expression for matching the value of the option passed to `.open()` call
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * which is usefull for debugging but permitted for production filter lists.
 *
 * **Examples**
 * 1. Log all XMLHttpRequests
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr')
 *     ```
 *
 * 2. Prevent all XMLHttpRequests
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr', '*')
 *     example.org#%#//scriptlet('prevent-xhr', '')
 *     ```
 *
 * 3. Prevent XMLHttpRequests for specific url
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org')
 *     ```
 *
 * 4. Prevent XMLHttpRequests for specific request method
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr', 'method:HEAD')
 *     ```
 *
 * 5. Prevent XMLHttpRequests for specific url and specified request methods
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org method:/HEAD|GET/')
 *     ```
 */
/* eslint-enable max-len */
export function preventXHR(source, propsToMatch) {
    // do nothing if browser does not support or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    const handlerWrapper = (target, thisArg, args) => {
        let shouldPrevent = false;
        // Get method and url from .open()
        const xhrData = {
            method: args[0],
            url: args[1],
        };
        if (typeof propsToMatch === 'undefined') {
            // Log if no propsToMatch given
            const logMessage = `log: xhr( ${objectToString(xhrData)} )`;
            hit(source, logMessage);
        } else if (propsToMatch === '' || propsToMatch === getWildcardSymbol()) {
            // Prevent all fetch calls
            shouldPrevent = true;
        } else {
            const matchData = convertMatchPropsToObj(propsToMatch);
            // prevent only if all props match
            shouldPrevent = Object.keys(matchData)
                .every((matchKey) => {
                    const matchValue = matchData[matchKey];
                    return Object.prototype.hasOwnProperty.call(xhrData, matchKey)
                    && matchValue.test(xhrData[matchKey]);
                });
        }

        if (shouldPrevent) {
            hit(source);
            return undefined;
        }

        return Reflect.apply(target, thisArg, args);
    };

    const xhrHandler = {
        apply: handlerWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, xhrHandler);
}

preventXHR.names = [
    'prevent-xhr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-xhr-if.js',
    'ubo-no-xhr-if.js',
    'ubo-no-xhr-if',
];

preventXHR.injections = [
    hit,
    objectToString,
    getWildcardSymbol,
    convertMatchPropsToObj,
    toRegExp,
    isEmptyObject,
    getObjectEntries,
];
