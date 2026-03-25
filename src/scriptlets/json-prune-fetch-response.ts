import {
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonPruner,
    jsonPath,
    getPrunePath,
    forgeResponse,
    type FetchResource,
    isPruningNeeded,
    matchStackTrace,
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
 *   if regular expression is invalid it will be skipped.
 * - `mode` — optional, syntax mode selector.
 *   Supported values:
 *     - `legacy` — force the existing legacy path syntax
 *     - `jsonpath` — force JSONPath syntax
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

    const pruneJsonValue = (root: any) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(source, root, propsToRemove, nativeObjects, () => hit(source), stack);
        }

        return jsonPruner(source, root, prunePaths, requiredPaths, stack, nativeObjects);
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

        let originalResponse;
        let clonedResponse;
        try {
            // eslint-disable-next-line prefer-spread
            originalResponse = await nativeFetch.apply(null, args);
            clonedResponse = nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not make an original fetch request: ${fetchData.url}`);
            return Reflect.apply(target, thisArg, args);
        }

        let json;
        try {
            json = await originalResponse.json();
        } catch (e) {
            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        }

        const modifiedJson = pruneJsonValue(json);

        const forgedResponse = forgeResponse(
            originalResponse,
            nativeObjects.nativeStringify(modifiedJson),
        );
        hit(source);

        return forgedResponse;
    };

    const fetchHandler = {
        apply: fetchHandlerWrapper,
    };

    window.fetch = new Proxy(window.fetch, fetchHandler);
}

export const jsonPruneFetchResponseNames = [
    'json-prune-fetch-response',
    // Aliases are needed for matching the related scriptlet converted into our syntax:
    'json-prune-fetch-response.js',
    'ubo-json-prune-fetch-response.js',
    'ubo-json-prune-fetch-response',
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
    getPrunePath,
    forgeResponse,
    isPruningNeeded,
    matchStackTrace,
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
];
