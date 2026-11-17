import { hit } from './hit';
import { logMessage } from './log-message';
import { getPropertyInChain } from './get-property-in-chain';
import { getMethodOwner, getFunctionProxyProperty } from './object-utils';
import { inferValue, splitByPipeRespectingRegex, isValidStrPattern } from './string-utils';
import { isValueMatched } from './value-matchers';
import { getAbortFunc } from './create-on-error-handler';
import { matchStackTrace, addStackTraceMessageLine } from './match-stack';
import { getErrorMessage, getThrownValueMessage } from './get-error-message';
import { getRegexpTester } from './regexp-utils';
import { uboPatternToRegExp } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `suppressNativeMethodBySettings()`, which are parsed from the arguments
 * of `trusted-suppress-native-method` once, by `getAdgSuppressSettings()` or `getUboSuppressSettings()`.
 */
export interface SuppressSettings {
    /**
     * Path to the method, e.g. `Element.prototype.setAttribute`.
     */
    methodPath: string;

    /**
     * Returns true if the arguments of a call match the signature of the rule. It may throw,
     * e.g. if a getter of an argument throws, and the call is not suppressed then.
     */
    isCallMatched: (args: unknown[]) => boolean;

    /**
     * What is done with a matched call: `abort` throws an error, `prevent` returns `undefined`
     * instead of calling the method, and `debug` pauses in the debugger and calls the method.
     */
    how: 'abort' | 'prevent' | 'debug';

    /**
     * Stack trace pattern of `matchStackTrace()`, or an empty string to match any call.
     */
    stack: string;

    /**
     * If true, as for `!` before the stack trace pattern in uBO syntax, the call is matched
     * if the stack trace does not match the pattern.
     */
    isStackNegated: boolean;

