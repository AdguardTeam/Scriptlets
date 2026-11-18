import {
    hit,
    logMessage,
    toRegExp,
    jsonPruner,
    jsonPath,
    splitJsonPathQueries,
    getJsonPathQueries,
    type JsonPathCache,
    getJsonPathRegexpEnd,
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
    isEmptyObject,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    getThrownValueMessage,
    logJsonContent,
    extractRegexAndReplacement,
    nativeIsNaN,
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
 *   In `jsonpath` mode several JSONPath expressions may be separated by spaces, e.g. `$.ads $..banner`,
 *   which are applied in order. Each expression after the first one starts with the root `$` followed by a step,
 *   e.g. `$.ads`, with `v2:`, or with guards followed by the root, e.g. `[?(@.player)]$.player.ads`,
 *   which apply only to that expression, while an argument with a regular expression which contains a raw quote, e.g. `[?.t=/it's/]`,
 *   is one expression, as before, so e.g. `[?.t=/it's/]$.ads $.tracking` removes neither property;
 *   such expressions need separate rules, or the quote written as `\x27` or `\x22`,
 *   e.g. `[?.t=/it\x27s/]$.ads $.tracking`, and a space before a dot
 *   or a bracket continues an expression, as before, e.g. `$.a .b` is `$.a.b`. Spaces inside an expression,
 *   e.g. in a filter `[?(@.a && @.b)]` or a quoted value, do not separate them either,
 *   and none of them is applied if one of them is invalid, also if one of them has a value, e.g. `$.ads=1`,
 *   which only trusted scriptlets may set, while an error of applying one of them,
 *   e.g. of a getter of the page, does not stop the other ones.
 *   Expressions of uBO rules of `json-edit` are not separated, as uBO ignores spaces in them, e.g. `.a $.b`.
 *   JSONPath expressions may also use `^=` and `$=` filters, e.g. `$.items[?.url^="https://ads."]`,
 *   regular expressions of property keys after a dot, e.g. `$./^ad_/`, with `\=` and `\s` instead of `=`
 *   and spaces, as e.g. `$.routes./login=/` is a name with a value, as before, so a key between slashes,
 *   e.g. `$.routes./pets/`, which was the key `/pets/` before, matches every key which contains `pets` now,
 *   e.g. `/pets/archive` and `pets`, and an exact key needs brackets, e.g. `$.routes['/pets/']`,
 *   preconditions before `;$`,
 *   which have to match at least one node, or a number of nodes in a range `{min,max};$`,
 *   e.g. `..adSlots;$.ads` or `$.items[?.ad]{2,};$.ads`, and `v2:` prefix, with which a filter tests
 *   the children of each node, also of an object, e.g. `v2:$.config[?@==true]`, as in RFC 9535,
 *   e.g. `v2:$..[?@[?@.zf==86]]` removes each array or object which contains a node with `zf` 86,
 *   while `$..[?@[?@.zf==86]]` removes these nodes, as before.
 *   In a filter, `@` is the tested node and `$` the root of the document, as in RFC 9535 and uBO,
 *   e.g. `$.items[?$.flag]` matches each item if the root has `flag`, while `$.items[?@.flag]`
 *   matches the items which have it. The root is searched once for an expression, also for a comparison
 *   with the tested node, e.g. `$.items[?@.id==$..limit]`, so a getter of the root is read once for all items,
 *   which differs from a read for each item only for a getter which returns another value on each read.
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
 * 6. Removes `ads` and the items whose `url` starts with `https://ads.` from the responses of requests whose URL
 *    contains `api/feed`, by two expressions of one rule in `JSONPath` mode and a `^=` filter; see `json-prune`
 *    for more examples of JSONPath expressions, which are the same here
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune-xhr-response', '$.ads $.items[?(@.url^="https://ads.")]', '', 'api/feed')
 *     ```
 *
 *     Response JSON:
 *
 *     ```json
 *     { "ads": [1, 2], "items": [{ "url": "https://ads.example.org/1", "title": "Ad" }, { "url": "https://example.org/2", "title": "News (Ad)" }] }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "items": [{ "url": "https://example.org/2", "title": "News (Ad)" }] }
 *     ```
 *
 * 7. Log all JSON responses of a XMLHttpRequest call
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
    // Queries are split once, not for each processed value
    const jsonPathQueries = syntaxModeDetails.mode === 'jsonpath' ? getJsonPathQueries(source, propsToRemove) : [];
    // Queries are parsed once, not for each processed value
    const jsonPathCache: JsonPathCache = Object.create(null);
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
            return jsonPath(
                source,
                root,
                jsonPathQueries,
                nativeObjects,
                () => hit(source),
                '',
                false,
                jsonPathCache,
            );
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
    splitJsonPathQueries,
    getJsonPathQueries,
    getJsonPathRegexpEnd,
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
    isEmptyObject,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    getThrownValueMessage,
    logJsonContent,
    // used by values of jsonPath(), which only trusted scriptlets may set, but its code refers to them
    extractRegexAndReplacement,
    nativeIsNaN,
];
