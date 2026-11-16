import { hit } from './hit';
import { logMessage } from './log-message';
import {
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
} from './noop-utils';
import { matchStackTrace } from './match-stack';
import { getPropertyInChain } from './get-property-in-chain';
import { getMethodOwner, getFunctionProxyProperty } from './object-utils';
import { extractRegexAndReplacement, toRegExp, stringifyWithFunctions } from './string-utils';
import { getThrownValueMessage } from './get-error-message';
import { nativeIsNaN } from './number-utils';
import { getRegexpTester } from './regexp-utils';
import {
    parseUboOptions,
    uboPatternToRegExp,
    parseUboReplaceDirective,
    getUboConstantValue,
} from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `replaceArguments()`, which are parsed from the arguments of `trusted-replace-argument` once,
 * by `getAdgArgumentReplacement()` or `getUboArgumentReplacement()`.
 */
export interface ArgumentReplacement {
    /**
     * Path to the method, e.g. `Element.prototype.setAttribute`.
     */
    methodPath: string;

    /**
     * Position of the argument to replace, `this` for the object which the method is called on,
     * or `null` to only log the arguments. A position which is not a non-negative integer,
     * e.g. a negative one, replaces no argument.
     */
    position: number | 'this' | null;

    /**
     * Checks whether the argument is replaced, e.g. by the pattern or the condition, and the stack trace.
     * It is called by `replaceArguments()` directly, so a stack trace created in it has the frames of the call.
     */
    isMatched: (arg: unknown) => boolean;

    /**
     * Returns the replaced argument, or the argument itself to keep it.
     */
    replace: (arg: unknown) => unknown;

    /**
     * If true, the argument is set even if it has not changed, as for a constant in AdGuard syntax.
     */
    isSetUnchanged: boolean;

    /**
     * If true, the argument is set even if the call does not have it, so it has more arguments then,
     * as in AdGuard syntax. Otherwise only an argument of the call is set, as in uBO.
     */
    isSetBeyondArguments: boolean;