    /**
     * If true, as for an empty signature in uBO syntax, the arguments of each call are only logged,
     * and no call is suppressed.
     */
    shouldLogCalls: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-suppress-native-method` as before uBO arguments were supported:
 * - `methodPath` and `signatureStr` are required, otherwise the rule is not applied;
 * - `signatureStr` consists of matchers separated by `|`, which are parsed by `inferValue()` and matched
 *   by `isValueMatched()`, and a single space ignores the argument;
 * - `how` is `abort` by default, and any other value prevents the call.
 *
 * Requires `logMessage`, `inferValue`, `isValueMatched`, `splitByPipeRespectingRegex` and `getErrorMessage`,
 * with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param signatureStr Matchers of the arguments, separated by `|`.
 * @param how `abort`, `prevent` or `debug`, `undefined` for `abort`.
 * @param stack Stack trace pattern.
 *
 * @returns Settings of the rule, or `null` if an argument is missing or invalid.
 */
export const getAdgSuppressSettings = (
    source: Source,
    methodPath: string,
    signatureStr: string,
    how: string | undefined,
    stack: string | undefined,
): SuppressSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const IGNORE_ARG_SYMBOL = ' ';

    if (!methodPath || !signatureStr) {
        return null;
    }

    let signatureMatcher: unknown[];
    try {
        signatureMatcher = splitByPipeRespectingRegex(signatureStr).map((value) => {
            return value === IGNORE_ARG_SYMBOL ? value : inferValue(value);
        });
    } catch (e) {
        logMessage(source, `Could not parse the signature matcher: ${getErrorMessage(e)}`);
        return null;
    }

    /**
     * Matches the arguments of a call with the signature matcher.
     *
     * @param args Arguments of the call.
     * @returns True if each of the signature matchers matches its argument.
     */
    const isCallMatched = (args: unknown[]): boolean => signatureMatcher.every((matcher, i) => {
        return matcher === IGNORE_ARG_SYMBOL || isValueMatched(args[i], matcher);
    });

    // `abort` is the default only if `how` is omitted, an empty one prevents the call, as before
    let howValue: SuppressSettings['how'] = 'prevent';
    if (typeof how === 'undefined' || how === 'abort') {
        howValue = 'abort';
    } else if (how === 'debug') {
        howValue = 'debug';
    }

    return {
        methodPath,
        isCallMatched,
        how: howValue,
        stack: stack || '',
        isStackNegated: false,
        shouldLogCalls: false,
    };
};

/**
 * Parses the arguments of uBO `trusted-suppress-native-method.js`, converted to AdGuard syntax,
 * as uBO `trustedSuppressNativeMethod()` does:
 * - `signature` consists of matchers separated by `|` with optional whitespaces around it,
 *   which are matched against the arguments in the same positions:
 *     - `"text"` — the argument converted to a string contains the text, or matches it if it is
 *       a regular expression, e.g. `"/ads?/i"`;
 *     - `/regexp/` — the argument converted to a string matches the regular expression, without flags;
 *     - `true`, `false`, `null` and `undefined` — the argument is exactly the value;
 *     - any other matcher is ignored, e.g. an empty one, `text` without quotes, a number or an object;
 *   an invalid regular expression matches any argument, as in uBO;
 * - an empty or omitted `signature` only logs the arguments of each call;
 * - `how` is `abort` to throw an error, `debug` to pause in the debugger and call the method,
 *   and anything else, also an omitted one, prevents the call;
 * - `stack` may start with `!` to match the calls whose stack trace does not match the rest of it.
 *
 * Unlike uBO, which throws when the scriptlet runs, an invalid regular expression of `stack` is logged
 * by `suppressNativeMethodBySettings()`, and the rule is not applied.
 * The stack trace is matched by `matchStackTrace()`, as in AdGuard syntax.
 *
 * Requires `logMessage`, `getRegexpTester` and `uboPatternToRegExp`, with their dependencies,
 * in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param signature Matchers of the arguments, separated by `|`.
 * @param how `abort`, `prevent` or `debug`.
 * @param stack Stack trace pattern, possibly negated by `!`.
 *
 * @returns Settings of the rule, or `null` if the path is empty.
 */
export const getUboSuppressSettings = (
    source: Source,
    methodPath: string | undefined,
    signature: string | undefined,
    how: string | undefined,
    stack: string | undefined,
): SuppressSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const SEPARATOR_REGEXP = /\s*\|\s*/;
    const QUOTED_REGEXP = /^".*"$/;
    const REGEXP_LITERAL = /^\/.+\/$/;
    const EXACT_VALUES: Record<string, unknown> = {
        false: false,
        true: true,
        null: null,
        undefined,
    };
    const NEGATION_PREFIX = '!';

    if (!methodPath) {
        return null;
    }

    const signatureStr = signature || '';
    const regexpTester = getRegexpTester();

    /**
     * Returns the regular expression of a pattern matcher, which matches any argument if it is invalid, as in uBO.
     *
     * @param pattern Text or regular expression literal.
     * @returns Regular expression.
     */
    const getPatternRegexp = (pattern: string): RegExp => {
        const regexp = uboPatternToRegExp(pattern);
        if (regexp === null) {
            logMessage(source, `Invalid regular expression matches any argument: ${pattern}`);
            return /^/;
        }
        return regexp;
    };

    /**
     * Matchers of the arguments: a regular expression to test the argument converted to a string,
     * an object with an exact value, or `null` to ignore the argument.
     */
    const matchers = signatureStr.split(SEPARATOR_REGEXP).map((value): RegExp | { value: unknown } | null => {
        if (QUOTED_REGEXP.test(value)) {
            return getPatternRegexp(value.slice(1, -1));
        }
        if (REGEXP_LITERAL.test(value)) {
            return getPatternRegexp(value);
        }
        if (Object.prototype.hasOwnProperty.call(EXACT_VALUES, value)) {
            return { value: EXACT_VALUES[value] };
        }
        return null;
    });

    /**
     * Matches the arguments of a call with the matchers, as uBO does: a missing argument is `undefined`,
     * and an argument is converted to a string by the test of a regular expression.
     *
     * @param args Arguments of the call.
     * @returns True if each of the matchers matches its argument.
     */
    const isCallMatched = (args: unknown[]): boolean => matchers.every((matcher, i) => {
        if (matcher === null) {
            return true;
        }
        const arg = args[i];
        if (matcher instanceof RegExp) {
            return regexpTester(matcher, arg as string);
        }
        return arg === matcher.value;
    });

    let stackPattern = stack || '';
    const isStackNegated = stackPattern.startsWith(NEGATION_PREFIX);
    if (isStackNegated) {
        stackPattern = stackPattern.slice(NEGATION_PREFIX.length);
    }

    let howValue: SuppressSettings['how'] = 'prevent';
    if (how === 'abort' || how === 'debug') {
        howValue = how;
    }

    return {
        methodPath,
        isCallMatched,
        how: howValue,
        stack: stackPattern,
        isStackNegated,
        shouldLogCalls: signatureStr === '',
    };
};

/**
 * Suppresses the calls of the method which match the settings parsed by `getAdgSuppressSettings()`
 * or `getUboSuppressSettings()`, by throwing an error or by returning `undefined` instead of calling it.
 * The method is replaced in the object returned by `getMethodOwner()`, and only its calls on the base object
 * of the path are processed, e.g. of `localStorage.getItem` in `Storage.prototype`.
 *
 * Requires `hit`, `logMessage`, `getPropertyInChain`, `getMethodOwner`, `getAbortFunc`, `matchStackTrace`,
 * `addStackTraceMessageLine`, `getThrownValueMessage`, `isValidStrPattern` and `getFunctionProxyProperty`,
 * with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the rule.
 */
export const suppressNativeMethodBySettings = (source: Source, settings: SuppressSettings): void => {
    const {
        methodPath,
        isCallMatched,
        how,
        stack,
        isStackNegated,
        shouldLogCalls,
    } = settings;

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression,
    // so it is checked once, and the rule is not applied
    if (stack && !isValidStrPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
        return;
    }

    /**
     * getPropertyInChain's return type `ChainBase` only makes sense
     * while traversing the chain, but not to outside receivers.
     *
     * This is done as the least invasive way to make the typings work,
     * compared to @ts-ignore or scattered assertions.
     */
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

    const suppress = how === 'abort'
        ? getAbortFunc()
        : () => {};

    // This flag allows to prevent infinite loops when trapping props that are used by scriptlet's own code.
    let isMatchingSuspended = false;

    /**
     * Checks whether the call should be suppressed, i.e. its stack trace and its arguments match,
     * or logs its arguments if calls are only logged.
     *
     * @param argumentsList Arguments of the call.
     * @param stackTrace Stack trace created by the trap, if `stack` is set, otherwise an empty string.
     * @returns True if the call should be suppressed.
     */
    const isCallSuppressed = (argumentsList: unknown[], stackTrace: string): boolean => {
        if (shouldLogCalls) {
            logMessage(source, `Arguments of ${methodPath}:`);
            logMessage(source, argumentsList, false, false);
            return false;
        }
        return (!stack || matchStackTrace(stack, stackTrace) !== isStackNegated)
            && isCallMatched(argumentsList);
    };

    /**
     * Logs an error of matching a call, e.g. of a getter of an argument which throws, so the call is not suppressed.
     * Error is not converted to get its message, as it may call the page again, e.g. its `toJSON()`,
     * and the error may be a primitive thrown by the page, e.g. by `Error` replaced by it.
     *
     * @param e Error thrown while the call has been matched.
     */
    const logMatchingError = (e: unknown): void => {
        logMessage(source, `Could not match the call: ${getThrownValueMessage(e)}`);
    };

    const handler: ProxyHandler<Function> = {
        apply(target: Function, thisArg: any, argumentsList: unknown[]) {
            if (isMatchingSuspended || (methodOwner !== base && thisArg !== base)) {
                return Reflect.apply(target, thisArg, argumentsList);
            }

            let isMatching = false;
            // Matching is suspended before the stack trace is created, as `Error` may be the method itself
            isMatchingSuspended = true;
            try {
                // Stack trace is created here, in the trap called by the page, and the error message line is added
                // to it, as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
                const stackTrace = stack ? addStackTraceMessageLine(String(new Error().stack || '')) : '';
                isMatching = isCallSuppressed(argumentsList, stackTrace);
            } catch (e) {
                logMatchingError(e);
            } finally {
                // Matching is resumed on every return path, as the next calls would not be processed otherwise
                isMatchingSuspended = false;
            }

            if (!isMatching) {
                return Reflect.apply(target, thisArg, argumentsList);
            }
            if (how === 'debug') {
                // eslint-disable-next-line no-debugger
                debugger;
                return Reflect.apply(target, thisArg, argumentsList);
            }
            hit(source);
            return suppress();
        },
        get: getFunctionProxyProperty,
    };

    // Calls of a constructor by `new` are processed too, in both syntaxes, so that e.g. a rule
    // for `Function.prototype.constructor` is not bypassed by `new`. As in uBO, a constructor
    // is a function whose prototype refers to it, e.g. `Function`, while methods have no prototype
    if ((nativeMethod as Function).prototype?.constructor === nativeMethod) {
        handler.construct = (target: Function, argumentsList: unknown[], newTarget: Function) => {
            if (isMatchingSuspended) {
                return Reflect.construct(target, argumentsList, newTarget);
            }

            let isMatching = false;
            isMatchingSuspended = true;
            try {
                // Stack trace is created here, in the trap called by the page, as in `apply`
                const stackTrace = stack ? addStackTraceMessageLine(String(new Error().stack || '')) : '';
                isMatching = isCallSuppressed(argumentsList, stackTrace);
            } catch (e) {
                logMatchingError(e);
            } finally {
                isMatchingSuspended = false;
            }

            if (!isMatching) {
                return Reflect.construct(target, argumentsList, newTarget);
            }
            if (how === 'debug') {
                // eslint-disable-next-line no-debugger
                debugger;
                return Reflect.construct(target, argumentsList, newTarget);
            }
            hit(source);
            // A prevented call returns no object, so the engine throws a `TypeError`, as in uBO
            return suppress() as unknown as object;
        };
    }

    methodOwner[prop] = new Proxy(nativeMethod as Function, handler);
};
