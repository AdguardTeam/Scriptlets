import {
    hit,
    objectToString,
    getWildcardSymbol,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
    // following helpers should be imported and injected
    // because they are used by helpers above
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
 * example.org#%#//scriptlet('trusted-replace-xhr-response', pattern, replacement[, propsToMatch])
 * ```
 *
* - pattern - required, argument for matching contents of responseText that should be replaced.
 * Possible values:
 *   - string
 *   - regular expression
 *   - '*' to match all text content
 * - replacement - required, string to replace matched content with. Empty string to remove content.
 * - propsToMatch — optional, string of space-separated properties to match for extra condition; possible props:
 *   - string or regular expression for matching the URL passed to `.open()` call;
 *   - colon-separated pairs name:value where
 *     - name is XMLHttpRequest object property name
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
 * 5. Remove all text content of XMLHttpRequest
 *     ```
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
 *     ```
 */
/* eslint-enable max-len */
export function trustedReplaceXhrResponse(source, pattern, replacement, propsToMatch) {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    if (typeof pattern === 'undefined' || typeof replacement === 'undefined') {
        return;
    }

    const MATCH_ALL_CHARACTERS_REGEX = /[\s\S]/;

    let shouldReplace = false;
    let responseUrl;
    const openWrapper = (target, thisArg, args) => {
        // Get method and url from .open()
        const xhrData = {
            method: args[0],
            url: args[1],
        };
        responseUrl = xhrData.url;
        if (pattern === '' && replacement === '') {
            // Log if no propsToMatch given
            const logMessage = `log: xhr( ${objectToString(xhrData)} )`;
            hit(source, logMessage);
        } else {
            const parsedData = parseMatchProps(propsToMatch);
            if (!validateParsedData(parsedData)) {
                // eslint-disable-next-line no-console
                console.log(`Invalid parameter: ${propsToMatch}`);
                shouldReplace = false;
            } else {
                const matchData = getMatchPropsData(parsedData);
                // prevent only if all props match
                shouldReplace = Object.keys(matchData)
                    .every((matchKey) => {
                        const matchValue = matchData[matchKey];
                        return Object.prototype.hasOwnProperty.call(xhrData, matchKey)
                            && matchValue.test(xhrData[matchKey]);
                    });
            }
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (target, thisArg, args) => {
        if (!shouldReplace) {
            return Reflect.apply(target, thisArg, args);
        }

        const parsedPattern = pattern === getWildcardSymbol()
            ? MATCH_ALL_CHARACTERS_REGEX
            : pattern;

        const modifiedContent = thisArg.responseText.replace(parsedPattern, replacement);

        // Mock response object
        Object.defineProperties(thisArg, {
            readyState: { value: 4, writable: false },
            response: { value: modifiedContent, writable: false },
            responseText: { value: modifiedContent, writable: false },
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

trustedReplaceXhrResponse.names = [
    'trusted-replace-xhr-response',
    // trusted scriptlets support no aliases
];

trustedReplaceXhrResponse.injections = [
    hit,
    objectToString,
    getWildcardSymbol,
    parseMatchProps,
    validateParsedData,
    getMatchPropsData,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getObjectEntries,
];
