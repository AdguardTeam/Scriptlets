import {
    logMessage,
    getPrunePath,
    objectToString,
    matchRequestProps,
    getXhrData,
    type XMLHttpRequestSharedRequestData,
    jsonSetter,
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
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    nativeIsNaN,
    extractRegexAndReplacement,
    getJsonSetValue,
    hit,
    isPruningNeeded,
    parseJsonSetArgumentValue,
    toRegExp,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-json-set-xhr-response
 *
 * @description
 * Sets a property at the given path in the JSON response of an XMLHttpRequest call.
 * If the path does not exist, it is created together with any missing intermediate objects.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-json-set-xhr-response', propsPath, argumentValue[, requiredInitialProps[, propsToMatch[, stack[, verbose]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsPath` — required, dot-separated path to the property to set.
 *   Supports wildcards `*` and `[]`, and value filtering with `.[=].value`.
 * - `argumentValue` — required, value to write at the target path.
 *   Supports the same constants, `json:{...}`, and `replace:/regex/replacement/` syntax as `trusted-json-set`.
 * - `requiredInitialProps` — optional, space-separated list of property paths
 *   which must all be present for the modification to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 * - `verbose` — optional, if set to `true`, the scriptlet will log the original and modified JSON content.
 *
 * > Scriptlet does nothing if response body cannot be converted to JSON.
 *
 * ### Example
 *
 * ```adblock
 * example.org#%#//scriptlet('trusted-json-set-xhr-response', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 * ```
 *
 * @added v2.3.0.
 */
/* eslint-enable max-len */
export function trustedJsonSetXhrResponse(
    source: Source,
    propsPath: string,
    argumentValue: any,
    requiredInitialProps = '',
    propsToMatch = '',
    stack = '',
    verbose = '',
) {
    if (!propsPath || argumentValue === undefined) {
        return;
    }

    if (typeof Proxy === 'undefined') {
        return;
    }

    const parsedArgumentValue = parseJsonSetArgumentValue(
        source,
        argumentValue,
        window.JSON.parse,
    );
    if (!parsedArgumentValue) {
        return;
    }

    const shouldLogContent = verbose === 'true';

    const parsedSetPaths = getPrunePath(propsPath);
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = getPrunePath(requiredInitialProps);

    const nativeParse = window.JSON.parse;
    const nativeStringify = window.JSON.stringify;

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    const matchedXhrRequests = new Map<XMLHttpRequest, XMLHttpRequestSharedRequestData<any>>();
    const xhrRequestHeaders = new Map<XMLHttpRequest, any[]>();

    const getValueToSet = (currentValue: any): any => getJsonSetValue(currentValue, parsedArgumentValue);

    const setRequestHeaderWrapper = (
        setRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader,
        thisArgument: XMLHttpRequest,
        argsList: any,
    ): void => {
        const headers = xhrRequestHeaders.get(thisArgument);
        if (headers) {
            headers.push(argsList);
        }
        return Reflect.apply(setRequestHeader, thisArgument, argsList);
    };

    const setRequestHeaderHandler = {
        apply: setRequestHeaderWrapper,
    };

    // TODO: Consider to move all wrappers to helper and share it with json-prune-xhr-response scriptlet
    const openWrapper = (
        target: typeof XMLHttpRequest.prototype.open,
        thisArg: XMLHttpRequest,
        args: [
            method: string,
            url: string,
            async?: boolean,
            user?: string,
            password?: string,
        ],
    ): void => {
        // eslint-disable-next-line prefer-spread
        const xhrData: XMLHttpRequestSharedRequestData<any> = getXhrData.apply(null, args);

        if (matchRequestProps(source, propsToMatch, xhrData)) {
            matchedXhrRequests.set(thisArg, xhrData);
        }

        if (matchedXhrRequests.has(thisArg) && !xhrRequestHeaders.has(thisArg)) {
            xhrRequestHeaders.set(thisArg, []);
            thisArg.setRequestHeader = new Proxy(thisArg.setRequestHeader, setRequestHeaderHandler);
        }

        return Reflect.apply(target, thisArg, args);
    };

    const sendWrapper = (
        target: typeof XMLHttpRequest.prototype.send,
        thisArg: XMLHttpRequest,
        args: any,
    ): void => {
        if (!matchedXhrRequests.has(thisArg)) {
            return Reflect.apply(target, thisArg, args);
        }

        const stackTrace = new Error().stack || '';

        if (stack && !matchStackTrace(stack, stackTrace)) {
            xhrRequestHeaders.delete(thisArg);
            matchedXhrRequests.delete(thisArg);
            return Reflect.apply(target, thisArg, args);
        }

        const xhrData = matchedXhrRequests.get(thisArg);
        if (!xhrData) {
            xhrRequestHeaders.delete(thisArg);
            matchedXhrRequests.delete(thisArg);
            return Reflect.apply(target, thisArg, args);
        }

        const forgedRequest = new XMLHttpRequest();
        forgedRequest.withCredentials = thisArg.withCredentials;
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

            const content = responseText || response;
            if (typeof content !== 'string' && typeof content !== 'object') {
                return;
            }

            let modifiedContent = content;
            if (typeof content === 'string') {
                try {
                    const jsonContent = nativeParse(content);

                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Original content:\n${window.location.hostname}\n${nativeStringify(jsonContent, null, 2)}\nStack trace:\n${stackTrace}`, true);
                        logMessage(source, jsonContent, true, false);
                    }

                    modifiedContent = jsonSetter(
                        source,
                        jsonContent,
                        setPathObj?.path || '',
                        setPathObj?.value,
                        getValueToSet,
                        requiredPaths,
                        '',
                        {
                            nativeStringify,
                        },
                    );

                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeStringify(modifiedContent, null, 2)}\nStack trace:\n${stackTrace}`, true);
                        logMessage(source, modifiedContent, true, false);
                    }

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
                    } catch {
                        modifiedContent = content;
                    }
                } catch {
                    const message = `Response body cannot be converted to json: '${content}'`;
                    logMessage(source, message);
                    modifiedContent = content;
                }
            } else if (content !== null) {
                modifiedContent = jsonSetter(
                    source,
                    content,
                    setPathObj?.path || '',
                    setPathObj?.value,
                    getValueToSet,
                    requiredPaths,
                    '',
                    {
                        nativeStringify,
                    },
                );
            }

            Object.defineProperties(thisArg, {
                readyState: { value: readyState, writable: false },
                responseURL: { value: responseURL, writable: false },
                responseXML: { value: responseXML, writable: false },
                status: { value: status, writable: false },
                statusText: { value: statusText, writable: false },
                response: { value: modifiedContent, writable: false },
                responseText: { value: modifiedContent, writable: false },
            });

            setTimeout(() => {
                const stateEvent = new Event('readystatechange');
                thisArg.dispatchEvent(stateEvent);

                const loadEvent = new Event('load');
                thisArg.dispatchEvent(loadEvent);

                const loadEndEvent = new Event('loadend');
                thisArg.dispatchEvent(loadEndEvent);
            }, 1);
        });

        nativeOpen.apply(forgedRequest, [xhrData.method, xhrData.url, Boolean(xhrData.async)]);

        const collectedHeaders = xhrRequestHeaders.get(thisArg) || [];
        collectedHeaders.forEach((header) => {
            forgedRequest.setRequestHeader(header[0], header[1]);
        });
        xhrRequestHeaders.delete(thisArg);
        matchedXhrRequests.delete(thisArg);

        try {
            Reflect.apply(nativeSend, forgedRequest, args);
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

export const trustedJsonSetXhrResponseNames = [
    'trusted-json-set-xhr-response',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedJsonSetXhrResponse.primaryName = trustedJsonSetXhrResponseNames[0];

trustedJsonSetXhrResponse.injections = [
    logMessage,
    getPrunePath,
    objectToString,
    matchRequestProps,
    getXhrData,
    jsonSetter,
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
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    nativeIsNaN,
    extractRegexAndReplacement,
    getJsonSetValue,
    hit,
    isPruningNeeded,
    parseJsonSetArgumentValue,
    toRegExp,
];
