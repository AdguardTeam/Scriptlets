import {
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    jsonPath,
    getPrunePath,
    forgeResponse,
    type FetchResource,
    isPruningNeeded,
    matchStackTrace,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
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
    parseJsonSetArgumentValue,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-json-set-fetch-response
 *
 * @description
 * Sets a property at the given path in the JSON response of a fetch call.
 * If the path does not exist, it is created together with any missing intermediate objects.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-json-set-fetch-response', propsPath, argumentValue[, requiredInitialProps[, propsToMatch[, stack[, mode[, verbose]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsPath` — required, dot-separated path to the property to set.
 *   Supports wildcards `*` and `[]`, and value filtering with `.[=].value`.
 *   In `jsonpath` mode only single JSONPath prune expression is supported.
 * - `argumentValue` — required, value to write at the target path.
 *   Supports the same constants, `json:{...}`, and `replace:/regex/replacement/` syntax
 *   as `trusted-json-set`.
 *   In `jsonpath` mode this argument may be omitted when `propsPath` already includes
 *   an inline mutation suffix such as `=` or `+=`.
 * - `requiredInitialProps` — optional, space-separated list of property paths
 *   which must all be present for the modification to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match.
 *   Possible props:
 *     - string or regular expression for matching the URL passed to fetch call;
 *     - colon-separated pairs `name:value` for matching fetch init options.
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
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Sets `ads.enabled` to `false` in the JSON response of any fetch call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'ads.enabled', 'false')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', '$.ads.enabled', 'false')
 *     ```
 *
 * 1. Creates `config.flags.blocked` path in matching fetch responses
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'config.flags.blocked', 'true', '', 'api/config')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', '$.+={"config":{"flags":{"blocked":true}}}', '', '', 'api/config')
 *     ```
 *
 * 1. Merges a parsed JSON object into an existing response object property
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', '$.foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 * 1. Replaces a value in the JSON response using a regular expression
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'foo', 'replace:/advertisement/article/')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', '$.foo=replace({"regex":"advertisement","replacement":"article"})')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v2.3.0.
 */
/* eslint-enable max-len */
export function trustedJsonSetFetchResponse(
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

    if (
        typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined'
    ) {
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

    const nativeObjects = {
        nativeFetch: window.fetch,
        nativeParse: window.JSON.parse,
        nativeStringify: window.JSON.stringify,
        nativeRequestClone: window.Request.prototype.clone,
        nativeResponseClone: window.Response.prototype.clone,
    };

    const parsedArgumentValue = syntaxModeDetails.mode === 'legacy'
        ? parseJsonSetArgumentValue(source, argumentValue, nativeObjects.nativeParse)
        : null;
    if (syntaxModeDetails.mode === 'legacy' && !parsedArgumentValue) {
        return;
    }

    const parsedSetPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsPath) : [];
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(requiredInitialProps) : [];

    const getValueToSet = (currentValue: any): any => {
        if (!parsedArgumentValue) {
            return currentValue;
        }

        return getJsonSetValue(currentValue, parsedArgumentValue);
    };

    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(source, jsonValue, jsonPathExpression, nativeObjects, () => hit(source), stack);
        }

        return jsonSetter(
            source,
            jsonValue,
            setPathObj?.path || '',
            setPathObj?.value,
            getValueToSet,
            requiredPaths,
            stack,
            nativeObjects,
        );
    };

    // TODO: Consider to move it to helper and share it with json-prune-fetch-response scriptlet
    const fetchHandlerWrapper = async (
        target: typeof fetch,
        thisArg: any,
        args: [FetchResource, RequestInit],
    ): Promise<Response> => {
        const fetchData = getFetchData(args, nativeObjects.nativeRequestClone);

        if (!matchRequestProps(source, propsToMatch, fetchData)) {
            return Reflect.apply(target, thisArg, args);
        }

        let originalResponse;
        let clonedResponse;
        try {
            // eslint-disable-next-line prefer-spread
            originalResponse = await nativeObjects.nativeFetch.apply(null, args);
            clonedResponse = nativeObjects.nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not make an original fetch request: ${fetchData.url}`);
            return Reflect.apply(target, thisArg, args);
        }

        let textContent;
        try {
            textContent = await originalResponse.text();
        } catch {
            const message = `Response body can't be converted to text: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        }

        try {
            const json = nativeObjects.nativeParse(textContent);
            if (shouldLogContent) {
                // eslint-disable-next-line max-len
                logMessage(source, `Original content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(json, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                logMessage(source, json, true, false);
            }

            const modifiedJson = applyJsonMutation(json);

            if (shouldLogContent) {
                // eslint-disable-next-line max-len
                logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(modifiedJson, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                logMessage(source, modifiedJson, true, false);
            }

            return forgeResponse(
                originalResponse,
                nativeObjects.nativeStringify(modifiedJson),
            );
        } catch {
            // If response body is not a single JSON document, try to process it as line-delimited JSON
        }

        try {
            const lineEditResult = jsonLineEdit(
                (parsedLine) => applyJsonMutation(parsedLine),
                nativeObjects,
                textContent,
            );

            if (lineEditResult.hasJsonLines) {
                if (shouldLogContent) {
                    // eslint-disable-next-line max-len
                    logMessage(source, `Original content:\n${window.location.hostname}\n${textContent}\nStack trace:\n${new Error().stack || ''}`, true);
                    // eslint-disable-next-line max-len
                    logMessage(source, `Modified content:\n${window.location.hostname}\n${lineEditResult.text}\nStack trace:\n${new Error().stack || ''}`, true);
                }

                return forgeResponse(originalResponse, lineEditResult.text);
            }

            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        } catch (error) {
            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        }
    };

    const getWrapper = (target: typeof fetch, propName: string, receiver: any) => {
        if (propName === 'toString') {
            return target.toString.bind(target);
        }
        return Reflect.get(target, propName, receiver);
    };

    const fetchHandler = {
        apply: fetchHandlerWrapper,
        get: getWrapper,
    };

    window.fetch = new Proxy(window.fetch, fetchHandler);
}

export const trustedJsonSetFetchResponseNames = [
    'trusted-json-set-fetch-response',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedJsonSetFetchResponse.primaryName = trustedJsonSetFetchResponseNames[0];

trustedJsonSetFetchResponse.injections = [
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    jsonPath,
    getPrunePath,
    forgeResponse,
    isPruningNeeded,
    matchStackTrace,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
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
    parseJsonSetArgumentValue,
];
