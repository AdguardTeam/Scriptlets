import {
    hit,
    objectToString,
    getWildcardSymbol,
    getRandomIntInclusive,
    getRandomStrByLength,
    generateRandomResponse,
    matchRequestProps,
    // following helpers should be imported and injected
    // because they are used by helpers above
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getObjectEntries,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
} from '../helpers/index';

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
 * example.org#%#//scriptlet('prevent-xhr'[, propsToMatch[, randomize]])
 * ```
 *
 * - propsToMatch - optional, string of space-separated properties to match; possible props:
 *   - string or regular expression for matching the URL passed to `.open()` call; empty string or wildcard * for all `.open()` calls match
 *   - colon-separated pairs name:value where
 *     - name is XMLHttpRequest object property name
 *     - value is string or regular expression for matching the value of the option passed to `.open()` call
 * - randomize - defaults to `false` for empty responseText, optional argument to randomize responseText of matched XMLHttpRequest's response; possible values:
 *   - boolean 'true' to randomize responseText, random alphanumeric string of 10 symbols
 *   - string value to customize responseText data, colon-separated pairs name:value where
 *       - name — only `length` supported for now
 *       - value — range on numbers, for example `100-300`, limited to 500000 characters
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * which is useful for debugging but not allowed for production filter lists.
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
 *
 * 6. Prevent XMLHttpRequests for specific url and randomize it's response text
 *     ```
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org', 'true')
 *     ```
 *
 * 7. Prevent XMLHttpRequests for specific url and randomize it's response text with range
 *     ```
 *    example.org#%#//scriptlet('prevent-xhr', 'example.org', 'length:100-300')
 *     ```
 */
/* eslint-enable max-len */
export function preventXHR(source, propsToMatch, customResponseText) {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    let shouldPrevent = false;
    let response = '';
    let responseText = '';
    let responseUrl;
    const openWrapper = (target, thisArg, args) => {
        // Get method and url from .open()
        const xhrData = {
            method: args[0],
            url: args[1],
        };
        responseUrl = xhrData.url;
        if (typeof propsToMatch === 'undefined') {
            // Log if no propsToMatch given
            log(`log: xhr( ${objectToString(xhrData)} )`);
            hit(source);
        } else {
            shouldPrevent = matchRequestProps(propsToMatch);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        if (!shouldPrevent) {
            return Reflect.apply(target, thisArg, args);
        }

        if (thisArg.responseType === 'blob') {
            response = new Blob();
        }

        if (thisArg.responseType === 'arraybuffer') {
            response = new ArrayBuffer();
        }

        if (customResponseText) {
            const randomText = generateRandomResponse(customResponseText);
            if (randomText) {
                responseText = randomText;
            } else {
                log(`Invalid range: ${customResponseText}`);
            }
        }
        // Mock response object
        Object.defineProperties(thisArg, {
            readyState: { value: 4, writable: false },
            response: { value: response, writable: false },
            responseText: { value: responseText, writable: false },
            responseURL: { value: responseUrl, writable: false },
            responseXML: { value: '', writable: false },
            status: { value: 200, writable: false },
            statusText: { value: 'OK', writable: false },
        });
        // Mock events
        setTimeout(() => {
            const stateEvent = new Event('readystatechange');
            thisArg.dispatchEvent(stateEvent);

            const loadEvent = new Event('load');
            thisArg.dispatchEvent(loadEvent);

            const loadEndEvent = new Event('loadend');
            thisArg.dispatchEvent(loadEndEvent);
        }, 1);

        hit(source);
        return undefined;
    };

    const openHandler = {
        apply: openWrapper,
    };

    const sendHandler = {
        apply: sendWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
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
    matchRequestProps,
    getRandomIntInclusive,
    getRandomStrByLength,
    generateRandomResponse,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getObjectEntries,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
];
