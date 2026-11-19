import {
    hit,
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
    matchStackTrace,
    addStackTraceMessageLine,
    getPropertyInChain,
    getMethodOwner,
    getFunctionProxyProperty,
    getWildcardPropertyInChain,
    logMessage,
    getThrownValueMessage,
    logJsonContent,
    isPruningNeeded,
    jsonSetter,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    isNativePromise,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    extractRegexAndReplacement,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    jsonLineEdit,
    jsonPath,
    splitJsonPathQueries,
    getJsonPathQueries,
    type JsonPathCache,
    getJsonPathRegexpEnd,
    matchesJsonPath,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    buildJsonPathQueries,
    getAdgJsonTextMatch,
    getUboJsonTextMatch,
    isJsonTextMatched,
    type JsonTextMatch,
    getUboJsonEditArguments,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    isDigits,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-json-set
 *
 * @description
 * Intercepts a specified method and sets a property at the given path in the JSON value selected by `jsonSource`.
 * If the path does not exist, it is created, including any missing intermediate objects.
 * If `propsPath` is omitted, the scriptlet switches to logging-only mode and logs the original selected content.
 *
 * Depending on `jsonSource`, the scriptlet can modify:
 *
 * 1. one or more arguments;
 * 1. the intercepted method `thisArg`;
 * 1. the return value if it is an object or a JSON string;
 *    if it is a native `Promise`, e.g. of `Response.prototype.json`, the value it is fulfilled with is modified
 *    instead, and a new promise of the modified value is returned.
 *    Promises of polyfills or libraries which replace `window.Promise`, e.g. zone.js, are not supported.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-json-set', methodPath[, propsPath[, argumentValue[, requiredInitialProps[, jsonSource[, stack[, mode[, verbose[, 'matches', pattern]]]]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `methodPath` — required, chain of dot-separated properties leading to the target method,
 *   e.g. `JSON.stringify`, `JSON.parse`.
 *   The method may receive a JSON object as its first argument or return one.
 *   Rules for a method which scriptlets call themselves, e.g. `Array.isArray`, should be one rule
 *   with several JSONPath expressions, as each rule processes the calls of the method which the other rules make,
 *   so the time grows exponentially with the number of rules, e.g. 4 rules call it 16 times for one call
 *   with an array, and one rule with the same 4 expressions 5 times, while it is not called for other values
 *   which have no numeric `length`.
 * - `propsPath` — optional, dot-separated path to the property to set.
 *   If omitted, the scriptlet logs the original selected content and does not mutate it.
 *   Supports wildcards:
 *     - `*` — matches any object property key
 *     - `[]` — matches any array element index
 *   Supports value filtering: append `.[=].value` to only modify nodes where the property equals `value`.
 *   In `jsonpath` mode this may also be a full JSONPath mutation expression such as `$..*[?(@.price==8.99)].price=10`.
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
 * - `argumentValue` — required when `propsPath` is provided, the value to write at the target path.
 *   Ignored in logging-only mode.
 *   Can be one of the predefined constants:
 *     - `undefined`
 *     - `false`
 *     - `true`
 *     - `null`
 *     - `NaN`
 *     - numeric value, e.g. `42` or `-1`
 *     - `emptyObj` — empty object
 *     - `emptyArr` — empty array
 *     - `noopFunc` — function with empty body
 *     - `noopCallbackFunc` — function returning noopFunc
 *     - `trueFunc` — function returning true
 *     - `falseFunc` — function returning false
 *     - `throwFunc` — function throwing an error
 *     - `noopPromiseResolve` — function returning `Promise` resolved with an empty response
 *     - `noopPromiseReject` — function returning `Promise.reject()`
 *     - `$remove$` — in `jsonpath` mode, removes each property or array item matched by `propsPath`,
 *       or by an expression of `propsPath` whose own value it is, e.g. `$.ads=$remove$`
 *     - any other string is set as a string literal
 *
 *   Can contain time keywords which are resolved before the value is set:
 *     - `$now$` — current time in ms, e.g. `1667915146503`
 *     - `$currentDate$` — current date as string, e.g. `Tue Nov 08 2022 13:53:19 GMT+0300`
 *     - `$currentISODate$` — current date in the date time string format, e.g. `2022-11-08T13:53:19.650Z`
 *
 *   Keywords listed above can be used as a whole value or as a part of it,
 *   and more than one keyword can be used in it, e.g. `json:{"count":1,"firstTime":$now$}`.
 *   In `replace:/regex/replacement/` and `replace({...})` values
 *   keywords are resolved in the replacement only, the regexp is used as is.
 *
 *   Can also be a replacement applied to the current string value at the target path,
 *   in the format `replace:/regex/replacement/`:
 *     - `replace:/foo/bar/` — replaces the first occurrence of `foo` with `bar`
 *     - `replace:/foo/bar/g` — replaces all occurrences
 *
 *   Or `json:{...}` — parses the provided `JSON` value, can be used to apply multiple modifications at once.
 *   If the current target value is also an object, the parsed object is merged into it.
 *   In `jsonpath` mode this argument becomes optional when `propsPath` already includes
 *   an inline mutation suffix such as `=` or `+=`; it may also be set to `$remove$`
 *   to remove the nodes matched by `propsPath`.
 * - `requiredInitialProps` — optional, space-separated list of property paths.
 *   All listed paths must be present in the JSON object for the modification to occur.
 *   In logging-only mode, this argument is treated as a string, regular-expression,
 *   or JSONPath filter against the selected content, and only matching payloads are logged.
 *   In `jsonpath` mode, express such preconditions directly in `propsPath`
 *   with JSONPath guards and filters instead of using this argument.
 * - `jsonSource` — optional, where to read and modify the JSON value from. Defaults to `result`.
 *   Supported values:
 *     - `arg` — only the first argument
 *     - `arg:N` — only argument `N` using 0-based indexing, e.g. `arg:1`, or counted from the last one
 *       if it is negative, e.g. `arg:-1` for the last argument of each call
 *     - `arg:N|M|K` — only the listed arguments using 0-based indexing, e.g. `arg:0|1|3`;
 *       an argument which two indexes select, e.g. `arg:0|-1` of a call with one argument, is processed once
 *     - `args` — all arguments
 *     - `this` — `thisArg` of the intercepted method
 *     - `result` — only the return value
 *     - `all` — all arguments, `thisArg`, and the return value
 *
 *   Any of these values may be preceded by `copy` and a space, e.g. `copy arg:0`, and `copy` alone is `copy result`.
 *   A copy of the selected object or array is modified then, and passed or returned instead of it if the expression
 *   has written to it, also a value which it already has, e.g. `false` to a property which is `false`, so the object
 *   of the page is left as it is, e.g. one which the page passes to `JSON.stringify` in each request, which should be
 *   changed only in the text of one request. The copy is made by `structuredClone()` only for a value which the
 *   expression may change, so other values are not copied: in `JSONPath` mode if the expression matches it, and in
 *   legacy mode if it has `requiredInitialProps`, as a missing path is set. The expression is matched against the value
 *   of the page before it is copied, so a getter of the value is read by both, and a getter which returns another value
 *   on each read may give the copy another value than the matched one. A value which cannot be copied, e.g. an object
 *   with a function, or any value in a browser without `structuredClone()`, is not modified, which is logged.
 *   An instance of a class is copied as a plain object, as by uBO, without its prototype and private fields, also
 *   if it is in another object, so `copy` is meant for plain data, e.g. a request body: the method of a class with
 *   `copy this`, or a method which gets such a copy, may throw, e.g. on `this.#id`, or miss a method of the class,
 *   `JSON.stringify()` does not call `toJSON()` of the class for the copy, so it serializes all own properties,
 *   and `copy result` of a constructor returns a plain object instead of the constructed one.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if a regular expression is invalid it will be skipped.
 *   It is matched when the method is called, also if the value of a returned `Promise` is modified later.
 * - `mode` — optional, syntax mode selector.
 *   Supported values:
 *     - `legacy` — force the existing legacy path syntax
 *     - `jsonpath` — force JSONPath syntax and treat `propsPath` as a JSONPath selector
 *   If omitted, the scriptlet detects JSONPath automatically only for clearly JSONPath-shaped expressions,
 *   otherwise it falls back to legacy syntax.
 * - `verbose` — optional.
 *   In mutation mode, if set to `true`, the scriptlet logs the original and modified JSON content
 *   only when a write actually happens.
 *   In logging-only mode, the original content is logged even without `verbose`.
 * - `'matches', pattern` — optional, named option after the positional arguments, as in uBO `json-edit`:
 *   string or regular expression which a text of the call must match for the call to be processed,
 *   e.g. `'matches', '"adPlacements"'`. It tests the first argument of the call, e.g. the text passed to `JSON.parse`,
 *   as uBO does, while the value selected by `jsonSource`, e.g. the result of `JSON.parse`, is modified or logged,
 *   e.g. `example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads', 'false', '', 'result', '', '', '', 'matches', 'adPlacements')`.
 *   The name of the option may name another text instead, as `jsonSource` does:
 *     - `'matches arg:N'` — argument `N` using 0-based indexing, e.g. `'matches arg:1'`;
 *     - `'matches this'` — `thisArg` of the call, e.g. of a method which the page calls on a JSON text;
 *     - `'matches result'` — the return value, or the value which a returned native `Promise` is fulfilled with,
 *       e.g. of `Response.prototype.text`; only the return value is processed then, as it is known after the call.
 *   An argument or `thisArg` is tested when the method is called, before the stack trace is read, so a rule with it
 *   costs much less for other calls. A text which is not a string, e.g. an object, is not matched,
 *   so the call is not processed then. Escapes of quotes are removed from a string, as of `stack`, so a string
 *   with an escaped quote of JSON, i.e. `\"`, has to be a regular expression, e.g. `'/\\"ad\\"/'`.
 *   If it is an invalid regular expression, or the name of the option names another text, the rule is not applied.
 *
 * > [!IMPORTANT]
 * > Please note that, if `requiredInitialProps` is not specified, the scriptlet will attempt to set
 * > the value at the target path even if it does not exist, unless the path includes wildcards (`*`),
 * > array element index (`[]`), or value filters (`.[=].value`).
 *
 * A call of the method as a constructor is processed as well, e.g. `new CustomEvent('ad', options)` with `arg:1`,
 * also of a subclass of it, e.g. `class Ad extends CustomEvent {}`, which is constructed as without the rule.
 * It has no `this` before it, so `this` and `'matches this'` select nothing for it, and `all` selects
 * the arguments and the result, i.e. the constructed object, which is replaced only by an object, e.g. not by
 * `false` of `$`, as a constructor has to return one. The constructed object itself is the result, also
 * a promise, e.g. of `new Promise()` or of its subclass, whose value is not processed, unlike the value of
 * a promise which a method returns, so the page gets the constructed promise, with the methods of its class.
 *
 * > [!NOTE]
 * > A call of the method which the method itself causes is not processed, e.g. `JSON.parse()` in a reviver
 * > or `JSON.stringify()` in `toJSON()` of a serialized object, while uBO processes it. The value which
 * > such a call returns is a part of the value of the outer call though, e.g. of its result, so `$..ads` removes `ads`
 * > from an object which a reviver returns, while `$.ads` does not, and neither does any query of a text, e.g. which
 * > `JSON.stringify()` in `toJSON()` returns.
 *
 * ### uBO syntax
 *
 * uBO rules of `trusted-json-edit` are supported with uBO arguments,
 * e.g. `example.org##+js(trusted-json-edit, ..ads_audio=false)`:
 *
 * ```text
 * example.org##+js(trusted-json-edit, jsonq[, ...options])
 * ```
 *
 * They modify the result of `JSON.parse` if it is an object, as uBO does, so a string which it returns,
 * e.g. of a JSON text encoded twice, is not parsed again, and differ from the AdGuard syntax as follows:
 *
 * - `jsonq` — one JSONPath expression, which is not split by spaces, as uBO ignores them, e.g. `.a $.b` is one
 *   expression; an expression without its own value removes what it matches, e.g. `..ads`;
 *   a rule with an empty expression is not applied
 * - a value after `=`, `+=` or `++=` is JSON, as in uBO, e.g. `="hidden"` is the text `hidden`, and the first
 *   `${now}` in a text which `=` sets is replaced by the current time, e.g. `.ts="${now}"`, while `++=` appends it
 *   as it is; a rule with a value which is not JSON, e.g. `=hidden` or `=emptyObj`, or with an invalid
 *   `repl({...})` or `call([...])`, is not applied, which is logged, also without the keywords of the AdGuard
 *   syntax, e.g. `$now$`;
 *   `repl({...})`, `call([...])` and `$remove$` are read as in the AdGuard syntax
 * - filters are evaluated as by uBO: a leading filter selects the matching items of an array root,
 *   e.g. `[?.type=="ads"].visibility`, and tests an object root itself, a filter on an object tests it only
 *   if it has a key, a recursive filter, e.g. `..[?.ad]`, tests each descendant, also an array, but not the node
 *   from which it starts, `!` negates only the last step, so `[?!.x]` matches no primitive value and `[?!.x=="a"]`
 *   requires `x`, also a recursive one, for each object, e.g. `[?!..ad==true]` requires `ad` which is not `true`,
 *   and `*=` and `=/.../` convert a value which is not a string, e.g. `[?.id*="1"]` matches `12`;
 *   a rule which would remove the root, e.g. `$`, leaves it, while uBO makes it `null`, and `!` before a regular
 *   expression or a nested filter negates it, e.g. `[?!.type=/^ad/]` or `[?!.offers[?.ad]]`, while uBO ignores it
 * - options are pairs of a name and a value which follow `jsonq`:
 *     - `matches, pattern` — string or regular expression which the text passed to `JSON.parse` has to match
 * - other options and arguments are ignored, as in uBO, e.g. `stack`
 *
 * uBO rules of `trusted-edit-inbound-object` are supported with uBO arguments as well,
 * e.g. `example.org##+js(trusted-edit-inbound-object, JSON.stringify, 0, [?.attestationRequest]+={"params":"x"})`:
 *
 * ```text
 * example.org##+js(trusted-edit-inbound-object, propChain, argPos, jsonq)
 * ```
 *
 * - `propChain` — path of the intercepted method, as `methodPath`, e.g. `JSON.stringify`
 * - `argPos` — 0-based index of the argument to modify, or counted from the last one if it is negative, e.g. `-1`;
 *   a rule with another value, e.g. `a`, is not applied, which is logged
 * - `jsonq` — one JSONPath expression, read as `jsonq` of `trusted-json-edit` above; a rule with an empty one
 *   is not applied, which is logged
 *
 * They modify a copy of the argument if it is an object or an array, as uBO does, i.e. as `jsonSource`
 * `copy arg:N` of the AdGuard syntax, so the method gets the copy only if the expression has written to it,
 * and the object of the page is left as it is. As in uBO, an instance of a class is copied as a plain object,
 * see `copy` above.
 *
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Sets `ads.enabled` to `false` in the result of `JSON.parse`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'ads.enabled', 'false')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads.enabled', 'false')
 *     ```
 *
 *     For instance, the following call:
 *
 *     ```js
 *     JSON.parse('{"ads":{"enabled":true},"content":"article"}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *         "ads": { "enabled": true },
 *         "content": "article"
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *         "ads": { "enabled": false },
 *         "content": "article"
 *     }
 *     ```
 *
 * 1. Creates a new nested path `config.ads.blocked` and sets it to `true` in `JSON.stringify` input;
 *    missing intermediate objects are created automatically
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.stringify', 'config.ads.blocked', 'true')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.stringify', '$.config+={"ads":{"blocked":true}}')
 *     ```
 *
 *     For instance, the following call:
 *
 *     ```js
 *     JSON.stringify({ config: {} })
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "config": {} }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "config": { "ads": { "blocked": true } } }
 *     ```
 *
 * 1. Sets `enabled` to `false` for every element in the `items` array using the `[]` wildcard
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'items.[].enabled', 'false')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.items.*.enabled', 'false')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *         "items": [
 *             { "id": 1, "enabled": true },
 *             { "id": 2, "enabled": true }
 *         ]
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *         "items": [
 *             { "id": 1, "enabled": false },
 *             { "id": 2, "enabled": false }
 *         ]
 *     }
 *     ```
 *
 * 1. Uses the `*` wildcard and the value filter `.[=].true`
 *    to set `enabled` only for nodes where it currently equals `true`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'items.*.enabled.[=].true', 'false')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.items.*[?(@.enabled==true)].enabled', 'false')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     {
 *         "items": {
 *             "a": { "enabled": true },
 *             "b": { "enabled": 1 }
 *         }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {
 *         "items": {
 *             "a": { "enabled": false },
 *             "b": { "enabled": 1 }
 *         }
 *     }
 *     ```
 *
 * 1. Replaces part of a string value at the target path using the `replace:` syntax
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'content', 'replace:/advertisement/article/')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.content=replace({"regex":"advertisement","replacement":"article"})')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "content": "The advertisement block" }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "content": "The article block" }
 *     ```
 *
 * 1. Merges a parsed JSON object into the existing target object using the `json:` marker
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "foo": { "a": { "old": 0 }, "c": 3 } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "foo": { "a": { "test": 1 }, "c": 3, "b": { "c": 1 } } }
 *     ```
 *
 * 1. Only modifies the JSON object if `tracking.enabled` property is present
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'tracking.enabled', 'false', 'tracking.enabled', 'result')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '[?(@.tracking.enabled)]$.tracking.enabled', 'false', '', 'result')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "tracking": { "enabled": true }, "meta": { "v": 1 } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "tracking": { "enabled": false }, "meta": { "v": 1 } }
 *     ```
 *
 * 1. Logs the original `JSON.parse` result without modifying it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse')
 *     ```
 *
 * 1. Logs only `JSON.parse` results containing a specific string
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '', '', '"id":"117458"')
 *     ```
 *
 * 1. Logs only `JSON.parse` results matching a JSONPath selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '', '', '$.tracking.enabled')
 *     ```
 *
 * 1. Removes `ads.enabled` from the parsed object in `JSONPath` mode
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads', '$remove$')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "ads": { "enabled": true, "type": "banner" }, "content": "article" }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "content": "article" }
 *     ```
 *
 * 1. Removes `ads` and sets each `banner` to `false` by one rule in `JSONPath` mode
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads=$remove$ $..banner=false')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "ads": [1, 2], "banner": true, "page": { "banner": true, "title": "News" } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "banner": false, "page": { "banner": false, "title": "News" } }
 *     ```
 *
 * 1. Removes `Sponsored: ` from the start of each `title`, in any case, by `repl({...})`, which replaces a part
 *    of a string value by a regular expression `regex` with `flags`, and does not change other values
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.items.*.title=repl({"regex":"^sponsored: ","flags":"i","replacement":""})')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "items": [{ "title": "Sponsored: Shoes" }, { "title": "SPONSORED: Bags" }, { "title": "News" }] }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "items": [{ "title": "Shoes" }, { "title": "Bags" }, { "title": "News" }] }
 *     ```
 *
 * 1. Removes ` (Ad)` from each `title` at any depth, by `repl({...})` with a text in `pattern`, in which
 *    no character is special, while a value which is not a string, e.g. a number, is not changed
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$..title=repl({"pattern":" (Ad)","replacement":""})')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "a": { "title": "News (Ad)" }, "b": { "title": "Weather" }, "c": { "title": 3 } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "a": { "title": "News" }, "b": { "title": "Weather" }, "c": { "title": 3 } }
 *     ```
 *
 * 1. Removes the first item of each `playlist`, e.g. a preroll, by `call([...])`, which calls a method for each
 *    matched node instead of setting a value, here `splice(0, 1)` of the node, `"${val}"`, while `"${obj}"`
 *    and `"${key}"` are its owner and key, and `null` instead of an object is `window`,
 *    e.g. `call([null,"player.ads.stop","${val}"])` calls `window.player.ads.stop()` with the node
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$..playlist=call(["${val}","splice",0,1])')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "a": { "playlist": ["ad", "video1"] }, "b": { "playlist": ["ad", "video2"] } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "a": { "playlist": ["video1"] }, "b": { "playlist": ["video2"] } }
 *     ```
 *
 * 1. Sets `shouldShow` to `false` in each store whose key starts with `interstitial_`, by a regular expression
 *    of keys after a dot, as in the uBO rule
 *    `www.nytimes.com##+js(trusted-json-edit-fetch-response, v2:$.param_stores.*./^interstitial_/.value.shouldShow=false, propsToMatch, /statsig/initialize?)`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.param_stores.*./^interstitial_/.value.shouldShow=false')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "param_stores": { "store": { "interstitial_a": { "value": { "shouldShow": true } }, "banner": { "value": { "shouldShow": true } } } } }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "param_stores": { "store": { "interstitial_a": { "value": { "shouldShow": false } }, "banner": { "value": { "shouldShow": true } } } } }
 *     ```
 *
 * 1. Sets `ads` and `banner` to `false` by one rule in `JSONPath` mode if `title` matches a regular expression
 *    with a quote; each expression has its own guard, as a guard applies only to the expression it precedes,
 *    and the quote is written as `\x27`, as a raw quote, e.g. `/it's/`, would make the whole argument
 *    one expression, which sets neither property
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '[?(@.title=/it\x27s/)]$.ads=false [?(@.title=/it\x27s/)]$.banner=false')
 *     ```
 *
 *     or one expression with both properties, in which the quote may be raw:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '[?(@.title=/it\'s/)]$["ads","banner"]=false')
 *     ```
 *
 *     Input JSON:
 *
 *     ```json
 *     { "title": "it's an ad", "ads": true, "banner": true }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     { "title": "it's an ad", "ads": false, "banner": false }
 *     ```
 *
 *     With another title, e.g. `{ "title": "News", "ads": true, "banner": true }`, neither property is set.
 *
 * 1. Modifies the first argument before the target method is called
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', 'ads.enabled', 'false', '', 'arg:0')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', '$.ads.enabled', 'false', '', 'arg:0')
 *     ```
 *
 * 1. Modifies selected arguments before the target method is called
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', 'ads.enabled', 'false', '', 'arg:0|2')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', '$.ads.enabled', 'false', '', 'arg:0|2')
 *     ```
 *
 * 1. Sets `screen` only in the text of a request which `JSON.stringify` serializes, if it has `attestationRequest`,
 *    and not in the object which the page passes to it, which is modified as a copy
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.stringify', '[?(@.attestationRequest)]$.context+=json:{"screen":"ADUNIT"}', '', '', 'copy arg:0')
 *     ```
 *
 *     For instance, the following call:
 *
 *     ```js
 *     const request = { context: { client: 'WEB' }, attestationRequest: {} };
 *     JSON.stringify(request);
 *     ```
 *
 *     Output:
 *
 *     ```js
 *     '{"context":{"client":"WEB","screen":"ADUNIT"},"attestationRequest":{}}'
 *     ```
 *
 *     while `request.context` has no `screen`, so a request which the page sends with the same context later,
 *     e.g. without `attestationRequest`, does not have it either.
 *
 * 1. Only applies when the call originates from a script matching the `adManager` stack trace
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'ads.enabled', 'false', '', 'result', 'adManager')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', '$.ads.enabled', 'false', '', 'result', 'adManager')
 *     ```
 *
 *     Input:
 *
 *     ```js
 *     function adManager() {
 *         return JSON.parse('{"ads":{"enabled":true},"content":"article"}');
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```js
 *     { ads: { enabled: false }, content: 'article' }
 *     ```
 *
 * 1. Sets `ads.enabled` to `false` in the value which the `Promise` returned by `Response.prototype.json` is fulfilled with
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'Response.prototype.json', 'ads.enabled', 'false')
 *     ```
 *
 *     or `JSONPath` syntax:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'Response.prototype.json', '$.ads.enabled', 'false')
 *     ```
 *
 *     For instance, the following call:
 *
 *     ```js
 *     const data = await new Response('{"ads":{"enabled":true},"content":"article"}').json();
 *     ```
 *
 *     Output:
 *
 *     ```js
 *     { ads: { enabled: false }, content: 'article' }
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v2.3.0.
 */
