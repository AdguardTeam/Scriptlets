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
 * Replaces a specific argument of a native method with a constant value or a value derived from a regular expression replacement.
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
 * - `argumentValue` – required, string value to set for the argument. If it starts with `replace:`, it is treated as a replacement pattern in the format `replace:/regex/replacement/`.
 *   To replace all occurrences of a pattern, the replacement string must include the global flag `g`, like this: `replace:/foo/bar/g`, otherwise only the first occurrence will be replaced.
 *   If it does not start with `replace:`, it is treated as a constant value to set for the argument or one of the predefined constants:
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
 * <!-- markdownlint-enable line-length -->
 *
 * @added unknown.
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
    // If verbose is 'false', require methodPath, argumentIndex, and argumentValue.
    // If verbose is 'true', require at least methodPath. It's only used for logging.
    if (
        ((!methodPath || !argumentIndex || !argumentValue) && verbose === 'false')
        || (!methodPath && verbose === 'true')
    ) {
        return;
    }

    // Scriptlet should log when "verbose" is set to "true", "methodPath" is set
    // and no other parameters are provided.
    const SHOULD_LOG_ONLY = verbose === 'true' && !argumentIndex && !argumentValue && !pattern && !stack;

    const SLASH = '/';
    const REPLACE_MARKER = 'replace:';

    let constantValue;
    let replaceRegexValue: RegExp | string = '';
    let shouldReplaceArgument = false;

    /**
     * Parses a string in the format 'replace:/regex/replacement/' and extracts the regex and replacement parts.
     *
     * @param str - The argument value string to parse, expected to start with 'replace:' and be in the
     *   format 'replace:/regex/replacement/'.
     * @returns An object with the RegExp or string for the regex part and the replacement string,
     *   or undefined if the format is invalid.
     */
    const getReplacementAndRegexValue = (
        str: string,
    ): { regexPart: RegExp | string; replacementPart: string } | undefined => {
        let regexWithReplacement = str.slice(REPLACE_MARKER.length);
        let regexFlags = '';

        // Support for /g flag at the end
        if (regexWithReplacement.endsWith('/g')) {
            regexWithReplacement = regexWithReplacement.slice(0, -1);
            regexFlags = 'g';
        }

        // Must start with a slash
        if (!regexWithReplacement.startsWith('/')) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return undefined;
        }

        // Must end with a slash
        if (!regexWithReplacement.endsWith('/')) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return undefined;
        }

        // Remove the leading and trailing slashes
        const content = regexWithReplacement.slice(1, -1);

        // Find the delimiter slash that separates regex from replacement
        // We need to find the first unescaped slash
        let delimiterIndex = -1;
        for (let i = 0; i < content.length; i += 1) {
            if (content[i] === '/') {
                // Check if this slash is escaped by looking at preceding backslashes
                let slashIsEscaped = false;
                let backslashIndex = i - 1;
                while (backslashIndex >= 0 && content[backslashIndex] === '\\') {
                    slashIsEscaped = !slashIsEscaped;
                    backslashIndex -= 1;
                }
                // If not escaped, this is our delimiter
                if (!slashIsEscaped) {
                    delimiterIndex = i;
                    break;
                }
            }
        }

        if (delimiterIndex === -1) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return undefined;
        }

        // Add slashes at the beginning and end of the regex part
        // and add the flag if it was found
        const regex = `${SLASH}${content.slice(0, delimiterIndex)}${SLASH}${regexFlags}`;
        const replacement = content.slice(delimiterIndex + 1);

        if (!regex) {
            logMessage(source, `Empty regex in argument value: ${argumentValue}`);
            return undefined;
        }

        replaceRegexValue = toRegExp(regex);
        if (!replaceRegexValue) {
            logMessage(source, `Invalid regex in argument value: ${argumentValue}`);
            return undefined;
        }

        const objReplacementWithRegex = {
            regexPart: replaceRegexValue,
            replacementPart: replacement,
        };

        return objReplacementWithRegex;
    };

    if (argumentValue.startsWith(REPLACE_MARKER)) {
        const replacementRegexPair = getReplacementAndRegexValue(argumentValue);
        if (!replacementRegexPair) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return;
        }
        replaceRegexValue = replacementRegexPair.regexPart;
        constantValue = replacementRegexPair.replacementPart;
        shouldReplaceArgument = true;
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
     * Formats the provided arguments into a readable string for logging purposes.
     *
     * @param args - The array of arguments to format.
     * @returns A string representation of the arguments, including their indices and string values.
     */
    const createFormattedMessage = (args: unknown[], when = '') => {
        const formattedArgs = args.map((arg, index) => {
            return `${index}: ${String(arg)}`;
        });
        const modifiedOrOriginal = when === 'modified' ? 'modified' : 'original';
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
