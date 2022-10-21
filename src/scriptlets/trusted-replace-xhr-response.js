import {
    hit,
    objectToString,
    getWildcardSymbol,
    matchRequestProps,
    getXhrData,
    // following helpers should be imported and injected
    // because they are used by helpers above
    getMatchPropsData,
    validateParsedData,
    parseMatchProps,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getObjectEntries,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet trusted-replace-xhr-response
 *
 * @description
 * Replaces response content of `xhr` requests if **all** given parameters match.
 *
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch]])
 * ```
 *
 * - pattern - optional, argument for matching contents of responseText that should be replaced. If set, `replacement` is required;
 * possible values:
 *   - string
 *   - regular expression
 *   - '*' to match all text content
 * - replacement — optional, should be set if `pattern` is set. String to replace matched content with. Empty string to remove content.
 * - propsToMatch — optional, string of space-separated properties to match for extra condition; possible props:
 *   - string or regular expression for matching the URL passed to `.open()` call;
 *   - colon-separated pairs name:value where
 *     - name - name is string or regular expression for matching XMLHttpRequest property name
 *     - value is string or regular expression for matching the value of the option passed to `.open()` call
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * which is useful for debugging but not allowed permitted for production filter lists.
 *
 * **Examples**
 * 1. Log all XMLHttpRequests
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response')
 *     ```
 *
 * 2. Replace text content of XMLHttpRequests with specific url
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
 *     ```
 *
 * 3. Remove all text content of XMLHttpRequests with specific request method
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
 *     ```
 *
 * 4. Replace text content of XMLHttpRequests matching by URL regex and request methods
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
 *     ```
 * 5. Remove all text content of  all XMLHttpRequests for example.com
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
 *     ```
 */
/* eslint-enable max-len */
export function trustedReplaceXhrResponse(source, pattern = '', replacement = '', propsToMatch = '') {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    if (typeof pattern === 'undefined' || typeof replacement === 'undefined') {
        return;
    }

    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    const MATCH_ALL_CHARACTERS_REGEX = /[\s\S]/;

    let shouldReplace = false;
    let xhrData;
    let requestHeaders = [];

    const openWrapper = (target, thisArg, args) => {
        xhrData = getXhrData(...args);

        if (pattern === '' && replacement === '') {
            // Log if no propsToMatch given
            const logMessage = `log: xhr( ${objectToString(xhrData)} )`;
            log(source, logMessage);
        } else {
            shouldReplace = matchRequestProps(propsToMatch, xhrData);
        }

        // Trap setRequestHeader  of target xhr object to mimic request headers later
        if (shouldReplace) {
            const setRequestHeaderWrapper = (target, thisArg, args) => {
                requestHeaders.push(args);
                return Reflect.apply(target, thisArg, args);
            };

            const setRequestHeaderHandler = {
                apply: setRequestHeaderWrapper,
            };

            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        if (!shouldReplace) {
            return Reflect.apply(target, thisArg, args);
        }

        const secretXhr = new XMLHttpRequest();
        secretXhr.addEventListener('readystatechange', () => {
            if (secretXhr.readyState !== 4) {
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
            } = secretXhr;

            const parsedPattern = pattern === getWildcardSymbol()
                ? MATCH_ALL_CHARACTERS_REGEX
                : pattern;
            const content = response || responseText;

            const modifiedContent = content.replace(parsedPattern, replacement);

            // Manually put required values into target XHR object
            // as thisArg can't be redefined and XHR objects can't be (re)assigned or copied
            Object.defineProperties(thisArg, {
                readyState: { value: readyState },
                response: { value: modifiedContent },
                responseText: { value: modifiedContent },
                responseURL: { value: responseURL },
                responseXML: { value: responseXML },
                status: { value: status },
                statusText: { value: statusText },
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

        nativeOpen.apply(secretXhr, [xhrData.method, xhrData.url]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        requestHeaders.forEach((header) => {
            const name = header[0];
            const value = header[1];

            secretXhr.setRequestHeader(name, value);
        });
        requestHeaders = [];

        nativeSend.call(secretXhr, args);
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

trustedReplaceXhrResponse.names = [
    'trusted-replace-xhr-response',
    // trusted scriptlets support no aliases
];

trustedReplaceXhrResponse.injections = [
    hit,
    objectToString,
    getWildcardSymbol,
    matchRequestProps,
    getXhrData,
    getMatchPropsData,
    validateParsedData,
    parseMatchProps,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getObjectEntries,
];
