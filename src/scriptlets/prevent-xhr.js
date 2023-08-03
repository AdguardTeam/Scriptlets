import {
    hit,
    objectToString,
    generateRandomResponse,
    matchRequestProps,
    getXhrData,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getRequestProps,
    getRandomIntInclusive,
    getRandomStrByLength,
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
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-xhr'[, propsToMatch[, randomize]])
 * ```
 *
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *       empty string or wildcard `*` for all `XMLHttpRequest.open()` calls match
 *         - colon-separated pairs `name:value` where
 *             - `name` is XMLHttpRequest object property name
 *             - `value` is string or regular expression for matching the value of the option
 *     passed to `XMLHttpRequest.open()` call
 * - `randomize` — defaults to `false` for empty responseText,
 *   optional argument to randomize responseText of matched XMLHttpRequest's response; possible values:
 *     - `true` to randomize responseText, random alphanumeric string of 10 symbols
 *     - colon-separated pair `name:value` string value to customize responseText data where
 *         - `name` — only `length` supported for now
 *         - `value` — range on numbers, for example `100-300`, limited to 500000 characters
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Log all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr')
 *     ```
 *
 * 1. Prevent all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', '*')
 *     example.org#%#//scriptlet('prevent-xhr', '')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'method:HEAD')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and specified request methods
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org method:/HEAD|GET/')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and randomize it's response text
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org', 'true')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and randomize it's response text with range
 *
 *     ```adblock
 *    example.org#%#//scriptlet('prevent-xhr', 'example.org', 'length:100-300')
 *     ```
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function preventXHR(source, propsToMatch, customResponseText) {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;
    const nativeGetResponseHeader = window.XMLHttpRequest.prototype.getResponseHeader;
    const nativeGetAllResponseHeaders = window.XMLHttpRequest.prototype.getAllResponseHeaders;

    let xhrData;
    let modifiedResponse = '';
    let modifiedResponseText = '';

    const openWrapper = (target, thisArg, args) => {
        // Get original request properties
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);

        if (typeof propsToMatch === 'undefined') {
            // Log if no propsToMatch given
            logMessage(source, `xhr( ${objectToString(xhrData)} )`, true);
            hit(source);
        } else if (matchRequestProps(source, propsToMatch, xhrData)) {
            thisArg.shouldBePrevented = true;
            // Add xhrData to thisArg to keep original values in case of multiple requests
            // https://github.com/AdguardTeam/Scriptlets/issues/347
            thisArg.xhrData = xhrData;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later;
        // needed for getResponseHeader() and getAllResponseHeaders() methods
        if (thisArg.shouldBePrevented) {
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = (target, thisArg, args) => {
                // Collect headers
                thisArg.collectedHeaders.push(args);
                return Reflect.apply(target, thisArg, args);
            };
            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };
            // setRequestHeader() can only be called on xhr.open(),
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }
        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        if (!thisArg.shouldBePrevented) {
            return Reflect.apply(target, thisArg, args);
        }

        if (thisArg.responseType === 'blob') {
            modifiedResponse = new Blob();
        }
        if (thisArg.responseType === 'arraybuffer') {
            modifiedResponse = new ArrayBuffer();
        }

        if (customResponseText) {
            const randomText = generateRandomResponse(customResponseText);
            if (randomText) {
                modifiedResponseText = randomText;
            } else {
                logMessage(source, `Invalid randomize parameter: '${customResponseText}'`);
            }
        }

        /**
         * Create separate XHR request with original request's input
         * to be able to collect response data without triggering
         * listeners on original XHR object
         */
        const forgedRequest = new XMLHttpRequest();
        forgedRequest.addEventListener('readystatechange', () => {
            if (forgedRequest.readyState !== 4) {
                return;
            }

            const {
                readyState,
                responseURL,
                responseXML,
                statusText,
            } = forgedRequest;

            // Mock response object
            Object.defineProperties(thisArg, {
                // original values
                readyState: { value: readyState, writable: false },
                statusText: { value: statusText, writable: false },
                // If the request is blocked, responseURL is an empty string
                responseURL: { value: responseURL || thisArg.xhrData.url, writable: false },
                responseXML: { value: responseXML, writable: false },
                // modified values
                status: { value: 200, writable: false },
                response: { value: modifiedResponse, writable: false },
                responseText: { value: modifiedResponseText, writable: false },
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
        });

        nativeOpen.apply(forgedRequest, [thisArg.xhrData.method, thisArg.xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach((header) => {
            const name = header[0];
            const value = header[1];
            forgedRequest.setRequestHeader(name, value);
        });

        try {
            nativeSend.call(forgedRequest, args);
        } catch {
            return Reflect.apply(target, thisArg, args);
        }

        return undefined;
    };

    /**
     * Mock XMLHttpRequest.prototype.getHeaderHandler() to avoid adblocker detection.
     *
     * @param {Function} target XMLHttpRequest.prototype.getHeaderHandler().
     * @param {XMLHttpRequest} thisArg The request.
     * @param {string[]} args Header name is passed as first argument.
     *
     * @returns {string|null} Header value or null if header is not set.
     */
    const getHeaderWrapper = (target, thisArg, args) => {
        if (!thisArg.shouldBePrevented) {
            return nativeGetResponseHeader.apply(thisArg, args);
        }
        if (!thisArg.collectedHeaders.length) {
            return null;
        }
        // The search for the header name is case-insensitive
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getResponseHeader
        const searchHeaderName = args[0].toLowerCase();
        const matchedHeader = thisArg.collectedHeaders.find((header) => {
            const headerName = header[0].toLowerCase();
            return headerName === searchHeaderName;
        });
        return matchedHeader
            ? matchedHeader[1]
            : null;
    };

    /**
     * Mock XMLHttpRequest.prototype.getAllResponseHeaders() to avoid adblocker detection.
     *
     * @param {Function} target XMLHttpRequest.prototype.getAllResponseHeaders().
     * @param {XMLHttpRequest} thisArg The request.
     *
     * @returns {string} All headers as a string. For no headers an empty string is returned.
     */
    const getAllHeadersWrapper = (target, thisArg) => {
        if (!thisArg.shouldBePrevented) {
            return nativeGetAllResponseHeaders.call(thisArg);
        }
        if (!thisArg.collectedHeaders.length) {
            return '';
        }
        const allHeadersStr = thisArg.collectedHeaders
            .map((header) => {
                /**
                 * TODO: array destructuring may be used here
                 * after the typescript implementation and bundling refactoring
                 * as now there is an error: slicedToArray is not defined
                 */
                const headerName = header[0];
                const headerValue = header[1];
                // In modern browsers, the header names are returned in all lower case, as per the latest spec.
                // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/getAllResponseHeaders
                return `${headerName.toLowerCase()}: ${headerValue}`;
            })
            .join('\r\n');
        return allHeadersStr;
    };

    const openHandler = {
        apply: openWrapper,
    };
    const sendHandler = {
        apply: sendWrapper,
    };
    const getHeaderHandler = {
        apply: getHeaderWrapper,
    };
    const getAllHeadersHandler = {
        apply: getAllHeadersWrapper,
    };

    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, openHandler);
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, sendHandler);
    XMLHttpRequest.prototype.getResponseHeader = new Proxy(
        XMLHttpRequest.prototype.getResponseHeader,
        getHeaderHandler,
    );
    XMLHttpRequest.prototype.getAllResponseHeaders = new Proxy(
        XMLHttpRequest.prototype.getAllResponseHeaders,
        getAllHeadersHandler,
    );
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
    generateRandomResponse,
    matchRequestProps,
    getXhrData,
    logMessage,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getRequestProps,
    getRandomIntInclusive,
    getRandomStrByLength,
];
