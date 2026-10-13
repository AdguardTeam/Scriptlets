import {
    hit,
    logMessage,
    toRegExp,
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
    objectToString,
    matchRequestProps,
    getXhrData,
    interceptXhrResponses,
    isValidStackPattern,
    getFunctionProxyProperty,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    logJsonContent,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
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
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('json-prune-xhr-response'[, propsToRemove[, obligatoryProps[, propsToMatch[, stack[, mode]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsToRemove` — optional, string of space-separated properties to remove.
 *   In `jsonpath` mode only single JSONPath prune expression is supported.
 * - `obligatoryProps` — optional, string of space-separated properties
 *   which must be all present for the pruning to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *     - colon-separated pairs `name:value` where:
 *         - `name` — string or regular expression for matching XMLHttpRequest property name;
 *         - `value` — string or regular expression for matching the value of the option
 *           passed to `XMLHttpRequest.open()` call.
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
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '$.example')
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
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '[?(@.ads.url.first)]$.a.b')
 *     ```
 *
 * 3. Removes property `content.ad` from the JSON response of a XMLHttpRequest call if URL contains `content.json`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.ad', '', 'content.json')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '$.content.ad', '', 'content.json')
 *     ```
 *
 * 4. Removes property `content.ad` from the JSON response of a XMLHttpRequest call
 * if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.ad', '', '', 'test.js')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '$.content.ad', '', '', 'test.js')
 *     ```
 *
 * 5. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '$.content.*.media[?(@.ad)].src')
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
/* eslint-enable max-len */
export function jsonPruneXhrResponse(
    source: Source,
    propsToRemove: string,
    obligatoryProps: string,
    propsToMatch = '',
    stack = '',
    mode = '',
) {
    // Do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    const shouldLog = !propsToRemove && !obligatoryProps;

    const syntaxModeDetails = resolveJsonSyntaxMode(propsToRemove, mode);
    const prunePaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsToRemove) : [];
    const requiredPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(obligatoryProps) : [];

    const nativeParse = window.JSON.parse;
    const nativeStringify = window.JSON.stringify;
    const nativeObjects = {
        nativeParse,
        nativeStringify,
    };

    const pruneJsonValue = (root: any) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(source, root, propsToRemove, nativeObjects, () => hit(source), '');
        }

        return jsonPruner(source, root, prunePaths, requiredPaths, '', nativeObjects);
    };

    /**
     * Returns the content of the response for the request of the page, pruned or logged,
     * converted to its response type.
     *
     * @param content text of the forged response
     * @param xhr object of the page
     * @param stackTrace stack trace of `send()` for logs
     * @returns content of the response
     */
    const modifyResponse = (content: any, xhr: XMLHttpRequest, stackTrace: string) => {
        let modifiedContent;
        if (typeof content === 'string') {
            try {
                const jsonContent = nativeParse(content);
                if (shouldLog) {
                    logJsonContent(source, jsonContent, nativeStringify, stackTrace);
                }

                // Content is only logged in logging mode, so the original one is returned
                const resultJson = shouldLog ? jsonContent : pruneJsonValue(jsonContent);
                // Convert content to the response type of the request, as the forged request has the default one,
                // also in logging mode. It is serialized only for the types which need text,
                // as serializing may fail for content which can be parsed, e.g. too deeply nested
                const getResultText = () => (shouldLog ? content : nativeStringify(resultJson));
                try {
                    const { responseType } = xhr;
                    switch (responseType) {
                        case '':
                        case 'text':
                            modifiedContent = getResultText();
                            break;
                        case 'arraybuffer':
                            modifiedContent = new TextEncoder().encode(getResultText()).buffer;
                            break;
                        case 'blob':
                            modifiedContent = new Blob([getResultText()]);
                            break;
                        default:
                            modifiedContent = resultJson;
                            break;
                    }
                } catch (error) {
                    const message = `Response body cannot be converted to response type: '${content}'`;
                    logMessage(source, message);
                    modifiedContent = content;
                }
            } catch (error) {
                const message = `Response body cannot be converted to json: '${content}'`;
                logMessage(source, message);
                modifiedContent = content;
            }
        }

        hit(source);

        return modifiedContent;
    };

    // All requests are intercepted in logging mode.
    // Stack trace cannot be checked in jsonPruner helper, because it would return the stack trace of our script,
    // so it is matched when the request is sent, and read for logging mode as well
    interceptXhrResponses(
        source,
        stack,
        shouldLog,
        (xhrData) => matchRequestProps(source, propsToMatch, xhrData) || shouldLog,
        modifyResponse,
    );
}

export const jsonPruneXhrResponseNames = [
    'json-prune-xhr-response',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'json-prune-xhr-response.js',
    'ubo-json-prune-xhr-response.js',
    'ubo-json-prune-xhr-response',
    // uBO-compatible alias
    'json-edit-xhr-response',
    'json-edit-xhr-response.js',
    'ubo-json-edit-xhr-response.js',
    'ubo-json-edit-xhr-response',
];

// eslint-disable-next-line prefer-destructuring
jsonPruneXhrResponse.primaryName = jsonPruneXhrResponseNames[0];

jsonPruneXhrResponse.injections = [
    hit,
    logMessage,
    toRegExp,
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
    objectToString,
    matchRequestProps,
    getXhrData,
    interceptXhrResponses,
    isValidStackPattern,
    getFunctionProxyProperty,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    logJsonContent,
];
