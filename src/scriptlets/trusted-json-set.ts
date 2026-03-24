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
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-json-set
 *
 * @description
 * Intercepts a specified method and sets a property at the given path in the JSON value selected by `jsonSource`.
 * If the path does not exist, it is created, including any missing intermediate objects.
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
 * example.org#%#//scriptlet('trusted-json-set', methodPath, propsPath, argumentValue[, requiredInitialProps[, jsonSource[, stack[, verbose]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `methodPath` — required, chain of dot-separated properties leading to the target method,
 *   e.g. `JSON.stringify`, `JSON.parse`.
 *   The method may receive a JSON object as its first argument or return one.
 * - `propsPath` — required, dot-separated path to the property to set.
 *   Supports wildcards:
 *     - `*` — matches any object property key
 *     - `[]` — matches any array element index
 *   Supports value filtering: append `.[=].value` to only modify nodes where the property equals `value`.
 * - `argumentValue` — required, the value to write at the target path.
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
 *     - any other string is set as a string literal
 *
 *   Can also be a replacement applied to the current string value at the target path,
 *   in the format `replace:/regex/replacement/`:
 *     - `replace:/foo/bar/` — replaces the first occurrence of `foo` with `bar`
 *     - `replace:/foo/bar/g` — replaces all occurrences
 *
 *   Or `json:{...}` — parses the provided `JSON` value, can be used to apply multiple modifications at once.
 *   If the current target value is also an object, the parsed object is merged into it.
 * - `requiredInitialProps` — optional, space-separated list of property paths.
 *   All listed paths must be present in the JSON object for the modification to occur.
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
 * - `verbose` — optional, if set to `true`, the scriptlet will log the original and modified JSON content.
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
 * 1. Modifies the first argument before the target method is called
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', 'ads.enabled', 'false', '', 'arg:0')
 *     ```
 *
 * 1. Modifies selected arguments before the target method is called
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'window.sendPayload', 'ads.enabled', 'false', '', 'arg:0|2')
 *     ```
 *
 * 1. Only applies when the call originates from a script matching the `adManager` stack trace
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set', 'JSON.parse', 'ads.enabled', 'false', '', 'result', 'adManager')
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
    verbose = '',
) {
    if (!methodPath || !propsPath || argumentValue === undefined) {
        return;
    }

    const shouldLogContent = verbose === 'true';

    const nativeObjects = {
        nativeStringify: window.JSON.stringify,
        nativeParse: window.JSON.parse,
    };

    const JSON_SOURCES = {
        ARG: 'arg',
        ARGS: 'args',
        THIS: 'this',
        RESULT: 'result',
        ALL: 'all',
    };

    const parsedArgumentValue = parseJsonSetArgumentValue(
        source,
        argumentValue,
        nativeObjects.nativeParse,
    );
    if (!parsedArgumentValue) {
        return;
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

    const parsedSetPaths = getPrunePath(propsPath);
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = getPrunePath(requiredInitialProps);
    const normalizedJsonSource = normalizeJsonSource();

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

    const getValueToSet = (currentValue: any): any => getJsonSetValue(currentValue, parsedArgumentValue);

    /**
     * Applies `jsonSetter` to an object value directly, or to a string value after JSON parsing.
     * If parsing fails, the original value is returned unchanged.
     *
     * @param jsonValue candidate JSON value to modify
     * @param errorMessage message prefix used for logging unexpected errors
     * @returns modified JSON-compatible value or the original input if it cannot be processed
     */
    const modifyJsonValue = (jsonValue: any, errorMessage: string) => {
        if (jsonValue !== null && typeof jsonValue === 'object') {
            try {
                if (shouldLogContent) {
                    // eslint-disable-next-line max-len
                    logMessage(source, `Original content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(jsonValue, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                    logMessage(source, jsonValue, true, false);
                }
                const modifiedJson = jsonSetter(
                    source,
                    jsonValue,
                    setPathObj?.path || '',
                    setPathObj?.value,
                    getValueToSet,
                    requiredPaths,
                    stack,
                    nativeObjects,
                );

                if (shouldLogContent) {
                    // eslint-disable-next-line max-len
                    logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(modifiedJson, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                    logMessage(source, modifiedJson, true, false);
                }

                return modifiedJson;
            } catch (error) {
                logMessage(source, `${errorMessage}: ${(error as Error).message}`);
                return jsonValue;
            }
        }

        if (typeof jsonValue === 'string') {
            try {
                const parsedValue = nativeObjects.nativeParse(jsonValue);
                if (parsedValue !== null && typeof parsedValue === 'object') {
                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Original content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(parsedValue, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                        logMessage(source, parsedValue, true, false);
                    }

                    const modified = jsonSetter(
                        source,
                        parsedValue,
                        setPathObj?.path || '',
                        setPathObj?.value,
                        getValueToSet,
                        requiredPaths,
                        stack,
                        nativeObjects,
                    );
                    if (shouldLogContent) {
                        // eslint-disable-next-line max-len
                        logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeObjects.nativeStringify(modified, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                        logMessage(source, modified, true, false);
                    }
                    return nativeObjects.nativeStringify(modified);
                }
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
];
