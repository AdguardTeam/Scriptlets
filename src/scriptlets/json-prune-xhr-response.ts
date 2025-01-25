import {
    hit,
    logMessage,
    toRegExp,
    jsonPruner,
    getPrunePath,
    objectToString,
    matchRequestProps,
    getXhrData,
    type XMLHttpRequestSharedRequestData,
    isPruningNeeded,
    matchStackTrace,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
} from '../helpers';
import { type Source } from './scriptlets';

/**
 * @scriptlet json-prune-xhr-response
 *
 * @description
 * Removes specified properties from the JSON response of a `XMLHttpRequest` call.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/3152896d428c54c76cfd66c3da110bd4d6506cbc
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('json-prune-xhr-response'[, propsToRemove[, obligatoryProps[, propsToMatch[, stack]]]])
 * ```
 *
 * - `propsToRemove` — optional, string of space-separated properties to remove
 * - `obligatoryProps` — optional, string of space-separated properties
 *   which must be all present for the pruning to occur
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *     - colon-separated pairs `name:value` where
 *         - `name` — string or regular expression for matching XMLHttpRequest property name
 *         - `value` — string or regular expression for matching the value of the option
 *           passed to `XMLHttpRequest.open()` call
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if regular expression is invalid it will be skipped
 *
 * > Note please that you can use wildcard `*` for chain property name,
 * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
 *
 * > Usage with with only propsToMatch argument will log XMLHttpRequest calls to browser console.
 * > It may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Scriptlet does nothing if response body can't be converted to JSON.
 *
 * ### Examples
 *
 * 1. Removes property `example` from the JSON response of any XMLHttpRequest call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'example')
 *     ```
 *
 *     For instance, if the JSON response of a XMLHttpRequest call is:
 *
 *     ```js
 *     {one: 1, example: true}
 *     ```
 *
 *     then the response will be modified to:
 *
 *     ```js
 *     {one: 1}
 *     ```
 *
 * 2. A property in a list of properties can be a chain of properties
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'a.b', 'ads.url.first')
 *     ```
 *
 * 3. Removes property `content.ad` from the JSON response of a XMLHttpRequest call if URL contains `content.json`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.ad', '', 'content.json')
 *     ```
 *
 * 4. Removes property `content.ad` from the JSON response of a XMLHttpRequest call
 * if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.ad', '', '', 'test.js')
 *     ```
 *
 * 5. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 * 6. Log all JSON responses of a XMLHttpRequest call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response')
 *     ```
 *
 * @added v1.10.25.
 */

interface CustomXMLHttpRequest extends XMLHttpRequest {
    xhrShouldBePruned: boolean;
    headersReceived: boolean;
    collectedHeaders: string[];
}

export function jsonPruneXhrResponse(
    source: Source,
    propsToRemove: string,
    obligatoryProps: string,
    propsToMatch = '',
    stack = '',
) {
    // Do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    const shouldLog = !propsToRemove && !obligatoryProps;

    const prunePaths = getPrunePath(propsToRemove);
    const requiredPaths = getPrunePath(obligatoryProps);

    const nativeParse = window.JSON.parse;
    const nativeStringify = window.JSON.stringify;

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    const setRequestHeaderWrapper = (
        setRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader,
        thisArgument: CustomXMLHttpRequest,
        argsList: any,
    ): void => {
        // Collect headers
        thisArgument.collectedHeaders.push(argsList);
        return Reflect.apply(setRequestHeader, thisArgument, argsList);
    };

    const setRequestHeaderHandler = {
        apply: setRequestHeaderWrapper,
    };

    let xhrData: XMLHttpRequestSharedRequestData<any>;

    const openWrapper = (
        target: typeof XMLHttpRequest.prototype.open,
        thisArg: CustomXMLHttpRequest,
        args: [method: string, url: string, async: string, user: string, password: string],
    ): void => {
        // eslint-disable-next-line prefer-spread
        xhrData = getXhrData.apply(null, args);

        if (matchRequestProps(source, propsToMatch, xhrData) || shouldLog) {
            thisArg.xhrShouldBePruned = true;
            thisArg.headersReceived = !!thisArg.headersReceived;
        }

        // Trap setRequestHeader of target xhr object to mimic request headers later
        if (thisArg.xhrShouldBePruned && !thisArg.headersReceived) {
            thisArg.headersReceived = true;
            thisArg.collectedHeaders = [];

            // setRequestHeader can only be called on open xhr object,
            // so we can safely proxy it here
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (
        target: typeof XMLHttpRequest.prototype.send,
        thisArg: CustomXMLHttpRequest,
        args: any,
    ): void => {
        // Stack trace cannot be checked in jsonPruner helper,
        // because in this case it returns stack trace of our script,
        // so it has to be checked earlier
        const stackTrace = new Error().stack || '';

        if (!thisArg.xhrShouldBePruned || (stack && !matchStackTrace(stack, stackTrace))) {
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
            if (typeof content !== 'string' && typeof content !== 'object') {
                return;
            }

            let modifiedContent;
            if (typeof content === 'string') {
                try {
                    const jsonContent = nativeParse(content);
                    if (shouldLog) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `${window.location.hostname}\n${nativeStringify(jsonContent, null, 2)}\nStack trace:\n${stackTrace}`, true);
                        logMessage(source, jsonContent, true, false);
                        modifiedContent = content;
                    } else {
                        modifiedContent = jsonPruner(
                            source,
                            jsonContent,
                            prunePaths,
                            requiredPaths,
                            stack = '',
                            {
                                nativeStringify,
                            },
                        );
                        // Convert content to appropriate response type, only if it has been modified
                        try {
                            const { responseType } = thisArg;
                            switch (responseType) {
                                case '':
                                case 'text':
                                    modifiedContent = nativeStringify(modifiedContent);
                                    break;
                                case 'arraybuffer':
                                    modifiedContent = new TextEncoder()
                                        .encode(nativeStringify(modifiedContent))
                                        .buffer;
                                    break;
                                case 'blob':
                                    modifiedContent = new Blob([nativeStringify(modifiedContent)]);
                                    break;
                                default:
                                    break;
                            }
                        } catch (error) {
                            const message = `Response body cannot be converted to reponse type: '${content}'`;
                            logMessage(source, message);
                            modifiedContent = content;
                        }
                    }
                } catch (error) {
                    const message = `Response body cannot be converted to json: '${content}'`;
                    logMessage(source, message);
                    modifiedContent = content;
                }
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

        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url, Boolean(xhrData.async)]);

        // Mimic request headers before sending
        // setRequestHeader can only be called on open request objects
        thisArg.collectedHeaders.forEach((header) => {
            forgedRequest.setRequestHeader(header[0], header[1]);
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

export const jsonPruneXhrResponseNames = [
    'json-prune-xhr-response',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'json-prune-xhr-response.js',
    'ubo-json-prune-xhr-response.js',
    'ubo-json-prune-xhr-response',
];

// eslint-disable-next-line prefer-destructuring
jsonPruneXhrResponse.primaryName = jsonPruneXhrResponseNames[0];

jsonPruneXhrResponse.injections = [
    hit,
    logMessage,
    toRegExp,
    jsonPruner,
    getPrunePath,
    objectToString,
    matchRequestProps,
    getXhrData,
    isPruningNeeded,
    matchStackTrace,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
];
