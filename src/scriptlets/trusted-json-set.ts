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
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonSetter,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    extractRegexAndReplacement,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    jsonLineEdit,
    jsonPath,
    matchesJsonPath,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
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
 * 1. the return value if it is an object or a JSON string.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-json-set', methodPath[, propsPath[, argumentValue[, requiredInitialProps[, jsonSource[, stack[, mode[, verbose]]]]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `methodPath` — required, chain of dot-separated properties leading to the target method,
 *   e.g. `JSON.stringify`, `JSON.parse`.
 *   The method may receive a JSON object as its first argument or return one.
 * - `propsPath` — optional, dot-separated path to the property to set.
 *   If omitted, the scriptlet logs the original selected content and does not mutate it.
 *   Supports wildcards:
 *     - `*` — matches any object property key
 *     - `[]` — matches any array element index
 *   Supports value filtering: append `.[=].value` to only modify nodes where the property equals `value`.
 *   In `jsonpath` mode this may also be a full JSONPath mutation expression such as `$..*[?(@.price==8.99)].price=10`.
 *   JSONPath mode accepts only one expression string in `propsPath`; it does not
 *   support combining multiple independent JSONPath expressions in one argument.
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
 *     - `$remove$` — in `jsonpath` mode, removes each property or array item matched by `propsPath`
 *     - any other string is set as a string literal
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
 *     - `arg:N` — only argument `N` using 0-based indexing, e.g. `arg:1`
 *     - `arg:N|M|K` — only the listed arguments using 0-based indexing, e.g. `arg:0|1|3`
 *     - `args` — all arguments
 *     - `this` — `thisArg` of the intercepted method
 *     - `result` — only the return value
 *     - `all` — all arguments, `thisArg`, and the return value
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if a regular expression is invalid it will be skipped.
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
 *
 * > [!IMPORTANT]
 * > Please note that, if `requiredInitialProps` is not specified, the scriptlet will attempt to set
 * > the value at the target path even if it does not exist, unless the path includes wildcards (`*`),
 * > array element index (`[]`), or value filters (`.[=].value`).
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
    jsonSource = 'result',
    stack = '',
    mode = '',
    verbose = '',
) {
    const isLogOnlyMode = !propsPath;
    const shouldLogVerboseContent = verbose === 'true' && !isLogOnlyMode;
    const syntaxModeDetails = isLogOnlyMode
        ? { mode: 'legacy' as const }
        : resolveJsonSyntaxMode(propsPath, mode);
    const jsonPathExpression = !isLogOnlyMode && syntaxModeDetails.mode === 'jsonpath'
        ? buildJsonPathExpression(propsPath, argumentValue)
        : '';

    if (!methodPath) {
        return;
    }

    if (!isLogOnlyMode && syntaxModeDetails.mode === 'legacy' && argumentValue === undefined) {
        return;
    }

    if (!isLogOnlyMode && syntaxModeDetails.mode === 'jsonpath' && jsonPathExpression === '') {
        logMessage(source, 'JSONPath mode requires argumentValue unless propsPath already contains an inline mutation');
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
                return [label, structuredClone(value)] as [string, unknown];
            } catch (error) {
                try {
                    return [
                        label,
                        nativeObjects.nativeParse(nativeObjects.nativeStringify(value)),
                    ] as [string, unknown];
                } catch {
                    // eslint-disable-next-line max-len
                    return [`Could not clone content of ${methodPath} (original and modified objects are the same): ${(error as Error).message}\n`, value];
                }
            }
        }

        try {
            return [label, nativeObjects.nativeParse(nativeObjects.nativeStringify(value))] as [string, unknown];
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
     * Logs the original structured payload as both a prettified JSON string and an object snapshot.
     *
     * @param value original object payload before any mutation attempt
     * @param stackTrace stack trace captured for the current interception
     */
    const logOriginalStructuredContent = (value: unknown, stackTrace: string) => {
        logStringContent(nativeObjects.nativeStringify(value, null, 2), stackTrace);
        logClonedObject(createContentLabel('object'), value);
    };

    /**
     * Logs the modified structured payload as both a prettified JSON string and an object snapshot.
     *
     * @param value mutated object payload after a successful change
     * @param stackTrace stack trace captured for the current interception
     */
    const logModifiedStructuredContent = (value: unknown, stackTrace: string) => {
        logStringContent(nativeObjects.nativeStringify(value, null, 2), stackTrace, true);
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
            stringContent: nativeObjects.nativeStringify(value, null, 2),
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

    const nativeMethod = base[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    /**
     * Normalizes supported `jsonSource` aliases and validates the selected source.
     * Falls back to `result` for unsupported values.
     *
     * @returns normalized json source value
     */
    const normalizeJsonSource = () => {
        if (jsonSource === 'argument') {
            return JSON_SOURCES.ARG;
        }
        if (jsonSource === 'arguments') {
            return JSON_SOURCES.ARGS;
        }
        if (jsonSource === 'thisArg') {
            return JSON_SOURCES.THIS;
        }
        if (/^arg:(\d+\|)*\d+$/.test(jsonSource.trim())) {
            return jsonSource.trim();
        }
        if (
            jsonSource !== JSON_SOURCES.ARG
            && jsonSource !== JSON_SOURCES.ARGS
            && jsonSource !== JSON_SOURCES.THIS
            && jsonSource !== JSON_SOURCES.RESULT
            && jsonSource !== JSON_SOURCES.ALL
        ) {
            return JSON_SOURCES.RESULT;
        }
        return jsonSource;
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
     * Resolves the list of target argument indexes for `arg` / `arg:N|M` jsonSource values.
     * Input indexes in the rule are 0-based.
     *
     * @param argsLength number of arguments passed to the intercepted method
     * @returns selected argument indexes
     */
    const getSelectedArgumentIndexes = (argsLength: number) => {
        if (normalizedJsonSource === JSON_SOURCES.ARG) {
            return argsLength > 0 ? [0] : [];
        }

        if (normalizedJsonSource.startsWith('arg:')) {
            const rawIndexes = normalizedJsonSource.slice(4).split('|');
            const indexes: number[] = [];

            for (let i = 0; i < rawIndexes.length; i += 1) {
                const parsedIndex = parseFloat(rawIndexes[i]);
                if (nativeIsNaN(parsedIndex)) {
                    continue;
                }

                const index = parsedIndex;
                if (index < 0 || index >= argsLength || indexes.includes(index)) {
                    continue;
                }

                indexes.push(index);
            }

            return indexes;
        }

        return [];
    };

    /**
     * Resolves the value to write for legacy-mode mutations.
     *
     * `parsedArgumentValue` is only populated in legacy mode. In `jsonpath` mode,
     * this helper should never be used, so it defensively returns the current
     * value unchanged when no parsed argument is available.
     *
     * @param currentValue current value at the matched path
     * @returns value that should be written back to the matched path
     */
    const getValueToSet = (currentValue: any): any => {
        if (parsedArgumentValue === undefined) {
            // In non-legacy modes this function should not be called; defensively return the original value.
            return currentValue;
        }

        // eslint-disable-next-line max-len
        const nonNullParsedArgumentValue: NonNullable<ReturnType<typeof parseJsonSetArgumentValue>> = parsedArgumentValue;

        return getJsonSetValue(
            currentValue,
            nonNullParsedArgumentValue,
        );
    };

    /**
     * Applies the configured mutation to a JSON-compatible object value.
     *
     * Uses `jsonPath` for `jsonpath` mode and falls back to the legacy
     * `jsonSetter` implementation otherwise.
     *
     * @param jsonValue object value selected from args, thisArg, or result
     * @returns mutated object value together with a change flag
     */
    const applyJsonMutation = (jsonValue: Record<string, any>) => {
        let changed = false;

        if (syntaxModeDetails.mode === 'jsonpath') {
            const value = jsonPath(source, jsonValue, jsonPathExpression, nativeObjects, () => {
                changed = true;
                hit(source);
            }, stack);

            return {
                changed,
                value,
            };
        }

        const value = jsonSetter(
            source,
            jsonValue,
            setPathObj?.path || '',
            setPathObj?.value,
            getValueToSet,
            requiredPaths,
            stack,
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

    /**
     * Applies `jsonSetter` to an object value directly, or to a string value after JSON parsing.
     * If parsing fails, the original value is returned unchanged.
     *
     * @param jsonValue candidate JSON value to modify
     * @param errorMessage message prefix used for logging unexpected errors
     * @returns modified JSON-compatible value or the original input if it cannot be processed
     */
    const modifyJsonValue = (jsonValue: any, errorMessage: string) => {
        const currentStackTrace = new Error().stack || '';

        if (isLogOnlyMode) {
            if (!stack || matchStackTrace(stack, currentStackTrace)) {
                try {
                    logOriginalOnlyContent(jsonValue, currentStackTrace);
                } catch (error) {
                    logMessage(source, `${errorMessage}: ${(error as Error).message}`);
                }
            }
            return jsonValue;
        }

        if (jsonValue !== null && typeof jsonValue === 'object') {
            try {
                const originalSnapshot = shouldLogVerboseContent
                    ? captureOriginalStructuredContent(jsonValue)
                    : null;
                const mutationResult = applyJsonMutation(jsonValue);

                if (shouldLogVerboseContent) {
                    if (mutationResult.changed && originalSnapshot) {
                        logCapturedOriginalStructuredContent(originalSnapshot, currentStackTrace);
                        logModifiedStructuredContent(mutationResult.value, currentStackTrace);
                    }
                }

                return mutationResult.value;
            } catch (error) {
                logMessage(source, `${errorMessage}: ${(error as Error).message}`);
                return jsonValue;
            }
        }

        if (typeof jsonValue === 'string') {
            let messageError = '';
            try {
                const parsedValue = nativeObjects.nativeParse(jsonValue);
                if (parsedValue !== null && typeof parsedValue === 'object') {
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
                }
            } catch (error) {
                messageError = error instanceof Error ? error.message : String(error);
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
                logMessage(source, `${errorMessage}: ${(error as Error).message}`);
                return jsonValue;
            }
        }

        return jsonValue;
    };

    let isMatchingSuspended = false;

    const objectWrapper = (
        target: Function,
        thisArg: any,
        args: any[],
    ) => {
        try {
            if (isMatchingSuspended) {
                isMatchingSuspended = false;
                return Reflect.apply(target, thisArg, args);
            }
            isMatchingSuspended = true;

            const selectedArgumentIndexes = getSelectedArgumentIndexes(args.length);

            for (let i = 0; i < selectedArgumentIndexes.length; i += 1) {
                const index = selectedArgumentIndexes[i];
                args[index] = modifyJsonValue(args[index], `Error during setting the argument at index ${index}`);
            }

            if (normalizedJsonSource === JSON_SOURCES.ARGS || normalizedJsonSource === JSON_SOURCES.ALL) {
                for (let i = 0; i < args.length; i += 1) {
                    args[i] = modifyJsonValue(args[i], `Error during setting the argument at index ${i}`);
                }
            }

            let modifiedThisArg = thisArg;
            if (normalizedJsonSource === JSON_SOURCES.THIS || normalizedJsonSource === JSON_SOURCES.ALL) {
                modifiedThisArg = modifyJsonValue(thisArg, 'Error during setting the thisArg value');
            }

            let result = Reflect.apply(target, modifiedThisArg, args);

            if (normalizedJsonSource === JSON_SOURCES.RESULT || normalizedJsonSource === JSON_SOURCES.ALL) {
                result = modifyJsonValue(result, 'Error during setting the result value');
            }

            isMatchingSuspended = false;
            return result;
        } catch (error) {
            isMatchingSuspended = false;
            logMessage(source, `Unexpected error during JSON modification: ${(error as Error).message}`);
            return Reflect.apply(target, thisArg, args);
        }
    };

    const getWrapper = (target: Function, propName: string, receiver: any) => {
        if (propName === 'toString') {
            return target.toString.bind(target);
        }
        return Reflect.get(target, propName, receiver);
    };

    const objectHandler = {
        apply: objectWrapper,
        get: getWrapper,
    };

    base[prop] = new Proxy(nativeMethod, objectHandler);
}

export const trustedJsonSetNames = [
    'trusted-json-set',
    // trusted scriptlets support no aliases
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
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonSetter,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    extractRegexAndReplacement,
    getJsonSetValue,
    parseJsonSetArgumentValue,
    jsonLineEdit,
    jsonPath,
    matchesJsonPath,
    resolveJsonSyntaxMode,
    buildJsonPathExpression,
];
