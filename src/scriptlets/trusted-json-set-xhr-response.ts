import {
    logMessage,
    getPrunePath,
    objectToString,
    matchRequestProps,
    jsonPath,
    getXhrData,
    interceptXhrResponses,
    isValidStackPattern,
    getFunctionProxyProperty,
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
    getThrownValueMessage,
    logJsonContent,
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

    /**
     * Returns the content of the response for the request of the page, modified,
     * converted to its response type.
     *
     * @param content text of the forged response
     * @param xhr object of the page
     * @param stackTrace stack trace of `send()` for logs
     * @returns content of the response
     */
    const modifyResponse = (content: any, xhr: XMLHttpRequest, stackTrace: string) => {
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
                            const { responseType } = xhr;
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
                    const { responseType } = xhr;
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

        return modifiedContent;
    };

    interceptXhrResponses(
        source,
        stack,
        shouldLogContent,
        (xhrData) => matchRequestProps(source, propsToMatch, xhrData),
        modifyResponse,
    );
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
    interceptXhrResponses,
    isValidStackPattern,
    getFunctionProxyProperty,
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
    getThrownValueMessage,
    logJsonContent,
];
