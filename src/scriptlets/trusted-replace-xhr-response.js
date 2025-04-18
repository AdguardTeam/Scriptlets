import {
    hit,
    logMessage,
    toRegExp,
    objectToString,
    matchRequestProps,
    getXhrData,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-xhr-response
 *
 * @description
 * Replaces response content of `xhr` requests if **all** given parameters match.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch]])
 * ```
 *
 * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
 *   If set, `replacement` is required. Possible values:
 *     - `*` to match all text content
 *     - non-empty string
 *     - regular expression
 *   By default only first occurrence is replaced. To replace all occurrences use `g` flag in RegExp - `/pattern/g`.
 * - `replacement` — optional, should be set if `pattern` is set. String to replace matched content with.
 *   Empty string to remove content.
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *     - colon-separated pairs `name:value` where
 *         - `name` — string or regular expression for matching XMLHttpRequest property name
 *         - `value` — string or regular expression for matching the value of the option
 *           passed to `XMLHttpRequest.open()` call
 * - `verbose` — optional, boolean, if set to 'true' will log original and modified text content of XMLHttpRequests.
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Log all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response')
 *     ```
 *
 * 1. Replace text content of XMLHttpRequests with specific url
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of XMLHttpRequests with specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
 *     ```
 *
 * 1. Replace text content of XMLHttpRequests matching by URL regex and request methods
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
 *     ```
 *
 *    <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of all XMLHttpRequests for example.com
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
 *     ```
 *
 * 1. Replace "foo" text content with "bar" of all XMLHttpRequests for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'foo', 'bar', 'example.com', 'true')
 *     ```
 *
 * 1. Replace all "noAds=false" text content with "noAds=true" of all XMLHttpRequests for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/noAds=false/g', 'noAds=true', 'example.com', 'true')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedReplaceXhrResponse(source, pattern = '', replacement = '', propsToMatch = '', verbose = false) {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    // Only allow pattern as empty string for logging purposes
    if (pattern === '' && replacement !== '') {
        const message = 'Pattern argument should not be empty string.';
        logMessage(source, message);
        return;
    }

    const shouldLog = pattern === '' && replacement === '';
    const shouldLogContent = verbose === 'true';

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    let xhrData;

    const openWrapper = (target, thisArg, args) => {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);

        if (shouldLog) {
            // Log if no propsToMatch given
            const message = `xhr( ${objectToString(xhrData)} )`;
            logMessage(source, message, true);
            hit(source);
            return Reflect.apply(target, thisArg, args);
        }

        if (matchRequestProps(source, propsToMatch, xhrData)) {
            thisArg.shouldBePrevented = true;
            thisArg.headersReceived = !!thisArg.headersReceived;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.shouldBePrevented && !thisArg.headersReceived) {
            thisArg.headersReceived = true;
            thisArg.collectedHeaders = [];
            const setRequestHeaderWrapper = (target, thisArg, args) => {
                // Collect headers
                thisArg.collectedHeaders.push(args);
                return Reflect.apply(target, thisArg, args);
            };

            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };

            // setRequestHeader can only be called on open xhr object,
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        if (!thisArg.shouldBePrevented) {
            return Reflect.apply(target, thisArg, args);
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
                response,
                responseText,
                responseURL,
                responseXML,
                status,
                statusText,
            } = forgedRequest;

            // Extract content from response
            const content = responseText || response;
            if (typeof content !== 'string') {
                return;
            }

            const patternRegexp = pattern === '*'
                ? /(\n|.)*/
                : toRegExp(pattern);

            if (shouldLogContent) {
                logMessage(source, `Original text content: ${content}`);
            }
            const modifiedContent = content.replace(patternRegexp, replacement);
            if (shouldLogContent) {
                logMessage(source, `Modified text content: ${modifiedContent}`);
            }

            // Manually put required values into target XHR object
            // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
            Object.defineProperties(thisArg, {
                // original values
                readyState: { value: readyState, writable: false },
                responseURL: { value: responseURL, writable: false },
                responseXML: { value: responseXML, writable: false },
                status: { value: status, writable: false },
                statusText: { value: statusText, writable: false },
                // modified values
                response: { value: modifiedContent, writable: false },
                responseText: { value: modifiedContent, writable: false },
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

        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach((header) => {
            const name = header[0];
            const value = header[1];

            forgedRequest.setRequestHeader(name, value);
        });
        thisArg.collectedHeaders = [];

        try {
            nativeSend.call(forgedRequest, args);
        } catch {
            return Reflect.apply(target, thisArg, args);
        }
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

export const trustedReplaceXhrResponseNames = [
    'trusted-replace-xhr-response',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceXhrResponse.primaryName = trustedReplaceXhrResponseNames[0];

trustedReplaceXhrResponse.injections = [
    hit,
    logMessage,
    toRegExp,
    objectToString,
    matchRequestProps,
    getXhrData,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
];
