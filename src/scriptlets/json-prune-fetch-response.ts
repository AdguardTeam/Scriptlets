import {
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonPruner,
    jsonPath,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPrunePath,
    forgeResponse,
    type FetchResource,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStackPattern,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    getFunctionProxyProperty,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @scriptlet json-prune-fetch-response
 *
 * @description
 * Removes specified properties from the JSON response of a fetch call.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/749cec0f095f659d6c0b90eb89b729e9deb07c87
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('json-prune-fetch-response'[, propsToRemove[, obligatoryProps[, propsToMatch[, stack[, mode]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsToRemove` — optional, string of space-separated properties to remove.
 *   In `jsonpath` mode only single JSONPath prune expression is supported.
 * - `obligatoryProps` — optional, string of space-separated properties
 *   which must be all present for the pruning to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - String or regular expression for matching the URL passed to fetch call;
 *       empty string, wildcard `*` or invalid regular expression will match all fetch calls.
 *     - Colon-separated pairs `name:value` where:
 *         <!-- markdownlint-disable-next-line line-length -->
 *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
 *           invalid regular expression will cause any value matching.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if it is an invalid regular expression, the rule is not applied.
 * - `mode` — optional, syntax mode selector.
 *   Supported values:
 *     - `legacy` — force the existing legacy path syntax;
 *     - `jsonpath` — force JSONPath syntax.
 *   If omitted, the scriptlet detects JSONPath automatically for clearly JSONPath-shaped expressions.
 *
 * > Note please that you can use wildcard `*` for chain property name,
 * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
 *
 * > Usage with only propsToMatch argument will log fetch calls to browser console.
 * > It may be useful for debugging, but it is not allowed for prod versions of filter lists.
 *
 * > Scriptlet does nothing if response body can't be converted to JSON.
 *
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Removes property `example` from the JSON response of any fetch call:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', 'example')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', '$.example')
 *     ```
 *
 *     For instance, if the JSON response of a fetch call is:
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
 * 2. A property in a list of properties can be a chain of properties:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', 'a.b', 'ads.url.first')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', '[?(@.ads.url.first)]$.a.b')
 *     ```
 *
 * 3. Removes property `content.ad` from the JSON response of a fetch call if URL contains `content.json`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', 'content.ad', '', 'content.json')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', '$.content.ad', '', 'content.json')
 *     ```
 *
 * 4. Removes property `content.ad` from the JSON response of a fetch call if its error stack trace contains `test.js`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', 'content.ad', '', '', 'test.js')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', '$.content.ad', '', '', 'test.js')
 *     ```
 *
 * 5. A property in a list of properties can be a chain of properties with wildcard in it:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response', '$.content.*.media[?(@.ad)].src')
 *     ```
 *
 * 6. Log all JSON responses of a fetch call:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-fetch-response')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v1.10.25.
 */
/* eslint-enable max-len */
export function jsonPruneFetchResponse(
    source: Source,
    propsToRemove: string,
    obligatoryProps: string,
    propsToMatch = '',
    stack = '',
    mode = '',
) {
    // Do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer):
    // https://developer.mozilla.org/docs/Web/API/Window/fetch
    // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    const syntaxModeDetails = resolveJsonSyntaxMode(propsToRemove, mode);
    const prunePaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsToRemove) : [];
    const requiredPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(obligatoryProps) : [];

    const nativeRequestClone = window.Request.prototype.clone;
    const nativeResponseClone = window.Response.prototype.clone;
    const nativeFetch = window.fetch;
    const nativeObjects = {
        nativeParse: window.JSON.parse,
        nativeStringify: window.JSON.stringify,
    };

    // Content is only logged without properties to remove, regardless of `stack`,
    // as `jsonPruner()` logs it for other scriptlets as well, e.g. `json-prune` for `JSON.parse()`
    const isLoggingMode = syntaxModeDetails.mode === 'legacy' && prunePaths.length === 0;

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression, so such rule is not applied,
    // which is logged once, instead of on each request
    if (stack && !isLoggingMode && !isValidStackPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
        return;
    }

    // `stack` is not passed to the helpers, as it is already matched by `fetchHandlerWrapper()`
    // when `fetch()` is called, and the response is pruned after it is awaited,
    // when the caller is no longer in the stack, so the stack trace read then is passed to be logged instead
    const pruneJsonValue = (root: any, stackTrace: string) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(source, root, propsToRemove, nativeObjects, () => hit(source), '');
        }

        return jsonPruner(source, root, prunePaths, requiredPaths, '', nativeObjects, stackTrace);
    };

    const fetchHandlerWrapper = async (
        target: typeof fetch,
        thisArg: any,
        args: [FetchResource, RequestInit],
    ): Promise<Response> => {
        const fetchData = getFetchData(args, nativeRequestClone);

        if (!matchRequestProps(source, propsToMatch, fetchData)) {
            return Reflect.apply(target, thisArg, args);
        }

        // Stack trace is read only if it is matched or logged, before the response is awaited,
        // so it has the caller of `fetch()`, which is no longer in the stack after that,
        // e.g. a function which returns the promise of `fetch()`.
        // The page may make creating or reading it throw, e.g. by replacing `Error` or by `Error.prepareStackTrace`,
        // which should not stop the rules without `stack` from working, so it is done separately
        let stackTrace = '';
        let isStackTraceRead = false;
        if (stack || isLoggingMode) {
            try {
                stackTrace = String(new Error().stack || '');
                isStackTraceRead = true;
            } catch {
                // Rules with `stack` are not applied, as it cannot be matched, and it is not logged
            }
        }

        // Error message line is added to the stack trace created here, in the wrapper called by the page,
        // as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
        if (
            stack
            && !isLoggingMode
            && (!isStackTraceRead || !matchStackTrace(stack, addStackTraceMessageLine(stackTrace)))
        ) {
            return Reflect.apply(target, thisArg, args);
        }

        // Request is sent once, outside of `try`, so its rejection is passed to the page as is,
        // and it is not sent again, e.g. a POST request
        const originalResponse = await Reflect.apply(nativeFetch, null, args);

        let clonedResponse;
        try {
            clonedResponse = nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not clone the response: ${fetchData.url}`);
            return originalResponse;
        }

        let json;
        try {
            json = await originalResponse.json();
        } catch (e) {
            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        }

        const modifiedJson = pruneJsonValue(json, stackTrace);

        const forgedResponse = forgeResponse(
            originalResponse,
            nativeObjects.nativeStringify(modifiedJson),
        );
        hit(source);

        return forgedResponse;
    };

    const fetchHandler = {
        apply: fetchHandlerWrapper,
        get: getFunctionProxyProperty,
    };

    window.fetch = new Proxy<typeof fetch>(window.fetch, fetchHandler);
}

export const jsonPruneFetchResponseNames = [
    'json-prune-fetch-response',
    // Aliases are needed for matching the related scriptlet converted into our syntax:
    'json-prune-fetch-response.js',
    'ubo-json-prune-fetch-response.js',
    'ubo-json-prune-fetch-response',
    // uBO-compatible alias
    'json-edit-fetch-response',
    'json-edit-fetch-response.js',
    'ubo-json-edit-fetch-response.js',
    'ubo-json-edit-fetch-response',
];

// eslint-disable-next-line prefer-destructuring
jsonPruneFetchResponse.primaryName = jsonPruneFetchResponseNames[0];

jsonPruneFetchResponse.injections = [
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonPruner,
    jsonPath,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPrunePath,
    forgeResponse,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStackPattern,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    getFunctionProxyProperty,
];
