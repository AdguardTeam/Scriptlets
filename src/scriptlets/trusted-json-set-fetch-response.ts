import {
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    jsonPath,
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
 *   follow it, e.g. `$.ads=$remove$ $.premium` with `argumentValue` `true`. It is a text after `+=`,
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
 *   the children of each node, also of an object, e.g. `v2:$.config[?@==true]`.
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
) {
    const syntaxModeDetails = resolveJsonSyntaxMode(propsPath, mode);
    // Queries are built after `propsPath` is split, so `argumentValue` is never split
    const jsonPathQueries = syntaxModeDetails.mode === 'jsonpath'
        ? buildJsonPathQueries(propsPath, argumentValue)
        : [];
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

    // Stack trace is not passed to the helpers, as it is already matched by `fetchHandlerWrapper()`
    // when `fetch()` is called, and the response is modified after it is awaited
    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            return jsonPath(
                source,
                jsonValue,
                jsonPathQueries,
                nativeObjects,
                () => hit(source),
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
        const fetchData = getFetchData(args, nativeObjects.nativeRequestClone);

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

        let clonedResponse;
        try {
            clonedResponse = nativeObjects.nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not clone the response: ${fetchData.url}`);
            return originalResponse;
        }

        let textContent;
        try {
            textContent = await originalResponse.text();
        } catch {
            const message = `Response body can't be converted to text: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
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
                return clonedResponse;
            }
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

            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        } catch (error) {
            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
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
];