    /**
     * If true, the original and the modified arguments are logged.
     */
    shouldLog: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-replace-argument`, as they have been parsed before uBO arguments
 * were supported: the rule is not applied without `methodPath`, `argumentIndex` and `argumentValue`,
 * unless `verbose` is `true`, which only logs the arguments if only `methodPath` is set.
 * `argumentIndex` may be `this` to replace the object which the method is called on.
 * `argumentValue` may be `replace:/regex/replacement/`, `json:` followed by JSON, a predefined constant,
 * or a number or text which are set as they are. `pattern` is matched against the argument,
 * an object converted to JSON, and `stack` against the stack trace of the call.
 *
 * Requires `logMessage`, `noopArray`, `noopObject`, `noopCallbackFunc`, `noopFunc`, `trueFunc`, `falseFunc`,
 * `throwFunc`, `noopPromiseReject`, `noopPromiseResolve`, `nativeIsNaN`, `extractRegexAndReplacement`,
 * `matchStackTrace`, `toRegExp`, `getRegexpTester`, `getNativeRegexpTest`, `stringifyWithFunctions`
 * and `getThrownValueMessage`, with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param argumentIndex Index of the argument.
 * @param argumentValue Value to replace the argument with.
 * @param pattern Text or regular expression which the argument has to match.
 * @param stack Text or regular expression which the stack trace of the call has to match.
 * @param verbose `true` to log the arguments.
 *
 * @returns Settings of the replacement, or `null` if the rule is not applied.
 */
export const getAdgArgumentReplacement = (
    source: Source,
    methodPath: string,
    argumentIndex: string,
    argumentValue: string,
    pattern: string,
    stack: string,
    verbose: string,
): ArgumentReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const JSON_MARKER = 'json:';
    const REPLACE_MARKER = 'replace:';
    const THIS_POSITION = 'this';

    // If verbose is 'false', methodPath, argumentIndex, and argumentValue are required.
    // If verbose is 'true', only methodPath is required. It's only used for logging.
    if (
        ((!methodPath || !argumentIndex || !argumentValue) && verbose === 'false')
        || (!methodPath && verbose === 'true')
    ) {
        return null;
    }

    // `test` is saved when the rule runs, so that a rule which intercepts it later, or the page,
    // cannot change the matching, e.g. by replacing the tested text
    const testRegexp = getRegexpTester();

    // Scriptlet should log when "verbose" is set to "true", "methodPath" is set
    // and no other parameters are provided.
    const shouldLogOnly = verbose === 'true' && !argumentIndex && !argumentValue && !pattern && !stack;

    let constantValue: unknown;
    let replaceRegexValue: RegExp | string = '';
    let shouldReplaceArgument = false;

    if (argumentValue.startsWith(REPLACE_MARKER)) {
        const replacementRegexPair = extractRegexAndReplacement(argumentValue);
        if (!replacementRegexPair) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return null;
        }
        replaceRegexValue = replacementRegexPair.regexPart;
        constantValue = replacementRegexPair.replacementPart;
        shouldReplaceArgument = true;
    } else if (argumentValue.startsWith(JSON_MARKER)) {
        try {
            constantValue = JSON.parse(argumentValue.slice(JSON_MARKER.length));
        } catch (error) {
            logMessage(source, `Invalid JSON argument value: ${argumentValue}`);
            return null;
        }
    } else if (argumentValue === 'undefined') {
        constantValue = undefined;
    } else if (argumentValue === 'false') {
        constantValue = false;
    } else if (argumentValue === 'true') {
        constantValue = true;
    } else if (argumentValue === 'null') {
        constantValue = null;
    } else if (argumentValue === 'emptyArr') {
        constantValue = noopArray();
    } else if (argumentValue === 'emptyObj') {
        constantValue = noopObject();
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
            return null;
        }
    } else {
        constantValue = argumentValue;
    }

    let position: number | 'this' | null = null;
    if (!shouldLogOnly) {
        // `this` is the object which the method is called on, as in uBO
        position = argumentIndex === THIS_POSITION ? THIS_POSITION : Number(argumentIndex);
    }

    return {
        methodPath,
        position,
        // The stack trace is created here, called by `replaceArguments()` directly,
        // so it has the same frames as before, when it was created by the function of the scriptlet
        isMatched: (arg: unknown): boolean => {
            if (stack && !matchStackTrace(stack, new Error().stack || '')) {
                return false;
            }

            if (pattern) {
                if (typeof arg === 'object' && arg !== null) {
                    // If the argument is an object, convert it to a string for pattern matching.
                    try {
                        const argString = stringifyWithFunctions(arg);
                        return !!argString && testRegexp(toRegExp(pattern), argString);
                    } catch (error) {
                        // Neither the argument nor the error is converted to a string to be logged, as it would
                        // call the page again, e.g. its `toString()`, which may throw as well, so the argument
                        // would not be converted to a string below, and the error may be a value without a message
                        logMessage(source, `Failed to stringify argument: ${getThrownValueMessage(error)}`);
                    }
                }

                const argumentContent = String(arg);
                return !!argumentContent && testRegexp(toRegExp(pattern), argumentContent);
            }
            return true;
        },
        // In `replace:` mode the argument is converted to a string and the regex replacement is applied;
        // the result is used only if it differs from the converted value, so arguments that do not match
        // the regex keep their original value and type (e.g. numbers). Otherwise it is the constant value.
        replace: (arg: unknown): unknown => {
            if (!shouldReplaceArgument) {
                return constantValue;
            }
            const argumentString = String(arg);
            const replacedArgument = argumentString.replace(replaceRegexValue, constantValue as string);
            return replacedArgument !== argumentString ? replacedArgument : arg;
        },
        isSetUnchanged: !shouldReplaceArgument,
        isSetBeyondArguments: true,
        shouldLog: verbose === 'true',
    };
};

/**
 * Parses the arguments of uBO `trusted-replace-argument`, i.e. of rules converted from uBO syntax,
 * as uBO `trustedReplaceArgument()` does:
 * - `argpos` is an integer, a negative one replaces no argument, as in uBO, `this` replaces the object
 *   which the method is called on, and an empty one only logs the arguments;
 * - `argraw` is `repl:/regex/replacement/flags`, see `parseUboReplaceDirective()`, which converts the argument
 *   to a string, `add:number`, which adds the number to the argument converted to a number,
 *   or a constant, see `getUboConstantValue()`, i.e. any other text is `undefined`;
 * - named options follow `argraw`: `condition, value` is a string or a regular expression which the argument,
 *   converted to a string, has to match, and `as, value` wraps a constant, see `getUboConstantValue()`.
 *
 * The argument is replaced only if it has changed, and only if the call has it. Unlike uBO, which matches any
 * argument by an invalid regular expression of `condition`, it logs it and the rule is not applied.
 *
 * Requires `logMessage`, `parseUboOptions`, `uboPatternToRegExp`, `parseUboReplaceDirective`, `getUboConstantValue`,
 * `getRegexpTester` and `getNativeRegexpTest` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param argpos Position of the argument.
 * @param argraw Value to replace the argument with.
 * @param args Named options which follow `argraw`, e.g. `['condition', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if the rule is not applied.
 */
export const getUboArgumentReplacement = (
    source: Source,
    methodPath: string,
    argpos: string,
    argraw: string,
    args: unknown[],
): ArgumentReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const THIS_POSITION = 'this';
    const REPLACE_PREFIX = 'repl:';
    const ADD_PREFIX = 'add:';

    if (methodPath === '') {
        return null;
    }

    const options = parseUboOptions(args);

    let replace: (arg: unknown) => unknown;
    if (argraw.startsWith(`${REPLACE_PREFIX}/`)) {
        const directive = parseUboReplaceDirective(argraw.slice(REPLACE_PREFIX.length));
        if (directive === null) {
            logMessage(source, `Invalid replacement: ${argraw}`);
            return null;
        }
        replace = (arg: unknown): unknown => `${arg}`.replace(directive.regexp, directive.replacement);
    } else if (argraw.startsWith(ADD_PREFIX)) {
        const delta = parseFloat(argraw.slice(ADD_PREFIX.length));
        if (Number.isNaN(delta)) {
            logMessage(source, `Invalid number to add: ${argraw}`);
            return null;
        }
        replace = (arg: unknown): unknown => Number(arg) + delta;
    } else {
        const value = getUboConstantValue(argraw, options);
        replace = (): unknown => value;
    }

    // `test` is saved when the rule runs, so that a rule which intercepts it later, or the page,
    // cannot change the matching, e.g. by replacing the tested text, as uBO uses the saved one as well
    const testRegexp = getRegexpTester();

    let condition: RegExp | null = null;
    if (options.condition !== undefined) {
        condition = uboPatternToRegExp(`${options.condition}`);
        if (condition === null) {
            logMessage(source, `Invalid regular expression of condition: ${options.condition}`);
            return null;
        }
    }

    let position: number | 'this' | null;
    if (argpos === '') {
        position = null;
    } else if (argpos === THIS_POSITION) {
        position = THIS_POSITION;
    } else {
        // As in uBO, a position which is not a number is the first one
        position = parseInt(argpos, 10) || 0;
    }

    return {
        methodPath,
        position,
        isMatched: (arg: unknown): boolean => {
            if (condition === null) {
                return true;
            }
            condition.lastIndex = 0;
            // The argument is converted to a string by `test()` itself, as in uBO
            return testRegexp(condition, arg as string);
        },
        replace,
        isSetUnchanged: false,
        isSetBeyondArguments: false,
        shouldLog: position === null,
    };
};

/**
 * Replaces an argument of the calls of a method, or the object which it is called on,
 * by the settings parsed from the arguments of `trusted-replace-argument`.
 * The method is replaced by a Proxy in the object returned by `getMethodOwner()`, and only its calls on the base
 * object are processed if they differ. The intercepted method is called once, outside of `try`,
 * so its error is passed to the page as is, while an error of processing the arguments is logged,
 * and the method is called with the original arguments. Processing the arguments never throws,
 * also if logging the error throws, so the wrappers need no `try` of their own, which would catch
 * the error of the method itself.
 *
 * Requires `hit`, `logMessage`, `getPropertyInChain`, `getMethodOwner`, `getFunctionProxyProperty`,
 * `stringifyWithFunctions` and `getThrownValueMessage` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param replacement Settings of the replacement.
 */
export const replaceArguments = (source: Source, replacement: ArgumentReplacement): void => {
    const {
        methodPath,
        position,
        isMatched,
        replace,
        isSetUnchanged,
        isSetBeyondArguments,
        shouldLog,
    } = replacement;

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

    // Method of a storage is replaced in `Storage.prototype`, so only its calls on `base` are processed
    const methodOwner = getMethodOwner(base, prop);
    const nativeMethod = methodOwner[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    /**
     * Formats the provided arguments into a readable string for logging purposes.
     *
     * @param args The array of arguments to format.
     * @param when Indicates if the arguments are 'original' or 'modified'.
     *
     * @returns A string representation of the arguments, including their indices and string values.
     */
    const createFormattedMessage = (args: unknown[], when = 'original'): string => {
        const formattedArgs = args.map((arg, index) => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return `${index}: ${stringifyWithFunctions(arg)} // Object converted to string`;
                } catch (e) {
                    // If JSON.stringify fails, fall back to String conversion
                    return `${index}: ${String(arg)} // Object conversion failed`;
                }
            }
            return `${index}: ${String(arg)}`;
        });
        return `${methodPath} ${when} arguments:\n${formattedArgs.join(',\n')}`;
    };

    let isMatchingSuspended = false;

    /**
     * Logs the arguments of the intercepted call, and replaces the target one if it matches.
     *
     * The arguments are replaced in a copy, so the original ones are returned if an error occurs,
     * which is logged, and the intercepted method is called once by the wrapper anyway.
     *
     * @param argumentsList Arguments of the intercepted call.
     * @param thisArg Object which the method is called on.
     *
     * @returns Arguments and the object to call the intercepted method with.
     */
    const processArguments = (
        argumentsList: unknown[],
        thisArg: unknown,
    ): { args: unknown[]; thisArg: unknown } => {
        const original = { args: argumentsList, thisArg };
        isMatchingSuspended = true;
        try {
            // Log the original arguments before modification
            if (shouldLog) {
                logMessage(source, createFormattedMessage(argumentsList));
            }

            // If we only need to log the arguments, skip further processing
            if (position === null) {
                return original;
            }

            const isThis = position === 'this';
            const index = isThis ? -1 : position;
            const argumentToReplace = isThis ? thisArg : argumentsList[index];

            if (!isMatched(argumentToReplace)) {
                return original;
            }

            const modified = { args: argumentsList.slice(), thisArg };
            const replacedArgument = replace(argumentToReplace);
            const isChanged = replacedArgument !== argumentToReplace;
            if (isThis) {
                if (isChanged) {
                    modified.thisArg = replacedArgument;
                }
            } else if (
                // Only operators are used, as the intercepted method may be `Number` itself
                index % 1 === 0
                && index >= 0
                && (isChanged || isSetUnchanged)
                && (index < argumentsList.length || isSetBeyondArguments)
            ) {
                modified.args[index] = replacedArgument;
            }

            // Log the modified arguments after replacement
            if (shouldLog) {
                logMessage(source, createFormattedMessage(modified.args, 'modified'));
            }

            hit(source);

            return modified;
        } catch (error) {
            // Error is not converted to get its message, as it may call the page again, e.g. its `toJSON()`,
            // and the error may be `null` thrown by the page, e.g. by `Error` replaced by it, which has no message.
            // Logging calls `console.log()` of the page, which may throw as well, but the call of the page
            // has to reach the intercepted method anyway, with the original arguments
            try {
                logMessage(source, `Unexpected error during argument replacement: ${getThrownValueMessage(error)}`);
            } catch {
                // nothing to do, the error cannot be logged
            }
            return original;
        } finally {
            isMatchingSuspended = false;
        }
    };

    // The intercepted method is called once by the wrappers, outside of `try`,
    // so its error is passed to the page as is, and it is not called again

    const applyWrapper = (target: Function, thisArg: unknown, argumentsList: unknown[]): unknown => {
        // Calls on another storage are not processed
        if (isMatchingSuspended || (methodOwner !== base && thisArg !== base)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const call = processArguments(argumentsList, thisArg);
        return Reflect.apply(target, call.thisArg, call.args);
    };

    const constructWrapper = (target: Function, argumentsList: unknown[], newTarget: Function): object => {
        if (isMatchingSuspended) {
            return Reflect.construct(target, argumentsList, newTarget);
        }

        return Reflect.construct(target, processArguments(argumentsList, undefined).args, newTarget);
    };

    const objectHandler = {
        apply: applyWrapper,
        construct: constructWrapper,
        get: getFunctionProxyProperty,
    };

    methodOwner[prop] = new Proxy(nativeMethod as Function, objectHandler);
};
