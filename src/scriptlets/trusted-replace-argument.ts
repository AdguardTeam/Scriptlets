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
    matchStackTrace,
    getPropertyInChain,
    extractRegexAndReplacement,
    logMessage,
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    nativeIsNaN,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-argument
 *
 * @description
 * Replaces a specific argument of a native method with a constant value, JSON parsed value
 * or a value derived from a regular expression replacement.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/ublock/wiki/Resources-Library#trusted-replace-argumentjs-
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-argument', methodPath, [argumentIndex, [argumentValue[, pattern[, stack[, verbose]]]]])
 * ```
 *
 *
 * - `methodPath` – required, string path to a native method (joined with `.` if needed). The property must be attached to `window`.
 * - `argumentIndex` – required, string index of the argument to replace (0-based).
 * - `argumentValue` – required, string value to set for the argument.
 *   If it starts with `replace:`, it is treated as a replacement pattern in the format `replace:/regex/replacement/`.
 *   To replace all occurrences of a pattern, the replacement string must include the global flag `g`, like this: `replace:/foo/bar/g`, otherwise only the first occurrence will be replaced.
 *   If it starts with `json:`, it is treated as a JSON string to parse and set for the argument. For example, `json:{"key": "value"}` will set the argument to an object `{ key: 'value' }`.
 *   If it does not start with `replace:` or `json:`, it is treated as a constant value to set for the argument, or as one of the following predefined constants:
 *     - `undefined`
 *     - `false`
 *     - `true`
 *     - `null`
 *     - `emptyObj` — empty object
 *     - `emptyArr` — empty array
 *     - `noopFunc` — function with empty body
 *     - `noopCallbackFunc` — function returning noopFunc
 *     - `trueFunc` — function returning true
 *     - `falseFunc` — function returning false
 *     - `throwFunc` — function throwing an error
 *     - `noopPromiseResolve` — function returning Promise object that is resolved with an empty response
 *     - `noopPromiseReject` — function returning Promise.reject()
 * - `pattern` – optional, string or regular expression pattern to match the argument against. If provided, the argument will only be replaced if it matches this pattern.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 * - `verbose` — optional, string, if set to `'true'`, logs the method arguments. Defaults to `'false'`.
 *    It may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 *
 * ### Examples
 *
 * 1. Set the first argument of `eval` with a constant value `"Replacement"` if the pattern matches:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'eval', '0', '"Replacement"', 'Foo bar')
 *     ```
 *
 *     For instance, the following call will return `"Replacement"`:
 *
 *     ```html
 *     eval('"Foo bar"');
 *     ```
 *
 * 1. Replace the part `foo` of the first argument of `eval` with a `bar` value if the pattern matches:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'eval', '0', 'replace:/foo/bar/', 'Text content foo')
 *     ```
 *
 *     For instance, the following call will return `"Text content bar"`:
 *
 *     ```html
 *     eval('"Text content foo"');
 *     ```
 *
 * 1. Replace all occurrences of the first argument of `JSON.parse` with a constant value `"no_ads"` if the pattern matches:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'JSON.parse', '0', 'replace:/ads/no_ads/g', 'ads')
 *     ```
 *
 *     For instance, the following call:
 *
 *     ```html
 *     const jsonString = '{ "ads1": 1, "ads2": 2, "content": "fooBar", "ads3": 3 }';
 *     const result = JSON.parse(jsonString);
 *     ```
 *
 *     will return the object:
 *
 *     ```json
 *     {
 *         no_ads1: 1,
 *         no_ads2: 2,
 *         content: 'fooBar',
 *         no_ads3: 3
 *     }
 *     ```
 *
 * 1. Replace the third argument of `Object.defineProperty` with a JSON object `{"value": "disabled"}` if the pattern matches:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'Object.defineProperty', '2', 'json:{"value": "disabled"}', 'enabled')
 *     ```
 *
 *     For instance, `window.adblock` property for the following call will return `"disabled"`:
 *
 *     ```html
 *     Object.defineProperty(window, 'adblock', { value: 'enabled' });
 *     ```
 *
 * 1. Replace first argument of `MutationObserver` with `noopFunc` if the pattern matches:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'MutationObserver', '0', 'noopFunc', 'Adblock')
 *     ```
 *
 *     For instance, `callback` function for the following call will be replaced with `noopFunc`:
 *
 *     ```html
 *     const callback = () => {
 *         if(adblock) {
 *            document.body.innerHTML = 'Adblock detected';
 *         }
 *     };
 *     const observerToPrevent = new MutationObserver(callback);
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v2.2.9.
 */
/* eslint-enable max-len */

export function trustedReplaceArgument(
    source: Source,
    methodPath: string,
    argumentIndex: string,
    argumentValue: string,
    pattern: string,
    stack = '',
    verbose = 'false',
) {
    // If verbose is 'false', methodPath, argumentIndex, and argumentValue are required.
    // If verbose is 'true', only methodPath is required. It's only used for logging.
    if (
        ((!methodPath || !argumentIndex || !argumentValue) && verbose === 'false')
        || (!methodPath && verbose === 'true')
    ) {
        return;
    }

    // Scriptlet should log when "verbose" is set to "true", "methodPath" is set
    // and no other parameters are provided.
    const SHOULD_LOG_ONLY = verbose === 'true' && !argumentIndex && !argumentValue && !pattern && !stack;

    const MARKERS = {
        JSON: 'json:',
        REPLACE: 'replace:',
    };

    let constantValue;
    let replaceRegexValue: RegExp | string = '';
    let shouldReplaceArgument = false;

    if (argumentValue.startsWith(MARKERS.REPLACE)) {
        const replacementRegexPair = extractRegexAndReplacement(argumentValue);
        if (!replacementRegexPair) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return;
        }
        replaceRegexValue = replacementRegexPair.regexPart;
        constantValue = replacementRegexPair.replacementPart;
        shouldReplaceArgument = true;
    } else if (argumentValue.startsWith(MARKERS.JSON)) {
        try {
            constantValue = JSON.parse(argumentValue.slice(MARKERS.JSON.length));
        } catch (error) {
            logMessage(source, `Invalid JSON argument value: ${argumentValue}`);
            return;
        }
    } else {
        const emptyArr = noopArray();
        const emptyObj = noopObject();
        if (argumentValue === 'undefined') {
            constantValue = undefined;
        } else if (argumentValue === 'false') {
            constantValue = false;
        } else if (argumentValue === 'true') {
            constantValue = true;
        } else if (argumentValue === 'null') {
            constantValue = null;
        } else if (argumentValue === 'emptyArr') {
            constantValue = emptyArr;
        } else if (argumentValue === 'emptyObj') {
            constantValue = emptyObj;
        } else if (argumentValue === 'noopFunc') {
            constantValue = noopFunc;
        } else if (argumentValue === 'noopCallbackFunc') {
            constantValue = noopCallbackFunc;
        } else if (argumentValue === 'trueFunc') {
            constantValue = trueFunc;
        } else if (argumentValue === 'falseFunc') {
            constantValue = falseFunc;
        } else if (argumentValue === 'throwFunc') {
            constantValue = throwFunc;
        } else if (argumentValue === 'noopPromiseResolve') {
            constantValue = noopPromiseResolve;
        } else if (argumentValue === 'noopPromiseReject') {
            constantValue = noopPromiseReject;
        } else if (/^-?\d+$/.test(argumentValue)) {
            constantValue = parseFloat(argumentValue);
            if (nativeIsNaN(constantValue)) {
                return;
            }
        } else {
            constantValue = argumentValue;
        }
    }

    const getPathParts = getPropertyInChain as unknown as (base: Window, chain: string) => {
        base: Record<string, unknown>;
        prop: string;
        chain?: string;
    };

    const { base, chain, prop } = getPathParts(window, methodPath);

    // Undefined `chain` indicates successful reaching the end prop.
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
     * Converts an object to a JSON string, converting functions to their string representation.
     * Required in case if object contains functions, as JSON.stringify does not handle them.
     * For example `{ foo: () => 'bar' }` will be stringified as `{}` by default.
     *
     * @param obj - The object to stringify.
     * @returns The JSON string representation of the object, with functions stringified.
     */
    const stringifyObject = (obj: unknown) => {
        return JSON.stringify(obj, (key, value) => (typeof value === 'function' ? value.toString() : value));
    };

    /**
     * Formats the provided arguments into a readable string for logging purposes.
     *
     * @param args - The array of arguments to format.
     * @param when - Optional. Indicates if the arguments are 'original' or 'modified'.
     *               Defaults to 'original'. Use 'modified' to indicate arguments where modified after replacement.
     * @returns A string representation of the arguments, including their indices and string values.
     */
    const createFormattedMessage = (args: unknown[], when = 'original') => {
        const formattedArgs = args.map((arg, index) => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return `${index}: ${stringifyObject(arg)} // Object converted to string`;
                } catch (e) {
                    // If JSON.stringify fails, fall back to String conversion
                    return `${index}: ${String(arg)} // Object conversion failed`;
                }
            }
            return `${index}: ${String(arg)}`;
        });
        const modifiedOrOriginal = when === 'modified' ? 'modified' : when;
        const message = `${methodPath} ${modifiedOrOriginal} arguments:\n${formattedArgs.join(',\n')}`;
        return message;
    };

    /**
     * Checks whether the provided argument matches the specified pattern and stack trace requirements.
     *
     * @param arg - The argument to check.
     * @returns True if the argument matches the pattern and stack trace (if provided), otherwise false.
     */
    const checkArgument = (arg: unknown) => {
        if (stack && !matchStackTrace(stack, new Error().stack || '')) {
            return false;
        }

        if (pattern) {
            if (typeof arg === 'object' && arg !== null) {
                // If the argument is an object, convert it to a string for pattern matching.
                try {
                    const argString = stringifyObject(arg);
                    return !!argString && toRegExp(pattern).test(argString);
                } catch (error) {
                    logMessage(source, `Failed to stringify argument: ${arg}\nError: ${error}`);
                }
            }

            const argumentContent = String(arg);
            return !!argumentContent && toRegExp(pattern).test(argumentContent);
        }
        return true;
    };

    let isMatchingSuspended = false;

    const applyWrapper = (target: Function, thisArg: any, argumentsList: unknown[]) => {
        if (isMatchingSuspended) {
            isMatchingSuspended = false;
            return Reflect.apply(target, thisArg, argumentsList);
        }
        isMatchingSuspended = true;

        // Log the original arguments before modification
        if (verbose === 'true') {
            const formattedMessage = createFormattedMessage(argumentsList);
            logMessage(source, formattedMessage);
        }

        // If we only need to log the arguments, skip further processing
        if (SHOULD_LOG_ONLY) {
            isMatchingSuspended = false;
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const argumentToReplace = argumentsList[Number(argumentIndex)];

        const shouldSetArgument = checkArgument(argumentToReplace);

        if (!shouldSetArgument) {
            isMatchingSuspended = false;
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (typeof argumentToReplace === 'string' && shouldReplaceArgument) {
            argumentsList[Number(argumentIndex)] = argumentToReplace
                .replace(replaceRegexValue, constantValue as string);
        } else {
            argumentsList[Number(argumentIndex)] = constantValue;
        }

        // Log the modified arguments after replacement
        if (verbose === 'true') {
            const formattedMessage = createFormattedMessage(argumentsList, 'modified');
            logMessage(source, formattedMessage);
        }

        hit(source);

        isMatchingSuspended = false;

        return Reflect.apply(target, thisArg, argumentsList);
    };

    const constructWrapper = (target: Function, argumentsList: unknown[], newTarget: any) => {
        if (isMatchingSuspended) {
            isMatchingSuspended = false;
            return Reflect.construct(target, argumentsList, newTarget);
        }
        isMatchingSuspended = true;

        // Log the original arguments before modification
        if (verbose === 'true') {
            const formattedMessage = createFormattedMessage(argumentsList);
            logMessage(source, formattedMessage);
        }

        // If we only need to log the arguments, skip further processing
        if (SHOULD_LOG_ONLY) {
            isMatchingSuspended = false;
            return Reflect.construct(target, argumentsList, newTarget);
        }

        const argumentToReplace = argumentsList[Number(argumentIndex)];

        const shouldSetArgument = checkArgument(argumentToReplace);

        if (!shouldSetArgument) {
            isMatchingSuspended = false;
            return Reflect.construct(target, argumentsList, newTarget);
        }

        if (typeof argumentToReplace === 'string' && shouldReplaceArgument) {
            argumentsList[Number(argumentIndex)] = argumentToReplace
                .replace(replaceRegexValue, constantValue as string);
        } else {
            argumentsList[Number(argumentIndex)] = constantValue;
        }

        // Log the modified arguments after replacement
        if (verbose === 'true') {
            const formattedMessage = createFormattedMessage(argumentsList, 'modified');
            logMessage(source, formattedMessage);
        }

        hit(source);

        isMatchingSuspended = false;

        return Reflect.construct(target, argumentsList, newTarget);
    };

    const getWrapper = (target: Function, propName: string, receiver: any) => {
        if (propName === 'toString') {
            return target.toString.bind(target);
        }
        return Reflect.get(target, propName, receiver);
    };

    const objectHandler = {
        apply: applyWrapper,
        construct: constructWrapper,
        get: getWrapper,
    };

    base[prop] = new Proxy(nativeMethod, objectHandler);
}

export const trustedReplaceArgumentNames = [
    'trusted-replace-argument',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceArgument.primaryName = trustedReplaceArgumentNames[0];

trustedReplaceArgument.injections = [
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
    matchStackTrace,
    getPropertyInChain,
    extractRegexAndReplacement,
    logMessage,
    // following helpers are needed for helpers above
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    nativeIsNaN,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
];
