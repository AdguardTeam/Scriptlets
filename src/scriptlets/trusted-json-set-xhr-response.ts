import {
    logMessage,
    getPrunePath,
    objectToString,
    matchRequestProps,
    jsonPath,
    getXhrData,
    type XMLHttpRequestSharedRequestData,
    jsonSetter,
    matchStackTrace,
    addStackTraceMessageLine,
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
    jsonLineEdit,
    hit,
    isPruningNeeded,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    toRegExp,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
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
 * example.org#%#//scriptlet('trusted-json-set-xhr-response', propsPath, argumentValue[, requiredInitialProps[, propsToMatch[, stack[, mode[, verbose]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsPath` — required, dot-separated path to the property to set.
 *   Supports wildcards `*` and `[]`, and value filtering with `.[=].value`.
 *   In `jsonpath` mode only single JSONPath prune expression is supported.
 * - `argumentValue` — required, value to write at the target path.
 *   Supports the same constants, `json:{...}`, and `replace:/regex/replacement/` syntax as `trusted-json-set`,
 *   including `$now$`, `$currentDate$`, and `$currentISODate$` time keywords
 *   which may be used in any part of the value, e.g. `json:{"count":1,"firstTime":$now$}`.
 *   In `jsonpath` mode this argument may be omitted when `propsPath` already includes
 *   an inline mutation suffix such as `=` or `+=`.
 * - `requiredInitialProps` — optional, space-separated list of property paths
 *   which must all be present for the modification to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 * - `mode` — optional, syntax mode selector.
 *   Supported values:
 *     - `legacy` — force the existing legacy path syntax
 *     - `jsonpath` — force JSONPath syntax
 *   If omitted, the scriptlet detects JSONPath automatically for clearly JSONPath-shaped expressions.
 * - `verbose` — optional, if set to `true`, the scriptlet will log the original and modified JSON content.
 *
 * > Scriptlet does nothing if response body cannot be converted to JSON.
 * > If the response is line-delimited JSON, each JSON line is processed independently.
 *
 * ### Example
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Sets `foo` property to `{"a":{"test":1},"b":{"c":1}}` in the JSON response of any XMLHttpRequest call:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', '$.foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 * 1. Creates `config.flags.blocked` path in matching XMLHttpRequest responses
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', 'config.flags.blocked', 'true', '', 'api/config')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', '$.+={"config":{"flags":{"blocked":true}}}', '', '', 'api/config')
 *     ```
 *
 * 1. Replaces a value in the JSON response using a regular expression
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', 'foo', 'replace:/advertisement/article/')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-xhr-response', '$.foo=replace({"regex":"advertisement","replacement":"article"})')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
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
    mode = '',
    verbose = '',
) {
    const syntaxModeDetails = resolveJsonSyntaxMode(propsPath, mode);
    const jsonPathExpression = syntaxModeDetails.mode === 'jsonpath'
        ? buildJsonPathExpression(propsPath, argumentValue)
        : '';

    if (!propsPath) {
        return;
    }

    if (typeof Proxy === 'undefined') {
        return;
    }

    if (syntaxModeDetails.mode === 'legacy' && argumentValue === undefined) {
        return;
    }

    if (syntaxModeDetails.mode === 'jsonpath' && jsonPathExpression === '') {
        logMessage(source, 'JSONPath mode requires argumentValue unless propsPath already contains an inline mutation');
        return;
    }

    const shouldLogContent = verbose === 'true';

    const parsedArgumentValue = syntaxModeDetails.mode === 'legacy'
        ? parseJsonSetArgumentValue(source, argumentValue, window.JSON.parse)
        : null;
    if (syntaxModeDetails.mode === 'legacy' && !parsedArgumentValue) {
        return;
    }

    const parsedSetPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsPath) : [];
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(requiredInitialProps) : [];

    const nativeObjects = {
        nativeParse: window.JSON.parse,
        nativeStringify: window.JSON.stringify,
    };

    const nativeOpen = window.XMLHttpRequest.prototype.open;
    const nativeSend = window.XMLHttpRequest.prototype.send;

    const matchedXhrRequests = new Map<XMLHttpRequest, XMLHttpRequestSharedRequestData<any>>();
    const xhrRequestHeaders = new Map<XMLHttpRequest, any[]>();

    // Props of the forged response which are defined on the XHR object of the page, as they are removed
    // when the object is opened again, and a token of the forged response which each XHR object has.
    // A new object is the token of each response, not its forged request, which would keep the whole original
    // response alive while the page keeps the XHR object
    const FORGED_RESPONSE_PROPS = [
        'readyState',
        'responseURL',
        'responseXML',
        'status',
        'statusText',
        'response',
        'responseText',
    ];
    const forgedXhrResponses = new WeakMap<XMLHttpRequest, object>();

    // Value which is used for all the nodes matched in the intercepted payload.
    // Time keywords in it are resolved before every payload is mutated
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    let resolvedArgumentValue = parsedArgumentValue;

    const getValueToSet = (currentValue: any): any => {
        if (!resolvedArgumentValue) {
            return currentValue;
        }

        return getJsonSetValue(currentValue, resolvedArgumentValue);
    };

    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(source, jsonValue, jsonPathExpression, nativeObjects, () => hit(source), '');
        }

        resolvedArgumentValue = resolveJsonSetTimeKeywords(
            source,
            argumentValue,
            nativeObjects.nativeParse,
            parsedArgumentValue,
        );

        return jsonSetter(
            source,
            jsonValue,
            setPathObj?.path || '',
            setPathObj?.value,
            getValueToSet,
            requiredPaths,
            '',
            nativeObjects,
        );
    };

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

        const previousForgedResponse = forgedXhrResponses.get(thisArg);

        Reflect.apply(target, thisArg, args);

        // The XHR object may be reused for the next request, so the props of the forged response
        // of the previous one are removed, and the native ones are used again, unless it is matched as well.
        // It is done only after the object is opened, as `open()` may throw, e.g. for an invalid URL,
        // and the object keeps its state then. Only the response which the object has had before is removed,
        // i.e. if it has the same token, as `open()` may fire `readystatechange` synchronously,
        // e.g. for a new object, and its listener may send a synchronous request, whose response is created
        // before `open()` returns. It is not fired for an object which has had a forged response,
        // as its native state is already opened, since the forged request is sent instead of it
        if (previousForgedResponse && forgedXhrResponses.get(thisArg) === previousForgedResponse) {
            FORGED_RESPONSE_PROPS.forEach((prop) => {
                Reflect.deleteProperty(thisArg, prop);
            });
            forgedXhrResponses.delete(thisArg);
        }
    };

    const sendWrapper = (
        target: typeof XMLHttpRequest.prototype.send,
        thisArg: XMLHttpRequest,
        args: any,
    ): void => {
        if (!matchedXhrRequests.has(thisArg)) {
            return Reflect.apply(target, thisArg, args);
        }

        // Stack trace is read only if it is matched or logged.
        // The page may make creating or reading it throw, e.g. by replacing `Error`
        // or by `Error.prepareStackTrace`, which should not stop the rules without `stack` from working,
        // so it is done separately
        let stackTrace = '';
        let isStackTraceRead = false;
        if (stack || shouldLogContent) {
            try {
                stackTrace = String(new Error().stack || '');
                isStackTraceRead = true;
            } catch {
                // Rules with `stack` are not processed, as it cannot be matched
            }
        }

        // Error message line is added to the stack trace created here, in the wrapper called by the page,
        // as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
        if (stack && (!isStackTraceRead || !matchStackTrace(stack, addStackTraceMessageLine(stackTrace)))) {
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
                let jsonContent;
                let parseFailed = false;

                try {
                    jsonContent = nativeObjects.nativeParse(content);
                } catch {
                    parseFailed = true;
                }

                if (parseFailed) {
                    try {
                        const lineEditResult = jsonLineEdit(
                            (parsedLine) => applyJsonMutation(parsedLine),
                            nativeObjects,
                            content,
                        );

                        if (lineEditResult.hasJsonLines) {
                            modifiedContent = lineEditResult.text;

                            if (shouldLogContent) {
                                // eslint-disable-next-line max-len
                                logMessage(source, `Original content:\n${window.location.hostname}\n${content}\nStack trace:\n${stackTrace}`, true);
                                // eslint-disable-next-line max-len
                                logMessage(source, `Modified content:\n${window.location.hostname}\n${modifiedContent}\nStack trace:\n${stackTrace}`, true);
                            }

                            try {
                                const { responseType } = thisArg;
                                switch (responseType) {
                                    case 'arraybuffer':
                                        modifiedContent = new TextEncoder().encode(modifiedContent).buffer;
                                        break;
                                    case 'blob':
                                        modifiedContent = new Blob([modifiedContent]);
                                        break;
                                    default:
                                        break;
                                }
                            } catch {
                                modifiedContent = content;
                            }
                        } else {
                            const message = `Response body cannot be converted to json: '${content}'`;
                            logMessage(source, message);
                            modifiedContent = content;
                        }
                    } catch {
                        const message = `Response body cannot be converted to json: '${content}'`;
                        logMessage(source, message);
                        modifiedContent = content;
                    }
                } else {
                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Original content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(jsonContent, null, 2)}\nStack trace:\n${stackTrace}`, true);
                        logMessage(source, jsonContent, true, false);
                    }

                    modifiedContent = applyJsonMutation(jsonContent);

                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(modifiedContent, null, 2)}\nStack trace:\n${stackTrace}`, true);
                        logMessage(source, modifiedContent, true, false);
                    }

                    try {
                        const { responseType } = thisArg;
                        switch (responseType) {
                            case '':
                            case 'text':
                                modifiedContent = nativeObjects.nativeStringify(modifiedContent);
                                break;
                            case 'arraybuffer':
                                modifiedContent = new TextEncoder()
                                    .encode(nativeObjects.nativeStringify(modifiedContent))
                                    .buffer;
                                break;
                            case 'blob':
                                modifiedContent = new Blob([nativeObjects.nativeStringify(modifiedContent)]);
                                break;
                            default:
                                break;
                        }
                    } catch {
                        modifiedContent = content;
                    }
                }
            } else if (content !== null) {
                modifiedContent = applyJsonMutation(content);
            }

            // They are configurable, so they can be removed when the object is opened again
            Object.defineProperties(thisArg, {
                readyState: { value: readyState, writable: false, configurable: true },
                responseURL: { value: responseURL, writable: false, configurable: true },
                responseXML: { value: responseXML, writable: false, configurable: true },
                status: { value: status, writable: false, configurable: true },
                statusText: { value: statusText, writable: false, configurable: true },
                response: { value: modifiedContent, writable: false, configurable: true },
                responseText: { value: modifiedContent, writable: false, configurable: true },
            });
            // The entry is kept until the object is opened again, as it is the only record that the object has
            // the props of this response, which hide the native ones, and they are removed then.
            // A new object is set for each response and compared by identity, so a response created
            // during `open()` is told apart from the previous one, without changing the entry before `open()`
            // and restoring it if `open()` throws
            forgedXhrResponses.set(thisArg, {});

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
    jsonPath,
    jsonSetter,
    matchStackTrace,
    addStackTraceMessageLine,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
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
    jsonLineEdit,
    hit,
    isPruningNeeded,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    toRegExp,
];
