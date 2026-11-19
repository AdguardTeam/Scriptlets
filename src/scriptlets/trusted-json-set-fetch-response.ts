import {
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    jsonPath,
    areJsonPathQueriesValid,
    splitJsonPathQueries,
    getJsonPathQueries,
    type JsonPathCache,
    getJsonPathRegexpEnd,
    getPrunePath,
    forgeResponse,
    type FetchResource,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    getFunctionProxyProperty,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    buildJsonPathQueries,
    toRegExp,
    isValidStrPattern,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
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
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    getThrownValueMessage,
    logJsonContent,
    getUboJsonEditArguments,
    parseUboOptions,
    unescapeUboArgument,
    isDigits,
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
    type UboPropNeedle,
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
 *   In `jsonpath` mode several JSONPath expressions may be separated by spaces, e.g. `$.ads $..banner=false`,
 *   which are applied in order, and `argumentValue` is set by each of them without its own value,
 *   as it is, i.e. it is never split. Each expression after the first one starts with the root `$` followed
 *   by a step, e.g. `$.ads`, with `v2:`, or with guards followed by the root, e.g. `[?(@.player)]$.player.ads`,
 *   which apply only to that expression, while an argument with a regular expression which contains a raw quote, e.g. `[?.t=/it's/]`,
 *   is one expression, as before, so e.g. `[?.t=/it's/]$.a=1 $.b=2` sets `a` to the text `1 $.b=2`;
 *   such expressions need separate rules, or the quote written as `\x27` or `\x22`,
 *   e.g. `[?.t=/it\x27s/]$.a=1 $.b=2`, and a space before a dot
 *   or a bracket continues an expression, as before, e.g. `$.a .b` is `$.a.b`. Spaces inside an expression,
 *   e.g. in a filter `[?(@.a && @.b)]` or in a value, do not separate them either, and an expression after
 *   a text value has its own value, e.g. `$.title=Don't show $.ads=false`, while e.g. `$.title=Costs 5 $`
 *   is one value, so an expression which sets `argumentValue` has to precede a text value,
 *   which a constant is as well, e.g. `$..banner=false $.ads` sets the text `false $.ads`.
 *   An expression may have `$remove$` as its own value, which removes the nodes it matches,
 *   as the same `argumentValue` does, so that properties are removed and set by one rule, in any order,
 *   e.g. `$.ads=$remove$ $..banner=false` or `$..banner=false $.ads=$remove$`, and any expression may
 *   follow it, e.g. `$.ads=$remove$ $.premium` with `argumentValue` `true`. It is a text after `+=` and `++=`,
 *   in quotes, which are a part of a text value, and after `json:`, e.g. `$.note=json:"$remove$"`.
 *   A value `replace:/regex/replacement/` is the rest of the argument if the argument ends with `/` or `/g`,
 *   as before, e.g. `$.a=replace:/x/path/ $.b=1/`, so other expressions may follow it only otherwise.
 *   None of them is applied if one of them is invalid, while an error of applying one of them,
 *   e.g. of a getter of the page, does not stop the other ones.
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
 *   `+=` merges a value into the matched node as uBO does, in place: an array gets the value, or the items
 *   of an array value, e.g. `$.list+=[{"id":2}]`, and an object gets the properties of an object value,
 *   e.g. `$.config+={"ads":false}`, while nothing is changed if the node or the value is not an object or an array,
 *   e.g. a text. `++=` is `+=` of previous versions, which puts a new merged array or object instead,
 *   joins texts, e.g. `$.title++=!`, and replaces other values, so rules which rely on it should use `++=`.
 *   Values of JSONPath expressions may also be `repl({"regex":"...","flags":"...","replacement":"..."})`
 *   or `repl({"pattern":"...","replacement":"..."})`, which replace a part of a string value,
 *   and `call([object, method, ...arguments])`, which calls a method for each matched node,
 *   in which `"${obj}"`, `"${key}"` and `"${val}"` are its owner, key and value, `null` is `window`,
 *   and the method may be a path from the object, e.g. `[null,"player.ads.stop","${val}"]`.
 * - `argumentValue` — required, value to write at the target path.
 *   Supports the same constants, `json:{...}`, and `replace:/regex/replacement/` syntax
 *   as `trusted-json-set`, including `$now$`, `$currentDate$`, and `$currentISODate$` time keywords
 *   which may be used in any part of the value, e.g. `json:{"count":1,"firstTime":$now$}`.
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
 * ### uBO syntax
 *
 * uBO rules of `trusted-json-edit-fetch-response` are supported with uBO arguments,
 * e.g. `example.org##+js(trusted-json-edit-fetch-response, .adShowPreload=false, propsToMatch, /getPreloaderInfo)`:
 *
 * ```text
 * example.org##+js(trusted-json-edit-fetch-response, jsonq[, ...options])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `jsonq` — one JSONPath expression, which is not split by spaces, as uBO ignores them, e.g. `.a $.b` is one
 *   expression; an expression without its own value removes what it matches, e.g. `.preroll.ad`;
 *   a rule with an empty expression is not applied
 * - a value after `=`, `+=` or `++=` is JSON, as in uBO, e.g. `="hidden"` is the text `hidden`, and the first
 *   `${now}` in a text which `=` sets is replaced by the current time, e.g. `.ts="${now}"`, while `++=` appends it
 *   as it is; a rule with a value which is not JSON, e.g. `=hidden` or `=emptyObj`, or with an invalid
 *   `repl({...})` or `call([...])`, is not applied, which is logged once, also without the keywords of the AdGuard
 *   syntax, e.g. `$now$`;
 *   `repl({...})`, `call([...])` and `$remove$` are read as in the AdGuard syntax
 * - options are pairs of a name and a value which follow `jsonq`:
 *     - `propsToMatch, value` — properties of the request, which are matched as by uBO: they are separated
 *       by whitespaces, a property without a name is matched against the URL, a value which starts with `!`
 *       must not match, e.g. `url:!private`, and a property which the request does not have is ignored;
 *       a rule with an invalid regular expression is not applied; only the properties which it names are read,
 *       each once, before native `fetch` reads them, so a getter of the page which returns another value
 *       on each read, e.g. of `body`, may give `fetch` another value than the matched one, while uBO calls `fetch`
 *       first, so only the value which it matches may differ
 * - the original response is returned if the expression changes nothing, so its text is not serialized again,
 *   e.g. a number which JSON cannot represent exactly, and a response which is not one JSON document,
 *   e.g. of line-delimited JSON, is not modified
 * - other options and arguments are ignored, as in uBO, e.g. a value without its name,
 *   so `example.org##+js(trusted-json-edit-fetch-response, .ads=false, /api)` modifies every response
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
 * 1. Removes `ads` and ` (Ad)` from each `title` in the responses of requests whose URL contains `api/feed`,
 *    by two expressions of one rule in `JSONPath` mode, with the values `$remove$` and `repl({...})`;
 *    see `trusted-json-set` for more examples of JSONPath expressions, which are the same here
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', '$.ads=$remove$ $..title=repl({"pattern":" (Ad)","replacement":""})', '', '', 'api/feed')
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
 *     { "items": [{ "url": "https://ads.example.org/1", "title": "Ad" }, { "url": "https://example.org/2", "title": "News" }] }
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
    ...extraArgs: string[]
) {
    // !IMPORTANT: Do not move constants outside of this function
    const UBO_JSON_EDIT_NAME_PREFIX = 'ubo-trusted-json-edit';
    const REMOVE_VALUE = '$remove$';
    // Property of a pattern of uBO `propsToMatch` without a name
    const UBO_IMPLICIT_PROP = 'url';

    // Rules with uBO names of `trusted-json-edit-fetch-response` have uBO arguments, i.e. a query followed by named
    // options, of which `propsToMatch` is supported, which are read into the positional arguments of AdGuard syntax,
    // so they are processed by the same implementation: the query is not split, and it removes the nodes it matches
    // if it has no value of its own, as in uBO. Other arguments are not read by their position then, e.g. `stack`
    const isUboJsonEdit = typeof source.name === 'string' && source.name.startsWith(UBO_JSON_EDIT_NAME_PREFIX);
    let uboNeedles: Record<string, UboPropNeedle> | null = null;
    if (isUboJsonEdit) {
        const uboArguments = getUboJsonEditArguments([
            propsPath,
            argumentValue,
            requiredInitialProps,
            propsToMatch,
            stack,
            mode,
            verbose,
        ].concat(extraArgs));
        // uBO does not apply a rule with an empty query
        if (uboArguments.query === '') {
            logMessage(source, 'Bad JSONPath query');
            return;
        }
        // `propsToMatch` is matched as by uBO, e.g. `!` negates a pattern, see `parseUboPropsToMatch()`
        uboNeedles = parseUboPropsToMatch(uboArguments.options.propsToMatch, UBO_IMPLICIT_PROP);
        if (uboNeedles === null) {
            logMessage(source, `Invalid propsToMatch: ${uboArguments.options.propsToMatch}`);
            return;
        }
        propsPath = uboArguments.query;
        argumentValue = REMOVE_VALUE;
        requiredInitialProps = '';
        propsToMatch = '';
        stack = '';
        mode = 'jsonpath';
        verbose = '';
    }
    // Saved when the rule runs, as the page or another rule may replace `RegExp.prototype.test` later
    const testRegexp = getRegexpTester();

    const syntaxModeDetails = resolveJsonSyntaxMode(propsPath, mode);
    // Queries are built after `propsPath` is split, so `argumentValue` is never split,
    // while the query of a uBO rule is not split, as uBO ignores spaces in it, e.g. `.a $.b` is one query
    let jsonPathQueries: string[] = [];
    if (syntaxModeDetails.mode === 'jsonpath') {
        jsonPathQueries = isUboJsonEdit
            ? [buildJsonPathExpression(propsPath, argumentValue)]
            : buildJsonPathQueries(propsPath, argumentValue);
    }
    // Queries are parsed once, not for each processed value
    const jsonPathCache: JsonPathCache = Object.create(null);

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

    if (syntaxModeDetails.mode === 'jsonpath' && jsonPathQueries.length === 0) {
        logMessage(source, 'JSONPath mode requires argumentValue for an expression of propsPath without its own value');
        return;
    }

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression, so such rule is not applied,
    // which is logged once, instead of on each request
    if (stack && !isValidStrPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
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

    // Whether the last call of `applyJsonMutation()` has modified the value, in JSONPath mode,
    // as uBO rules return the original response if their query matches nothing
    let isJsonModified = false;

    // Stack trace is not passed to the helpers, as it is already matched by `fetchHandlerWrapper()`
    // when `fetch()` is called, and the response is modified after it is awaited
    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        isJsonModified = false;
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(
                source,
                jsonValue,
                jsonPathQueries,
                nativeObjects,
                () => {
                    isJsonModified = true;
                    hit(source);
                },
                '',
                false,
                jsonPathCache,
            );
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

    // TODO: Consider to move it to helper and share it with json-prune-fetch-response scriptlet
    const fetchHandlerWrapper = async (
        target: typeof fetch,
        thisArg: any,
        args: [FetchResource, RequestInit],
    ): Promise<Response> => {
        // Data of the call, which AdGuard `propsToMatch` and the logs need, is collected only then, in `try`,
        // as cloning a `Request` throws if its body is used, e.g. of a retry of a request with another body,
        // which should reach the network as it is, also if the rule does not match it
        let fetchData: ReturnType<typeof getFetchData> | null = null;
        const describeFetchCall = (): string => {
            try {
                return objectToString(fetchData || getFetchData(args, nativeObjects.nativeRequestClone));
            } catch {
                return '';
            }
        };

        if (isUboJsonEdit) {
            // The properties of the call are collected as by uBO, and an error of a method of the page
            // which they are read by, e.g. a getter of the options, does not reach the page
            // A rule without `propsToMatch` matches every request without reading it, as in uBO, and other rules
            // read only the properties which they match, each once, see `collateUboFetchArguments()`
            const needles = uboNeedles as Record<string, UboPropNeedle>;
            const neededProps = Object.keys(needles);
            let isUboRequestMatched = neededProps.length === 0;
            try {
                isUboRequestMatched = isUboRequestMatched || matchUboProps(
                    needles,
                    collateUboFetchArguments(args[0], args[1], nativeObjects.nativeRequestClone, neededProps),
                    testRegexp,
                );
            } catch (error) {
                logMessage(source, `Request cannot be matched: ${getThrownValueMessage(error)}`);
            }
            if (!isUboRequestMatched) {
                return Reflect.apply(target, thisArg, args);
            }
        } else if (propsToMatch !== '' && propsToMatch !== '*') {
            // Without properties to match, every request is matched, as by `matchRequestProps()`, so its data is not
            // collected, which would throw for a request whose body is used, e.g. of a retry with another body
            try {
                fetchData = getFetchData(args, nativeObjects.nativeRequestClone);
            } catch (error) {
                logMessage(source, `Request cannot be matched: ${getThrownValueMessage(error)}`);
                return Reflect.apply(target, thisArg, args);
            }
            if (!matchRequestProps(source, propsToMatch, fetchData)) {
                return Reflect.apply(target, thisArg, args);
            }
        }

        // Stack trace is read only if it is matched or logged, before the response is awaited,
        // so it has the caller of `fetch()`, which is no longer in the stack after that,
        // e.g. a function which returns the promise of `fetch()`.
        // The page may make creating or reading it throw, e.g. by replacing `Error` or by `Error.prepareStackTrace`,
        // which should not stop the rules without `stack` from working, so it is done separately
        let stackTrace = '';
        let isStackTraceRead = false;
        if (stack || shouldLogContent) {
            try {
                stackTrace = String(new Error().stack || '');
                isStackTraceRead = true;
            } catch {
                // Rules with `stack` are not applied, as it cannot be matched, and it is not logged
            }
        }

        // Error message line is added to the stack trace created here, in the wrapper called by the page,
        // as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
        if (stack && (!isStackTraceRead || !matchStackTrace(stack, addStackTraceMessageLine(stackTrace)))) {
            return Reflect.apply(target, thisArg, args);
        }

        // Request is sent once, outside of `try`, so its rejection is passed to the page as is,
        // and it is not sent again, e.g. a POST request
        const originalResponse = await Reflect.apply(nativeObjects.nativeFetch, null, args);

        // A uBO rule with an invalid query, e.g. with a value which is not JSON, is not applied, as in uBO,
        // so the response is not read for it, e.g. a streaming one, which would be held until its end.
        // Queries are checked once `fetch()` is fulfilled, not in the call of the page, see `areJsonPathQueriesValid()`
        if (isUboJsonEdit && !areJsonPathQueriesValid(source, jsonPathQueries, nativeObjects, jsonPathCache)) {
            return originalResponse;
        }

        let clonedResponse;
        try {
            clonedResponse = nativeObjects.nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not clone the response: ${describeFetchCall()}`);
            return originalResponse;
        }

        // The body of the clone is read, so the original response is returned as it is if it is not modified,
        // with the properties which another rule may have defined on it, e.g. `url` of a forged response
        let textContent;
        try {
            textContent = await clonedResponse.text();
        } catch {
            const message = `Response body can't be converted to text: ${describeFetchCall()}`;
            logMessage(source, message);
            return originalResponse;
        }

        let json;
        let isParsed = false;
        try {
            json = nativeObjects.nativeParse(textContent);
            isParsed = true;
        } catch {
            // If response body is not a single JSON document, it is processed as line-delimited JSON below
        }

        // A JSON document is not processed as line-delimited JSON if its modification throws,
        // as it would be parsed and modified again in the same way
        if (isParsed) {
            try {
                // Content which cannot be serialized to be logged, e.g. too deeply nested, is logged only
                // as an object, so the response is still modified
                if (shouldLogContent) {
                    logJsonContent(source, json, nativeObjects.nativeStringify, stackTrace, 'Original content');
                }

                const modifiedJson = applyJsonMutation(json);

                // The original response of a uBO rule whose query matches nothing is returned, as in uBO,
                // so its text, e.g. a number which JSON cannot represent exactly, is not serialized again
                if (isUboJsonEdit && !isJsonModified) {
                    return originalResponse;
                }

                if (shouldLogContent) {
                    logJsonContent(source, modifiedJson, nativeObjects.nativeStringify, stackTrace, 'Modified content');
                }

                return forgeResponse(
                    originalResponse,
                    nativeObjects.nativeStringify(modifiedJson),
                );
            } catch (error) {
                // e.g. thrown by serializing a value which is too deeply nested
                logMessage(source, `Response body can't be modified: ${getThrownValueMessage(error)}`);
                return originalResponse;
            }
        }

        // A response of a uBO rule which is not a JSON document is returned as is,
        // as uBO does not process line-delimited JSON
        if (isUboJsonEdit) {
            return originalResponse;
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
                    logMessage(source, `Original content:\n${window.location.hostname}\n${textContent}\nStack trace:\n${stackTrace}`, true);
                    // eslint-disable-next-line max-len
                    logMessage(source, `Modified content:\n${window.location.hostname}\n${lineEditResult.text}\nStack trace:\n${stackTrace}`, true);
                }

                return forgeResponse(originalResponse, lineEditResult.text);
            }

            const message = `Response body can't be converted to json: ${describeFetchCall()}`;
            logMessage(source, message);
            return originalResponse;
        } catch (error) {
            const message = `Response body can't be converted to json: ${describeFetchCall()}`;
            logMessage(source, message);
            return originalResponse;
        }
    };

    const fetchHandler = {
        apply: fetchHandlerWrapper,
        get: getFunctionProxyProperty,
    };

    window.fetch = new Proxy<typeof fetch>(window.fetch, fetchHandler);
}

export const trustedJsonSetFetchResponseNames = [
    'trusted-json-set-fetch-response',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-json-edit-fetch-response.js',
    'ubo-trusted-json-edit-fetch-response',
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
    areJsonPathQueriesValid,
    splitJsonPathQueries,
    getJsonPathQueries,
    getJsonPathRegexpEnd,
    getPrunePath,
    forgeResponse,
    isPruningNeeded,
    matchStackTrace,
    addStackTraceMessageLine,
    getFunctionProxyProperty,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    buildJsonPathQueries,
    toRegExp,
    isValidStrPattern,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
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
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    getThrownValueMessage,
    logJsonContent,
    getUboJsonEditArguments,
    parseUboOptions,
    unescapeUboArgument,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
];
