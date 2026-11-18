import {
    hit,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStrPattern,
    isNativePromise,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    nativeIsNaN,
    isKeyInObject,
    jsonPath,
    splitJsonPathQueries,
    getJsonPathQueries,
    getJsonPathRegexpEnd,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    logJsonContent,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet json-prune
 *
 * @description
 * Removes specified properties from the result of calling JSON.parse and returns the caller.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#json-prunejs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/json-prune.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps [, stack [, mode]]]])
 * ```
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
 *   and none of them is applied if one of them is invalid, while an error of applying one of them,
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
 *   In `jsonpath` mode this argument is ignored. Express such preconditions
 *   directly in `propsToRemove` with leading JSONPath guards and filters.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if it is an invalid regular expression, the rule is not applied.
 * - `mode` — optional, syntax mode selector.
 *   Supported values:
 *     - `legacy` — force the existing legacy path syntax;
 *     - `jsonpath` — force JSONPath syntax.
 *   If omitted, the scriptlet detects JSONPath automatically only for clearly JSONPath-shaped expressions,
 *   otherwise it falls back to legacy syntax.
 *
 * > Note please that you can use wildcard `*` for chain property name,
 * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
 *
 * ### Examples
 *
 * 1. Removes property `example` from the results of `JSON.parse` call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'example')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.example')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"one":1,"example":true}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "one": 1,
 *       "example": true
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "one": 1
 *     }
 *     ```
 *
 * 1. If there are no specified properties in the result of `JSON.parse` call, pruning will NOT occur
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'one', 'obligatoryProp')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.obligatoryProp)]$.one')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"one":1,"two":2}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "one": 1,
 *       "two": 2
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "one": 1,
 *       "two": 2
 *     }
 *     ```
 *
 * 1. A property in a list of properties can be a chain of properties
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'a.b', 'ads.url.first')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.ads.url.first)]$.a.b')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"a":{"b":123},"ads":{"url":{"first":"abc"}}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "a": {
 *         "b": 123
 *       },
 *       "ads": {
 *         "url": {
 *           "first": "abc"
 *         }
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "a": {},
 *       "ads": {
 *         "url": {
 *           "first": "abc"
 *         }
 *       }
 *     }
 *     ```
 *
 * 1. Removes property `content.ad` from the results of `JSON.parse` call if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'content.ad', '', 'test.js')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.content.ad', '', 'test.js')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"content":{"ad":{"src":"a.js"}}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "content": {
 *         "ad": {
 *           "src": "a.js"
 *         }
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "content": {}
 *     }
 *     ```
 *
 * 1. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.content.*.media.ad)]$.content.*.media.src')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"content":{"block1":{"media":{"src":"1.jpg","ad":true}},"block2":{"media":{"src":"2.jpg"}}}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "content": {
 *         "block1": {
 *           "media": {
 *             "src": "1.jpg",
 *             "ad": true
 *           }
 *         },
 *         "block2": {
 *           "media": {
 *             "src": "2.jpg"
 *           }
 *         }
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "content": {
 *         "block1": {
 *           "media": {
 *             "ad": true
 *           }
 *         },
 *         "block2": {
 *           "media": {}
 *         }
 *       }
 *     }
 *     ```
 *
 * 1. Removes every property from `videos` object if it has `isAd` key
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'videos.{-}.isAd')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.videos.*[?(@.isAd)]')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"videos":{"video1":{"isAd":true,"src":"video1.mp4"},"video2":{"src":"video1.mp4"}}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "videos": {
 *         "video1": {
 *           "isAd": true,
 *           "src": "video1.mp4"
 *         },
 *         "video2": {
 *           "src": "video1.mp4"
 *         }
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "videos": {
 *         "video2": {
 *           "src": "video1.mp4"
 *         }
 *       }
 *     }
 *     ```
 *
 * 1. Removes every property from `videos` object if it has `isAd` key with `true` value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'videos.{-}.isAd.[=].true')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.videos.*[?(@.isAd==true)]')
 *     ```
 *
 *     `JSON.parse` call:
 *
 *     ```html
 *     JSON.parse('{"videos":{"video1":{"isAd":true,"src":"video1.mp4"},"video2":{"isAd":false,"src":"video1.mp4"}}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "videos": {
 *         "video1": {
 *           "isAd": true,
 *           "src": "video1.mp4"
 *         },
 *         "video2": {
 *           "isAd": false,
 *           "src": "video1.mp4"
 *         }
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *       "videos": {
 *         "video2": {
 *           "isAd": false,
 *           "src": "video1.mp4"
 *         }
 *       }
 *     }
 *     ```
 *
 * 1. Removes the items whose `url` starts with `https://ads.` and the videos whose `src` ends with `.mp4`,
 *    by `^=` and `$=` filters, which compare the start and the end of a value, and by two expressions of one rule
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.items[?(@.url^="https://ads.")] $.videos[?(@.src$=".mp4")]')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *       "items": [{ "url": "https://ads.example.org/1" }, { "url": "https://example.org/2" }],
 *       "videos": [{ "src": "ad.mp4" }, { "src": "intro.webm" }]
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "items": [{ "url": "https://example.org/2" }], "videos": [{ "src": "intro.webm" }] }
 *     ```
 *
 * 1. Removes the properties of `config` whose keys start with `ad_`, by a regular expression of keys after a dot;
 *    an exact key between slashes needs brackets, e.g. `$.routes['/ads/']`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.config./^ad_/')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "config": { "ad_banner": 1, "ad_video": 2, "theme": "dark" } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "config": { "theme": "dark" } }
 *     ```
 *
 * 1. Removes `ads` only if the JSON has `adSlots` at any depth, by a precondition before `;$`,
 *    which has to match at least one node
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$..adSlots;$.ads')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "page": { "adSlots": [1] }, "ads": [1, 2], "title": "News" }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "page": { "adSlots": [1] }, "title": "News" }
 *     ```
 *
 *     `{ "ads": [1, 2], "title": "News" }` is not changed, as it has no `adSlots`.
 *
 * 1. Removes `banner` only if at least 2 items are ads, by a precondition with a range of the number
 *    of nodes `{min,max};$`, in which `max` may be omitted
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '$.items[?(@.ad)]{2,};$.banner')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "items": [{ "ad": true }, { "ad": true }, { "id": 1 }], "banner": { "id": 2 } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "items": [{ "ad": true }, { "ad": true }, { "id": 1 }] }
 *     ```
 *
 *     `{ "items": [{ "ad": true }, { "id": 1 }], "banner": { "id": 2 } }` is not changed.
 *
 * 1. Removes the properties of `flags` whose value is `true`, by `v2:` prefix, with which a filter tests
 *    the children of each node, also of an object, as in uBO; without it, the filter tests `flags` itself,
 *    so the same expression is `$.flags.*[?(@==true)]`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'v2:$.flags[?@==true]')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "flags": { "ads": true, "tracking": true, "darkMode": false } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "flags": { "darkMode": false } }
 *     ```
 *
 * 1. Removes `ads` and `tracking` by one rule in `JSONPath` mode if `title` matches a regular expression
 *    with a quote; each expression has its own guard, as a guard applies only to the expression it precedes,
 *    and the quote is written as `\x27`, as a raw quote, e.g. `/it's/`, would make the whole argument
 *    one expression, which removes neither property
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.title=/it\x27s/)]$.ads [?(@.title=/it\x27s/)]$.tracking')
 *     ```
 *
 *     or one expression with both properties, in which the quote may be raw:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.title=/it\'s/)]$["ads","tracking"]')
 *     ```
 *
 *     or two rules:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '[?(@.title=/it\'s/)]$.ads')
 *     example.org#%#//scriptlet('json-prune', '[?(@.title=/it\'s/)]$.tracking')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "title": "it's an ad", "ads": [1, 2], "tracking": { "id": 1 } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "title": "it's an ad" }
 *     ```
 *
 *     With another title, e.g. `{ "title": "News", "ads": [1, 2], "tracking": { "id": 1 } }`,
 *     neither property is removed.
 *
 * 1. Call with no arguments will log the current hostname and JSON payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune')
 *     ```
 *
 * 1. Call with only second argument will log the current hostname and matched json payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '', '"id":"117458"')
 *     ```
 *
 * @added v1.1.0.
 */
/* eslint-enable max-len */
export function jsonPrune(source, propsToRemove, requiredInitialProps, stack = '', mode = '') {
    const syntaxModeDetails = resolveJsonSyntaxMode(propsToRemove, mode);
    // Queries are split once, not for each processed value
    const jsonPathQueries = syntaxModeDetails.mode === 'jsonpath' ? getJsonPathQueries(source, propsToRemove) : [];
    // Queries are parsed once, not for each processed value
    const jsonPathCache = Object.create(null);
    const prunePaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsToRemove) : [];
    const requiredPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(requiredInitialProps) : [];

    const nativeObjects = {
        nativeParse: window.JSON.parse,
        nativeStringify: window.JSON.stringify,
    };

    // Content is only logged without properties to remove, regardless of `stack`, as by `jsonPruner()`
    const isLoggingMode = syntaxModeDetails.mode === 'legacy' && prunePaths.length === 0;

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression, so such rule is not applied,
    // which is logged once, instead of on each call
    if (stack && !isLoggingMode && !isValidStrPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
        return;
    }

    const pruneJsonValue = (root, stackToMatch, stackTraceToLog) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(
                source,
                root,
                jsonPathQueries,
                nativeObjects,
                () => hit(source),
                stackToMatch,
                false,
                jsonPathCache,
            );
        }

        return jsonPruner(source, root, prunePaths, requiredPaths, stackToMatch, nativeObjects, stackTraceToLog);
    };

    const jsonParseWrapper = (...args) => {
        // dealing with stringified json in args, which should be parsed.
        // so we call nativeJSONParse as JSON.parse which is bound to JSON object
        const root = nativeObjects.nativeParse.apply(JSON, args);
        // `stack` is not matched in logging mode, as it is not checked when the scriptlet runs then,
        // and it changes nothing, as the content is logged regardless of it, and nothing is pruned
        return pruneJsonValue(root, isLoggingMode ? '' : stack);
    };

    // JSON.parse mocking
    jsonParseWrapper.toString = nativeObjects.nativeParse.toString.bind(nativeObjects.nativeParse);
    JSON.parse = jsonParseWrapper;

    // do nothing if browser does not support Response (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/Response
    if (typeof Response === 'undefined') {
        return;
    }

    // Saved before the page can replace them, as the promise returned by `Response.prototype.json()`
    // is pruned on its fulfillment
    const NativePromise = window.Promise;
    const nativePromiseThen = NativePromise.prototype.then;
    const nativeResponseJson = Response.prototype.json;
    // eslint-disable-next-line func-names
    const responseJsonWrapper = function () {
        const promise = Reflect.apply(nativeResponseJson, this, []);

        // Stack trace is read only if it is matched or logged, when the method is called, as the value is pruned
        // when the promise is fulfilled, when the caller is no longer in the stack, e.g. a function which returns
        // the promise of `json()`. The page may make creating or reading it throw, e.g. by replacing `Error`
        // or by `Error.prepareStackTrace`, which should not stop the rules without `stack` from working,
        // so it is done separately
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
            return promise;
        }

        const onFulfilled = (obj) => pruneJsonValue(obj, '', stackTrace);

        // Native method is used, as `then` of the promise may be replaced by the page.
        // `json()` returns a promise which is not an instance of the saved `Promise` if `Promise` has been replaced
        // before the scriptlet has run, e.g. by zone.js, or `json()` itself, e.g. by a polyfill.
        // Its own `then()` is used then, as the saved one may not support it, while it is still a promise
        if (isNativePromise(promise, NativePromise)) {
            return Reflect.apply(nativePromiseThen, promise, [onFulfilled]);
        }
        return promise.then(onFulfilled);
    };

    Response.prototype.json = responseJsonWrapper;
}

export const jsonPruneNames = [
    'json-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'json-prune.js',
    'ubo-json-prune.js',
    'ubo-json-prune',
    'abp-json-prune',
    // uBO-compatible alias
    'json-edit',
    'json-edit.js',
    'ubo-json-edit.js',
    'ubo-json-edit',
];

// eslint-disable-next-line prefer-destructuring
jsonPrune.primaryName = jsonPruneNames[0];

jsonPrune.injections = [
    hit,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStrPattern,
    isNativePromise,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    toRegExp,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    nativeIsNaN,
    isKeyInObject,
    jsonPath,
    splitJsonPathQueries,
    getJsonPathQueries,
    getJsonPathRegexpEnd,
    resolveJsonSyntaxMode,
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
    getThrownValueMessage,
    logJsonContent,
];