/* eslint-enable max-len */
export function trustedJsonSet(
    source: Source,
    methodPath: string,
    propsPath: string,
    argumentValue: any,
    requiredInitialProps: string,
    jsonSource?: string,
    stack = '',
    mode = '',
    verbose = '',
    ...extraArgs: string[]
) {
    // !IMPORTANT: Do not move constants outside of this function
    const UBO_JSON_EDIT_NAME_PREFIX = 'ubo-trusted-json-edit';
    const UBO_EDIT_INBOUND_OBJECT_NAME_PREFIX = 'ubo-trusted-edit-inbound-object';
    const REMOVE_VALUE = '$remove$';
    // Modifier of `jsonSource`, e.g. `copy arg:0`, by which a copy of the value is modified and used instead of it
    const COPY_MODIFIER = 'copy';

    // Rules with uBO names of `trusted-json-edit` have uBO arguments, i.e. a query followed by named options,
    // of which `matches` is supported, which are read into the positional arguments of AdGuard syntax,
    // so they are processed by the same implementation: the result of `JSON.parse()` is modified by the query,
    // which is not split, and which removes the nodes it matches if it has no value of its own, as in uBO.
    // Other arguments are not read by their position then, e.g. `stack`, and `jsonSource` has no default value
    // in the signature, as it would be read as a value of an option otherwise
    const isUboJsonEdit = typeof source.name === 'string' && source.name.startsWith(UBO_JSON_EDIT_NAME_PREFIX);
    // Rules with uBO names of `trusted-edit-inbound-object` have its uBO arguments, i.e. the method, the position
    // of its argument and a query, e.g. `JSON.stringify, 0, [?.ads].params="x"`, which are read into the positional
    // arguments as well: a copy of the argument at the position is modified, as uBO does, see `copy`, so the object
    // of the page is not changed, and a negative position counts from the end, e.g. `-1` is the last argument
    const isUboEditInboundObject = typeof source.name === 'string'
        && source.name.startsWith(UBO_EDIT_INBOUND_OBJECT_NAME_PREFIX);
    // Both have the uBO meaning of their queries and values, e.g. a value is JSON, and modify only objects
    const isUboDialect = isUboJsonEdit || isUboEditInboundObject;
    let textMatch: JsonTextMatch;
    if (isUboEditInboundObject) {
        // The converters escape each `'` of a uBO argument, see `unescapeUboArgument()`
        const propChain = unescapeUboArgument(methodPath);
        const argPos = unescapeUboArgument(propsPath);
        const jsonq = unescapeUboArgument(argumentValue);
        if (typeof propChain !== 'string' || typeof argPos !== 'string' || typeof jsonq !== 'string') {
            return;
        }
        // uBO does not apply a rule without the method or with a position which is not an integer,
        // and logs a rule with an empty query, which is invalid
        if (!propChain) {
            return;
        }
        if (jsonq === '') {
            logMessage(source, 'Bad JSONPath query');
            return;
        }
        const position = argPos.trim();
        if (!isDigits(position.startsWith('-') ? position.slice(1) : position)) {
            logMessage(source, `Invalid position of the argument: ${argPos}`);
            return;
        }
        textMatch = getUboJsonTextMatch('');
        methodPath = propChain;
        propsPath = jsonq;
        argumentValue = REMOVE_VALUE;
        requiredInitialProps = '';
        jsonSource = `${COPY_MODIFIER} arg:${position}`;
        stack = '';
        mode = 'jsonpath';
        verbose = '';
    } else if (isUboJsonEdit) {
        const uboArguments = getUboJsonEditArguments([
            methodPath,
            propsPath,
            argumentValue,
            requiredInitialProps,
            jsonSource,
            stack,
            mode,
            verbose,
        ].concat(extraArgs));
        // uBO does not apply a rule with an empty query
        if (uboArguments.query === '') {
            logMessage(source, 'Bad JSONPath query');
            return;
        }
        textMatch = getUboJsonTextMatch(uboArguments.options.matches);
        methodPath = 'JSON.parse';
        propsPath = uboArguments.query;
        argumentValue = REMOVE_VALUE;
        requiredInitialProps = '';
        jsonSource = 'result';
        stack = '';
        mode = 'jsonpath';
        verbose = '';
    } else {
        textMatch = getAdgJsonTextMatch(extraArgs, true);
    }
    // `copy` before a source, e.g. `copy arg:0`, `copy this` or `copy result`, or alone for the result,
    // modifies a copy of the value, which is used instead of it, e.g. passed to the method, so the object
    // of the page is not changed, see `copyValue()`
    let jsonSourceValue = typeof jsonSource === 'string' ? jsonSource.trim() : 'result';
    const isCopyModified = jsonSourceValue === COPY_MODIFIER || jsonSourceValue.startsWith(`${COPY_MODIFIER} `);
    if (isCopyModified) {
        jsonSourceValue = jsonSourceValue.slice(COPY_MODIFIER.length).trim() || 'result';
    }

    const isLogOnlyMode = !propsPath;
    const shouldLogVerboseContent = verbose === 'true' && !isLogOnlyMode;
    const syntaxModeDetails = isLogOnlyMode
        ? { mode: 'legacy' as const }
        : resolveJsonSyntaxMode(propsPath, mode);
    // Queries are built after `propsPath` is split, so `argumentValue` is never split,
    // while the query of a uBO rule is not split, as uBO ignores spaces in it, e.g. `.a $.b` is one query
    let jsonPathQueries: string[] = [];
    if (!isLogOnlyMode && syntaxModeDetails.mode === 'jsonpath') {
        jsonPathQueries = isUboDialect
            ? [buildJsonPathExpression(propsPath, argumentValue)]
            : buildJsonPathQueries(propsPath, argumentValue);
    }
    // Queries are parsed once, not for each processed value
    const jsonPathCache: JsonPathCache = Object.create(null);

    if (!methodPath) {
        return;
    }

    // An invalid pattern would match no text, so such rule is not applied
    if (!textMatch.isValid) {
        logMessage(source, `Invalid matches: ${textMatch.pattern}`);
        return;
    }
    // Saved when the rule runs, as the page or another rule may replace `RegExp.prototype.test` later
    const testRegexp = getRegexpTester();

    if (!isLogOnlyMode && syntaxModeDetails.mode === 'legacy' && argumentValue === undefined) {
        return;
    }

    if (!isLogOnlyMode && syntaxModeDetails.mode === 'jsonpath' && jsonPathQueries.length === 0) {
        logMessage(source, 'JSONPath mode requires argumentValue for an expression of propsPath without its own value');
        return;
    }

    const isStructuredCloneSupported = typeof structuredClone === 'function';

    const nativeObjects = {
        nativeStringify: window.JSON.stringify,
        nativeParse: window.JSON.parse,
    };

    /**
     * Creates the console message for an object snapshot log entry.
     *
     * Uses `structuredClone()` when available and falls back to JSON
     * serialization so original-content logging can be deferred until after a
     * confirmed mutation.
     *
     * @param label log prefix describing the cloned payload
     * @param value candidate value to clone for debug logging
     * @returns message passed to `logMessage()` without string conversion
     */
    const createClonedObjectLogMessage = (label: string, value: unknown): [string, unknown] => {
        if (isStructuredCloneSupported) {
            try {
                return [label, structuredClone(value)];
            } catch (error) {
                try {
                    return [label, nativeObjects.nativeParse(nativeObjects.nativeStringify(value))];
                } catch {
                    // eslint-disable-next-line max-len
                    return [`Could not clone content of ${methodPath} (original and modified objects are the same): ${getThrownValueMessage(error)}\n`, value];
                }
            }
        }

        try {
            return [label, nativeObjects.nativeParse(nativeObjects.nativeStringify(value))];
        } catch {
            // eslint-disable-next-line max-len
            return [`Structured cloning is not supported (original and modified objects are the same) for ${label}\n`, value];
        }
    };

    /**
     * Logs a structured-cloned snapshot of a value when cloning is supported.
     * Falls back to logging the original value when cloning is not possible.
     *
     * @param label log prefix describing the cloned payload
     * @param value candidate value to clone for debug logging
     */
    const logClonedObject = (label: string, value: unknown) => {
        const message = createClonedObjectLogMessage(label, value);
        logMessage(source, message, true, false);
    };

    /**
     * Builds the log label for original or modified string/object content.
     *
     * @param kind whether the logged payload is stringified text or an object snapshot
     * @param isModified whether the label should describe modified content
     * @returns formatted log label prefix
     */
    const createContentLabel = (
        kind: 'string' | 'object',
        isModified = false,
    ) => {
        const prefix = isModified ? 'Modified' : 'Original';
        let details = '';

        if (propsPath) {
            details = ` (propsPath: ${propsPath}, argumentValue: ${argumentValue})`;
        } else if (isLogOnlyMode && requiredInitialProps) {
            details = ` (requiredInitialProps: ${requiredInitialProps})`;
        }

        return `${prefix} content ${kind} of ${methodPath}${details}:\n`;
    };

    /**
     * Logs a string payload together with hostname and stack trace context.
     *
     * @param content serialized payload to log
     * @param stackTrace stack trace captured for the current interception
     * @param isModified whether the payload represents post-mutation content
     */
    const logStringContent = (
        content: string,
        stackTrace: string,
        isModified = false,
    ) => {
        const logEntry = [
            createContentLabel('string', isModified),
            window.location.hostname,
            content,
            'Stack trace:',
            stackTrace,
        ].join('\n');

        logMessage(
            source,
            logEntry,
            true,
        );
    };

    /**
     * Serializes a structured payload to be logged as a prettified JSON string.
     *
     * The payload may not be serializable, e.g. a value which is too deeply nested, or one whose `toJSON()`
     * of the page throws. It is logged only as an object snapshot then, as an error of logging it
     * should not stop its modification.
     *
     * @param value structured payload to serialize
     * @returns prettified JSON content, or the reason why it cannot be serialized
     */
    const stringifyStructuredContent = (value: unknown) => {
        try {
            return nativeObjects.nativeStringify(value, null, 2);
        } catch (error) {
            return `Content cannot be serialized: ${getThrownValueMessage(error)}`;
        }
    };

    /**
     * Logs the original structured payload as both a prettified JSON string and an object snapshot.
     *
     * @param value original object payload before any mutation attempt
     * @param stackTrace stack trace captured for the current interception
     */
    const logOriginalStructuredContent = (value: unknown, stackTrace: string) => {
        logStringContent(stringifyStructuredContent(value), stackTrace);
        logClonedObject(createContentLabel('object'), value);
    };

    /**
     * Logs the modified structured payload as both a prettified JSON string and an object snapshot.
     *
     * @param value mutated object payload after a successful change
     * @param stackTrace stack trace captured for the current interception
     */
    const logModifiedStructuredContent = (value: unknown, stackTrace: string) => {
        logStringContent(stringifyStructuredContent(value), stackTrace, true);
        const message = [createContentLabel('object', true), value];
        logMessage(source, message, true, false);
    };

    /**
     * Captures the original structured payload so verbose logs can be emitted
     * only after a mutation is confirmed.
     *
     * @param value original object payload before mutation
     * @returns deferred original-content log snapshot
     */
    const captureOriginalStructuredContent = (value: unknown) => {
        return {
            objectLogMessage: createClonedObjectLogMessage(createContentLabel('object'), value),
            stringContent: stringifyStructuredContent(value),
        };
    };

    /**
     * Emits a previously captured original structured payload snapshot.
     *
     * @param snapshot deferred original-content log snapshot
     * @param snapshot.objectLogMessage tuple passed to `logMessage()` for the object snapshot
     * @param snapshot.stringContent prettified original JSON content
     * @param stackTrace stack trace captured for the current interception
     */
    const logCapturedOriginalStructuredContent = (
        snapshot: {
            objectLogMessage: [string, unknown];
            stringContent: string;
        },
        stackTrace: string,
    ) => {
        logStringContent(snapshot.stringContent, stackTrace);
        logMessage(source, snapshot.objectLogMessage, true, false);
    };

    const JSON_SOURCES = {
        ARG: 'arg',
        ARGS: 'args',
        THIS: 'this',
        RESULT: 'result',
        ALL: 'all',
    };

    let parsedArgumentValue: NonNullable<ReturnType<typeof parseJsonSetArgumentValue>> | undefined;
    if (!isLogOnlyMode && syntaxModeDetails.mode === 'legacy') {
        const parsedLegacyArgumentValue = parseJsonSetArgumentValue(
            source,
            argumentValue,
            nativeObjects.nativeParse,
        );
        if (!parsedLegacyArgumentValue) {
            return;
        }
        parsedArgumentValue = parsedLegacyArgumentValue;
    }

    // Value which is used for all the nodes matched in the intercepted payload.
    // Time keywords in it are resolved before every payload is mutated
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    let resolvedArgumentValue = parsedArgumentValue;

    const getPathParts = getPropertyInChain as unknown as (base: Window, chain: string) => {
        base: Record<string, unknown>;
        prop: string;
        chain?: string;
    };

    const { base, chain, prop } = getPathParts(window, methodPath);

    if (typeof chain !== 'undefined') {
        logMessage(source, `Could not reach the end of the prop chain: ${methodPath}`);
        return;
    }

    // Method of a storage is replaced in `Storage.prototype`, so only its calls on `base` are processed
    const methodOwner = getMethodOwner(base, prop);
    const nativeMethod = methodOwner[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    /**
     * Checks whether a value of `jsonSource` is `arg:` followed by indexes separated by `|`, each of them digits
     * with an optional `-`, e.g. `arg:0|-1`. Characters are compared by operators, not by a regular expression,
     * as `RegExp.prototype.test` may be an accessor of another rule which throws while the rule runs,
     * e.g. of `abort-current-inline-script`, and every uBO rule of `trusted-edit-inbound-object` has such a value.
     *
     * @param value trimmed value of `jsonSource`, without `copy`
     * @returns true if the value selects arguments by their indexes
     */
    const isArgumentIndexesValue = (value: string): boolean => {
        const ARG_PREFIX = 'arg:';
        if (!value.startsWith(ARG_PREFIX)) {
            return false;
        }
        let hasDigits = false;
        let isIndexStart = true;
        for (let i = ARG_PREFIX.length; i < value.length; i += 1) {
            const char = value[i];
            if (char === '|') {
                if (!hasDigits) {
                    return false;
                }
                hasDigits = false;
                isIndexStart = true;
            } else if (char === '-' && isIndexStart) {
                isIndexStart = false;
            } else if (char >= '0' && char <= '9') {
                hasDigits = true;
                isIndexStart = false;
            } else {
                return false;
            }
        }
        return hasDigits;
    };

    /**
     * Normalizes supported `jsonSource` aliases and validates the selected source.
     * Falls back to `result` for unsupported values.
     *
     * @returns normalized json source value
     */
    const normalizeJsonSource = () => {
        if (jsonSourceValue === 'argument') {
            return JSON_SOURCES.ARG;
        }
        if (jsonSourceValue === 'arguments') {
            return JSON_SOURCES.ARGS;
        }
        if (jsonSourceValue === 'thisArg') {
            return JSON_SOURCES.THIS;
        }
        if (
            jsonSourceValue === JSON_SOURCES.ARG
            || jsonSourceValue === JSON_SOURCES.ARGS
            || jsonSourceValue === JSON_SOURCES.THIS
            || jsonSourceValue === JSON_SOURCES.RESULT
            || jsonSourceValue === JSON_SOURCES.ALL
        ) {
            return jsonSourceValue;
        }
        if (isArgumentIndexesValue(jsonSourceValue)) {
            return jsonSourceValue;
        }
        return JSON_SOURCES.RESULT;
    };

    const parsedSetPaths = syntaxModeDetails.mode === 'legacy' ? getPrunePath(propsPath) : [];
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = !isLogOnlyMode && syntaxModeDetails.mode === 'legacy'
        ? getPrunePath(requiredInitialProps)
        : [];
    const logOnlyRequiredInitialPropsSyntax = isLogOnlyMode
        ? resolveJsonSyntaxMode(requiredInitialProps, undefined)
        : { mode: 'legacy' as const };
    const logOnlyRequiredPaths = isLogOnlyMode && logOnlyRequiredInitialPropsSyntax.mode === 'legacy'
        ? getPrunePath(requiredInitialProps)
        : [];
    const normalizedJsonSource = normalizeJsonSource();
    const logOnlyJsonPathFilter = isLogOnlyMode && logOnlyRequiredInitialPropsSyntax.mode === 'jsonpath'
        ? requiredInitialProps
        : '';
    const logOnlyMatchPattern = isLogOnlyMode
        ? logOnlyRequiredPaths.map((obj) => obj.path).join('')
        : '';

    /**
     * Returns the 0-based indexes of `arg` and `arg:N|M` jsonSource values, which are parsed once,
     * as the method may be called very often, e.g. `Array.isArray()`.
     *
     * @returns unique indexes of the arguments, in the order of the rule
     */
    const parseArgumentIndexes = () => {
        if (normalizedJsonSource === JSON_SOURCES.ARG) {
            return [0];
        }

        const indexes: number[] = [];
        if (normalizedJsonSource.startsWith('arg:')) {
            const rawIndexes = normalizedJsonSource.slice(4).split('|');
            for (let i = 0; i < rawIndexes.length; i += 1) {
                // A negative index counts from the end, e.g. `-1` is the last argument, see `resolveArgumentIndex()`
                const parsedIndex = parseFloat(rawIndexes[i]);
                if (!nativeIsNaN(parsedIndex) && !indexes.includes(parsedIndex)) {
                    indexes.push(parsedIndex);
                }
            }
        }

        return indexes;
    };

    const argumentIndexes = parseArgumentIndexes();
    let hasNegativeArgumentIndex = false;
    for (let i = 0; i < argumentIndexes.length; i += 1) {
        if (argumentIndexes[i] < 0) {
            hasNegativeArgumentIndex = true;
        }
    }

    /**
     * Resolves the value to write for legacy-mode mutations.
     *
     * `parsedArgumentValue` is only populated in legacy mode. In `jsonpath` mode,
     * this helper should never be used, so it defensively returns the current
     * value unchanged when no parsed argument is available.
     *
     * Value with time keywords is resolved by `resolveJsonSetTimeKeywords()` before the mutation,
     * so the time is not frozen at the moment of the scriptlet run.
     *
     * @param currentValue current value at the matched path
     * @returns value that should be written back to the matched path
     */
    const getValueToSet = (currentValue: any): any => {
        if (resolvedArgumentValue === undefined) {
            // In non-legacy modes this function should not be called; defensively return the original value.
            return currentValue;
        }

        return getJsonSetValue(
            currentValue,
            resolvedArgumentValue,
        );
    };

    /**
     * Applies the configured mutation to a JSON-compatible object value.
     *
     * Uses `jsonPath` for `jsonpath` mode and falls back to the legacy
     * `jsonSetter` implementation otherwise.
     *
     * Stack trace is not passed to them, as it is already matched by `objectWrapper()`
     * when the intercepted method is called, and the mutation may happen later,
     * e.g. on fulfillment of the returned promise.
     *
     * @param jsonValue object value selected from args, thisArg, or result
     * @returns mutated object value together with a change flag
     */
    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        let changed = false;

        if (syntaxModeDetails.mode === 'jsonpath') {
            const value = jsonPath(source, jsonValue, jsonPathQueries, nativeObjects, () => {
                changed = true;
                hit(source);
            }, '', false, jsonPathCache);

            return {
                changed,
                value,
            };
        }

        resolvedArgumentValue = resolveJsonSetTimeKeywords(
            source,
            argumentValue,
            nativeObjects.nativeParse,
            parsedArgumentValue,
        );

        const value = jsonSetter(
            source,
            jsonValue,
            setPathObj?.path || '',
            setPathObj?.value,
            getValueToSet,
            requiredPaths,
            '',
            nativeObjects,
            () => {
                changed = true;
            },
        );

        return {
            changed,
            value,
        };
    };

    /**
     * Checks whether the original payload should be logged in log-only mode.
     *
     * Uses JSONPath matching when `requiredInitialProps` was detected as JSONPath;
     * otherwise falls back to the existing string/regex matching against serialized content.
     *
     * @param content serialized payload used for string or regex matching
     * @param jsonValue parsed object payload used for JSONPath matching
     * @returns true when the payload matches the configured log-only filter
     */
    const shouldLogOriginalContent = (content: string, jsonValue?: Record<string, any>) => {
        if (logOnlyJsonPathFilter) {
            if (jsonValue == null || typeof jsonValue !== 'object') {
                return false;
            }

            return matchesJsonPath(source, jsonValue, logOnlyJsonPathFilter, nativeObjects);
        }

        if (!logOnlyMatchPattern) {
            return true;
        }

        return toRegExp(logOnlyMatchPattern).test(content);
    };

    /**
     * Logs the original payload in log-only mode when it matches the configured filter.
     *
     * Objects are logged as both structured and stringified content. String inputs are
     * first parsed as JSON to allow object-level filtering and structured logging, and
     * fall back to raw string logging when parsing is not possible.
     *
     * @param jsonValue intercepted payload selected by `jsonSource`
     * @param stackTrace stack trace captured for the current interception
     */
    const logOriginalOnlyContent = (jsonValue: any, stackTrace: string) => {
        if (jsonValue !== null && typeof jsonValue === 'object') {
            const serializedContent = nativeObjects.nativeStringify(jsonValue);
            if (!shouldLogOriginalContent(serializedContent, jsonValue)) {
                return;
            }

            logOriginalStructuredContent(jsonValue, stackTrace);
            return;
        }

        if (typeof jsonValue === 'string') {
            try {
                const parsedValue = nativeObjects.nativeParse(jsonValue);
                if (parsedValue !== null && typeof parsedValue === 'object') {
                    const serializedContent = nativeObjects.nativeStringify(parsedValue);
                    if (!shouldLogOriginalContent(serializedContent, parsedValue)) {
                        return;
                    }

                    logOriginalStructuredContent(parsedValue, stackTrace);
                    return;
                }
            } catch {
                // Ignore parse errors in log-only mode and fall back to raw string logging.
            }

            if (!shouldLogOriginalContent(jsonValue)) {
                return;
            }

            logStringContent(jsonValue, stackTrace);
        }
    };

    // Saved when the rule runs, as the page may replace it later
    const nativeStructuredClone = typeof window.structuredClone === 'function' ? window.structuredClone : null;

    /**
     * Returns a copy of an object value which a rule with `copy` modifies, by `structuredClone()`, as uBO does
     * for `trusted-edit-inbound-object`, e.g. which keeps dates, maps and cycles, or null if it is not copied:
     * if no query of a rule in JSONPath mode matches the value, or the value has no `requiredInitialProps`
     * in legacy mode, so a value which is not modified is not copied, e.g. on each call of `JSON.stringify()`,
     * unlike uBO, which copies each value; a getter of the page which returns another value on each read
     * may give the copy another value than the matched one then. A value is not copied if it cannot be copied,
     * e.g. a function or a node,
     * or in a browser without `structuredClone()`, as modifying the value itself would change the object
     * of the page, which `copy` avoids, so the value is not modified then.
     *
     * An instance of a class is copied as a plain object, without its prototype and private fields, as by uBO,
     * which is documented and accepted for now, as `copy` is meant for plain data, e.g. a request body.
     *
     * @param jsonValue object value to copy
     * @returns copy of the value, or null if it is not modified
     */
    const copyValueToModify = (jsonValue: Record<string, any>): Record<string, any> | null => {
        if (syntaxModeDetails.mode === 'jsonpath') {
            let isMatched = false;
            jsonPath(source, jsonValue, jsonPathQueries, nativeObjects, () => {
                isMatched = true;
            }, '', true, jsonPathCache);
            if (!isMatched) {
                return null;
            }
        } else if (
            requiredPaths.length > 0
            && !isPruningNeeded(source, jsonValue, [{ path: setPathObj?.path || '' }], requiredPaths, '', nativeObjects)
        ) {
            // In legacy mode the path is set also if it is missing, so only `requiredInitialProps` are checked,
            // e.g. a rule which requires a property that most values do not have copies only the ones with it
            return null;
        }
        if (nativeStructuredClone === null) {
            logMessage(source, 'The value cannot be copied, as structuredClone() is not supported');
            return null;
        }
        try {
            return Reflect.apply(nativeStructuredClone, window, [jsonValue]) as Record<string, any>;
        } catch (error) {
            logMessage(source, `The value cannot be copied: ${getThrownValueMessage(error)}`);
            return null;
        }
    };

    /**
     * Modifies an object value directly by `applyJsonMutation()`, i.e. by `jsonPath` in JSONPath mode
     * or by `jsonSetter` otherwise, or a string value after JSON parsing, which is stringified again then.
     * A string which is not a JSON object is processed as line-delimited JSON,
     * and it is returned unchanged if it has no JSON lines either.
     * In logging-only mode, the value is only logged. Values of other types are returned unchanged.
     * A value is returned unchanged as well if its modification throws an error, which is logged.
     *
     * @param jsonValue candidate JSON value to modify
     * @param errorMessage message prefix used for logging unexpected errors
     * @param currentStackTrace stack trace for logs, captured when the intercepted method is called,
     * or an empty string if it is not needed
     * @returns modified JSON-compatible value or the original input if it cannot be processed
     */
    const modifyJsonValue = (jsonValue: any, errorMessage: string, currentStackTrace: string) => {
        // uBO rules modify the value only if it is an object, as uBO does, while a string, e.g. which `JSON.parse()`
        // returns for a JSON text encoded twice, or an argument of `trusted-edit-inbound-object`, is not parsed,
        // as it is for AdGuard rules
        if (isUboDialect && (jsonValue === null || typeof jsonValue !== 'object')) {
            return jsonValue;
        }

        if (isLogOnlyMode) {
            try {
                logOriginalOnlyContent(jsonValue, currentStackTrace);
            } catch (error) {
                logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
            }
            return jsonValue;
        }

        if (jsonValue !== null && typeof jsonValue === 'object') {
            try {
                // With `copy`, a copy of the value is modified, and used instead of it only if it has changed,
                // e.g. passed to the method, so the object of the page is not changed, while the value itself
                // is used if it has not changed, or if it cannot be copied
                let targetValue = jsonValue;
                if (isCopyModified) {
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    const copiedValue = copyValueToModify(jsonValue);
                    if (copiedValue === null) {
                        return jsonValue;
                    }
                    targetValue = copiedValue;
                }
                const originalSnapshot = shouldLogVerboseContent
                    ? captureOriginalStructuredContent(jsonValue)
                    : null;
                const mutationResult = applyJsonMutation(targetValue);
                if (isCopyModified && !mutationResult.changed) {
                    return jsonValue;
                }

                if (shouldLogVerboseContent) {
                    if (mutationResult.changed && originalSnapshot) {
                        logCapturedOriginalStructuredContent(originalSnapshot, currentStackTrace);
                        logModifiedStructuredContent(mutationResult.value, currentStackTrace);
                    }
                }

                return mutationResult.value;
            } catch (error) {
                logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
                return jsonValue;
            }
        }

        if (typeof jsonValue === 'string') {
            // A string without `{` and `[` is neither a JSON object or array, nor has lines of them,
            // so it is returned as is without parsing, as a method, e.g. `Array.isArray()`, may be called
            // with such strings very often, and a parsing error is costly
            if (jsonValue.indexOf('{') === -1 && jsonValue.indexOf('[') === -1) {
                return jsonValue;
            }

            let messageError = '';
            let parsedValue;
            try {
                parsedValue = nativeObjects.nativeParse(jsonValue);
            } catch (error) {
                messageError = getThrownValueMessage(error);
            }

            // A JSON object is not processed as line-delimited JSON if its modification throws,
            // as it would be parsed and modified again in the same way
            if (parsedValue !== null && typeof parsedValue === 'object') {
                try {
                    const originalSnapshot = shouldLogVerboseContent
                        ? captureOriginalStructuredContent(parsedValue)
                        : null;

                    const mutationResult = applyJsonMutation(parsedValue);
                    if (shouldLogVerboseContent) {
                        if (mutationResult.changed && originalSnapshot) {
                            logCapturedOriginalStructuredContent(originalSnapshot, currentStackTrace);
                            logModifiedStructuredContent(mutationResult.value, currentStackTrace);
                        }
                    }
                    return nativeObjects.nativeStringify(mutationResult.value);
                } catch (error) {
                    // e.g. thrown by `toJSON()` of the page, which may throw a value without a message
                    logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
                    return jsonValue;
                }
            }

            // If parsing fails, try to process it as line-delimited JSON
            try {
                let changed = false;
                const lineEditResult = jsonLineEdit(
                    (parsedLine) => {
                        const mutationResult = applyJsonMutation(parsedLine);
                        if (mutationResult.changed) {
                            changed = true;
                        }

                        return mutationResult.value;
                    },
                    nativeObjects,
                    jsonValue,
                );

                if (lineEditResult.hasJsonLines) {
                    if (shouldLogVerboseContent && changed) {
                        logStringContent(jsonValue, currentStackTrace);
                        logStringContent(lineEditResult.text, currentStackTrace, true);
                    }

                    return lineEditResult.text;
                }

                if (!lineEditResult.hasJsonLines) {
                    // If the string cannot be processed as JSON at all, log the parsing error
                    logMessage(source, `Error parsing JSON string: ${messageError}`);
                }

                return jsonValue;
            } catch (error) {
                logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
                return jsonValue;
            }
        }

        return jsonValue;
    };

    // Saved before the page can replace them, as a promise returned by the intercepted method,
    // e.g. by `Response.prototype.json()`, is modified on its fulfillment
    // https://github.com/AdguardTeam/Scriptlets/issues/585
    const NativePromise = window.Promise;
    const nativePromiseThen = NativePromise.prototype.then;

    let isMatchingSuspended = false;

    const isResultMatchRequired = textMatch.matcher !== null && textMatch.target === 'result';

    /**
     * Checks whether the result of the call, or the value which its promise is fulfilled with,
     * is matched by `matches result`, if the rule has it.
     *
     * @param value result of the call, or the value which its promise is fulfilled with
     * @returns true if the result may be processed
     */
    const isResultMatched = (value: unknown): boolean => !isResultMatchRequired
        || isJsonTextMatched(textMatch.matcher as string | RegExp, value, testRegexp);

    /**
     * Calls `modifyJsonValue()` with matching suspended, so the intercepted method is not processed again
     * if it is called during the modification, e.g. by a helper, also when a promise is fulfilled,
     * i.e. after `objectWrapper()` has returned.
     * Unexpected errors are logged and the original value is returned then.
     *
     * @param jsonValue candidate JSON value to modify
     * @param errorMessage message prefix used for logging unexpected errors
     * @param currentStackTrace stack trace for logs, captured when the intercepted method is called,
     * or an empty string if it is not needed
     * @param isResult if true, the value is the result of the call, which `matches result` tests first
     * @returns modified JSON-compatible value or the original input if it cannot be processed
     */
    const modifyJsonValueSafely = (
        jsonValue: any,
        errorMessage: string,
        currentStackTrace: string,
        isResult = false,
    ) => {
        const wasMatchingSuspended = isMatchingSuspended;
        isMatchingSuspended = true;
        try {
            // Tested while matching is suspended, also on the fulfillment of a promise, i.e. after the wrapper
            // has returned, as the test may call the intercepted method itself
            if (isResult && !isResultMatched(jsonValue)) {
                return jsonValue;
            }
            return modifyJsonValue(jsonValue, errorMessage, currentStackTrace);
        } catch (error) {
            logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
            return jsonValue;
        } finally {
            isMatchingSuspended = wasMatchingSuspended;
        }
    };

    /**
     * Modifies the result of the intercepted method.
     *
     * If it is a native promise, e.g. of `Response.prototype.json()`, the value it is fulfilled with is modified
     * instead of the promise itself, so a new promise of the modified value is returned,
     * and a rejection of the original promise is passed through.
     * In logging-only mode, the value is only logged, so the original promise is returned.
     *
     * @param result value returned by the intercepted method
     * @param currentStackTrace stack trace for logs, captured when the intercepted method is called,
     * or an empty string if it is not needed
     * @returns modified result, or a promise of it
     */
    const modifyResult = (result: any, currentStackTrace: string) => {
        const errorMessage = 'Error during setting the result value';
        if (!isNativePromise(result, NativePromise)) {
            return modifyJsonValueSafely(result, errorMessage, currentStackTrace, true);
        }

        // The value which the promise is fulfilled with is tested by `matches result`, as it is modified
        const onFulfilled = (value: unknown) => modifyJsonValueSafely(value, errorMessage, currentStackTrace, true);

        try {
            // Native method is used, as `then` of the promise may be replaced by the page
            if (isLogOnlyMode) {
                // The original promise is returned, so the page keeps its identity and properties.
                // Its rejection is handled here, as the promise of this handler is not returned,
                // so it would be rejected unhandled otherwise
                Reflect.apply(nativePromiseThen, result, [onFulfilled, noopFunc]);
                return result;
            }

            return Reflect.apply(nativePromiseThen, result, [onFulfilled]);
        } catch (error) {
            // e.g. if the result only inherits from `Promise.prototype`,
            // so it is returned as is, and the intercepted method is not called again
            logMessage(source, `${errorMessage}: ${getThrownValueMessage(error)}`);
            return result;
        }
    };

    // `matches` of an argument or `this`, which is tested before the call
    const isTextMatchedBeforeCall = textMatch.matcher !== null && textMatch.target !== 'result';

    /**
     * Tests the text of `matches`, i.e. an argument or `this`, before the call, if the rule has it,
     * as the call is passed through if it is not matched, which costs much less than reading the stack trace
     * or parsing the text. Matching is suspended while it is tested, as the test may call the intercepted method
     * itself, e.g. `Array.prototype.push` of the helper which saves `RegExp.$1`, …, `RegExp.$9`,
     * but not while the call is passed through, as other calls.
     * A call of a constructor has no `this` before it, so `matches this` does not match it, as `undefined`
     * is not a text.
     *
     * @param thisArg `this` of the call, or undefined for a call of a constructor
     * @param args arguments of the call
     * @returns true if the call may be processed
     */
    const isCallTextMatched = (thisArg: any, args: any[]): boolean => {
        let isTextMatched = false;
        isMatchingSuspended = true;
        try {
            const text = textMatch.target === 'this' ? thisArg : args[textMatch.argIndex];
            isTextMatched = isJsonTextMatched(textMatch.matcher as string | RegExp, text, testRegexp);
        } finally {
            isMatchingSuspended = false;
        }
        return isTextMatched;
    };

    /**
     * Prepares a call of the intercepted method, or of a constructor, while matching is suspended:
     * matches `stack` against the stack trace which the trap has created, and modifies the arguments
     * selected by `jsonSource` in place. It returns before the trap calls the method, so the page's code
     * which the method runs, e.g. a function hooked by another rule, does not get a frame of it in its stack trace,
     * which has a limit, e.g. 10 frames in Chromium, and the frames of its callers are kept, e.g. for `stack`.
     *
     * @param args arguments of the call, which are modified in place
     * @param currentStackTrace stack trace created by the trap, or an empty string if it is not read
     * @param isStackTraceRead true if the stack trace has been read
     * @returns true if the call is processed, i.e. `stack` is matched, if the rule has it
     */
    const prepareCall = (
        args: any[],
        currentStackTrace: string,
        isStackTraceRead: boolean,
    ): boolean => {
        let shouldProcess = false;
        try {
            shouldProcess = !stack
                || (isStackTraceRead && matchStackTrace(stack, addStackTraceMessageLine(currentStackTrace)));

            // With `matches result`, which is known only after the call, only the result is processed
            if (shouldProcess && !isResultMatchRequired) {
                // A negative index counts from the end, e.g. `-1` is the last argument of the call,
                // and only the arguments which the method is called with are processed, each once,
                // e.g. of `arg:0|-1` for a call with one argument, which only a rule with a negative index
                // has to check, as the indexes are unique otherwise. No function is created for each call,
                // as the method may be called very often, e.g. `Array.isArray()`
                for (let i = 0; i < argumentIndexes.length; i += 1) {
                    const rawIndex = argumentIndexes[i];
                    const index = rawIndex < 0 ? args.length + rawIndex : rawIndex;
                    if (index < 0 || index >= args.length) {
                        continue;
                    }
                    let isProcessed = false;
                    if (hasNegativeArgumentIndex) {
                        for (let j = 0; j < i; j += 1) {
                            const previousIndex = argumentIndexes[j];
                            if ((previousIndex < 0 ? args.length + previousIndex : previousIndex) === index) {
                                isProcessed = true;
                            }
                        }
                    }
                    if (isProcessed) {
                        continue;
                    }
                    args[index] = modifyJsonValueSafely(
                        args[index],
                        `Error during setting the argument at index ${index}`,
                        currentStackTrace,
                    );
                }

                if (normalizedJsonSource === JSON_SOURCES.ARGS || normalizedJsonSource === JSON_SOURCES.ALL) {
                    for (let i = 0; i < args.length; i += 1) {
                        args[i] = modifyJsonValueSafely(
                            args[i],
                            `Error during setting the argument at index ${i}`,
                            currentStackTrace,
                        );
                    }
                }
            }
        } catch (error) {
            logMessage(source, `Unexpected error during JSON modification: ${getThrownValueMessage(error)}`);
        }
        return shouldProcess;
    };

    const isResultSource = normalizedJsonSource === JSON_SOURCES.RESULT || normalizedJsonSource === JSON_SOURCES.ALL;
    const isThisSource = normalizedJsonSource === JSON_SOURCES.THIS || normalizedJsonSource === JSON_SOURCES.ALL;

    const objectWrapper = (
        target: Function,
        thisArg: any,
        args: any[],
    ) => {
        if (isMatchingSuspended || (methodOwner !== base && thisArg !== base)) {
            return Reflect.apply(target, thisArg, args);
        }

        // Checked here first, as the method may be called very often, e.g. `Array.isArray()`
        if (isTextMatchedBeforeCall && !isCallTextMatched(thisArg, args)) {
            return Reflect.apply(target, thisArg, args);
        }

        isMatchingSuspended = true;
        try {
            // Stack trace is matched once, when the method is called, as the value of a returned promise
            // is modified on its fulfillment, when the caller is no longer in the stack.
            // It is created here, in the wrapper called by the page, and gets the error message line
            // in all browsers, so `matchStackTrace()` keeps the frame of the caller,
            // regardless of the minification, which may inline a function created it otherwise.
            // It is read only if it is matched or logged, i.e. with `stack`, in logging-only mode or with `verbose`.
            // The page may make creating or reading it throw, e.g. by replacing `Error`
            // or by `Error.prepareStackTrace`, or make it a non-string value,
            // which should not stop the rules without `stack` from working,
            // so the error is created in the same `try` in which the stack trace is read
            let currentStackTrace = '';
            let isStackTraceRead = false;
            if (stack || isLogOnlyMode || shouldLogVerboseContent) {
                try {
                    currentStackTrace = String(new Error().stack || '');
                    isStackTraceRead = true;
                } catch {
                    // Rules with `stack` are not processed, as it cannot be matched
                }
            }

            const shouldProcess = prepareCall(args, currentStackTrace, isStackTraceRead);
            const modifiedThisArg = shouldProcess && !isResultMatchRequired && isThisSource
                ? modifyJsonValueSafely(thisArg, 'Error during setting the thisArg value', currentStackTrace)
                : thisArg;

            // Called here, in the trap, see `prepareCall()`. Errors thrown by the intercepted method are not caught,
            // so it is not called again
            const result = Reflect.apply(target, modifiedThisArg, args);

            if (!shouldProcess || !isResultSource) {
                return result;
            }

            return modifyResult(result, currentStackTrace);
        } finally {
            isMatchingSuspended = false;
        }
    };

    /**
     * Intercepts a call of the method as a constructor, e.g. `new CustomEvent('ad', options)`, as uBO does,
     * which is processed as a call of a function, except that it has no `this`, and that the constructed object
     * itself is its result, also a promise, whose value is not processed.
     * A call of a constructor reached through the prototype of the base object is not processed,
     * as only the calls whose `this` is the base object are processed then, see `objectWrapper()`.
     *
     * @param target intercepted constructor
     * @param args arguments of the call
     * @param newTarget constructor which `new` is applied to, e.g. the proxy or a subclass of it
     * @returns constructed object, modified if it is selected
     */
    const constructWrapper = (
        target: Function,
        args: any[],
        newTarget: Function,
    ) => {
        if (isMatchingSuspended || methodOwner !== base) {
            return Reflect.construct(target, args, newTarget);
        }

        if (isTextMatchedBeforeCall && !isCallTextMatched(undefined, args)) {
            return Reflect.construct(target, args, newTarget);
        }

        isMatchingSuspended = true;
        try {
            // Created here, in the trap called by the page, as in `objectWrapper()`
            let currentStackTrace = '';
            let isStackTraceRead = false;
            if (stack || isLogOnlyMode || shouldLogVerboseContent) {
                try {
                    currentStackTrace = String(new Error().stack || '');
                    isStackTraceRead = true;
                } catch {
                    // Rules with `stack` are not processed, as it cannot be matched
                }
            }

            const shouldProcess = prepareCall(args, currentStackTrace, isStackTraceRead);

            // Called here, in the trap, see `prepareCall()`. `newTarget` is passed to the constructor,
            // so a subclass of it, e.g. `class Ad extends CustomEvent {}`, constructs an instance of the subclass
            const result = Reflect.construct(target, args, newTarget);

            if (!shouldProcess || !isResultSource) {
                return result;
            }

            // The constructed object itself is modified, also a promise, e.g. of `new Promise()` or of its subclass,
            // whose value is not, as chaining it would return another promise than the constructed one, without
            // the methods of a subclass, and change when the callbacks of the page run.
            // A constructor has to return an object, so a value which replaces the constructed object and is not
            // an object, e.g. of `$` set to `false`, is not returned, as `new` would throw otherwise
            const modifiedResult = modifyJsonValueSafely(
                result,
                'Error during setting the result value',
                currentStackTrace,
                true,
            );
            if (
                modifiedResult === null
                || (typeof modifiedResult !== 'object' && typeof modifiedResult !== 'function')
            ) {
                return result;
            }
            return modifiedResult;
        } finally {
            isMatchingSuspended = false;
        }
    };

    // A Proxy has the `construct` trap only if the method is a constructor, so `new` of another method,
    // e.g. `new JSON.parse()`, still throws as without the rule
    const objectHandler = {
        apply: objectWrapper,
        construct: constructWrapper,
        get: getFunctionProxyProperty,
    };

    methodOwner[prop] = new Proxy(nativeMethod, objectHandler);
}

export const trustedJsonSetNames = [
    'trusted-json-set',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-json-edit.js',
    'ubo-trusted-json-edit',
    'ubo-trusted-edit-inbound-object.js',
    'ubo-trusted-edit-inbound-object',
];

// eslint-disable-next-line prefer-destructuring
trustedJsonSet.primaryName = trustedJsonSetNames[0];

trustedJsonSet.injections = [
    hit,
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
    matchStackTrace,
    addStackTraceMessageLine,
    getPropertyInChain,
    getMethodOwner,
    getFunctionProxyProperty,
    getWildcardPropertyInChain,
    logMessage,
    getThrownValueMessage,
    logJsonContent,
    isPruningNeeded,
    jsonSetter,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    isNativePromise,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    extractRegexAndReplacement,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    parseKeywordValue,
    resolveJsonSetTimeKeywords,
    jsonLineEdit,
    jsonPath,
    splitJsonPathQueries,
    getJsonPathQueries,
    getJsonPathRegexpEnd,
    matchesJsonPath,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
    buildJsonPathQueries,
    getAdgJsonTextMatch,
    getUboJsonTextMatch,
    isJsonTextMatched,
    getUboJsonEditArguments,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
