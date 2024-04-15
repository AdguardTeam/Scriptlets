import {
    hit,
    logMessage,
    getPropertyInChain,
    inferValue,
    isValueMatched,
    getAbortFunc,
    matchStackTrace,
    getErrorMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    toRegExp,
    nativeIsNaN,
    randomId,
    createOnErrorHandler,
    isEmptyObject,
    isArbitraryObject,
    isStringMatched,
    isArrayMatched,
    isObjectMatched,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-suppress-native-method
 *
 * @description
 * Prevents a call of a given native method, matching the call by incoming arguments.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-suppress-native-method', methodPath, signatureStr[, how[, stack]])
 * ```
 *
 * <!-- markdownlint-disable line-length -->
 *
 * - `methodPath` – required, string path to a native method (joined with `.` if needed). The property must be attached to `window`.
 * - `signatureStr` –  required, string of `|`-separated argument matchers.
 * Supported value types with corresponding matchers:
 *
 *     - string – exact string, part of the string or regexp pattern. Empty string `""` to match an empty string. Regexp patterns inside object matchers are not supported.
 *     - number, boolean, null, undefined – exact value,
 *
 *     - object – partial of the object with the values as mentioned above, i.e by another object, that includes property names and values to be matched,
 *     - array – partial of the array with the values to be included in the incoming array, without considering the order of values.
 *
 * To ignore specific argument, explicitly use whitespace as a matcher, e.g `' | |{"prop":"val"}'` to skip matching first and second arguments.
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `how` – optional, string, one of the following:
 *     - `abort` – default, aborts the call by throwing an error,
 *     - `prevent` – replaces the method call with the call of an empty function.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 *
 * ### Examples
 * <!-- markdownlint-disable-next-line line-length -->
 * 1. Prevent `localStorage.setItem('test-key', 'test-value')` call matching first argument by regexp pattern and the second one by substring:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'localStorage.setItem', '/key/|"value"', 'prevent')
 *     ```
 *
 * 1. Abort `obj.hasOwnProperty('test')` call matching the first argument:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'Object.prototype.hasOwnProperty', '"test"')
 *     ```
 *
 * 1. Prevent `Node.prototype.appendChild` call on element with the id `test-id` by object matcher:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'Node.prototype.appendChild', '{"id":"str"}', 'prevent')
 *     ```
 *
 * 1. Abort all `document.querySelectorAll` calls with `div` as the first argument:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'Document.prototype.querySelectorAll', '"div"')
 *     ```
 *
 * 1. Abort `Array.prototype.concat([1, 'str', true, null])` calls by matching array argument contents:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'Array.prototype.concat', '[1, "str", true]')
 *     ```
 *
 * 1. Use `stack` argument to match by the call, while also matching the second argument:
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-suppress-native-method', 'sessionStorage.setItem', ' |"item-value"', 'abort', 'someFuncName')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * @added v1.10.25.
 */
/* eslint-enable max-len */
export function trustedSuppressNativeMethod(
    source: Source,
    methodPath: string,
    signatureStr: string,
    how = 'abort',
    stack = '',
) {
    if (!methodPath || !signatureStr) {
        return;
    }

    const IGNORE_ARG_SYMBOL = ' ';

    const suppress = how === 'abort'
        ? getAbortFunc()
        : () => {};

    let signatureMatcher: unknown[];
    try {
        signatureMatcher = signatureStr.split('|').map((value) => {
            return value === IGNORE_ARG_SYMBOL ? value : inferValue(value);
        });
    } catch (e) {
        logMessage(source, `Could not parse the signature matcher: ${getErrorMessage(e)}`);
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

    const nativeMethod = base[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    /**
     * Matches the incoming arguments with the signature matcher.
     *
     * @param nativeArguments original arguments of the native method call
     * @param matchArguments matcher to match against the native argument
     * @returns true, if each of the signature matchers match their corresponding argument.
     */
    function matchMethodCall(
        nativeArguments: unknown[],
        matchArguments: unknown[],
    ): boolean {
        return matchArguments.every((matcher, i) => {
            if (matcher === IGNORE_ARG_SYMBOL) {
                return true;
            }

            const argument = nativeArguments[i];
            return isValueMatched(argument, matcher);
        });
    }

    // This flag allows to prevent infinite loops when trapping props that are used by scriptlet's own code.
    let isMatchingSuspended = false;

    function apply(target: Function, thisArg: any, argumentsList: unknown[]) {
        if (isMatchingSuspended) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        isMatchingSuspended = true;

        if (stack && !matchStackTrace(stack, new Error().stack || '')) {
            return Reflect.apply(target, thisArg, argumentsList);
        }
        const isMatching = matchMethodCall(argumentsList, signatureMatcher);

        isMatchingSuspended = false;

        if (isMatching) {
            hit(source);
            return suppress();
        }

        return Reflect.apply(target, thisArg, argumentsList);
    }

    base[prop] = new Proxy(nativeMethod, { apply });
}

trustedSuppressNativeMethod.names = [
    'trusted-suppress-native-method',
];

trustedSuppressNativeMethod.injections = [
    hit,
    logMessage,
    getPropertyInChain,
    inferValue,
    isValueMatched,
    getAbortFunc,
    matchStackTrace,
    getErrorMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    toRegExp,
    nativeIsNaN,
    randomId,
    createOnErrorHandler,
    isEmptyObject,
    isArbitraryObject,
    isStringMatched,
    isArrayMatched,
    isObjectMatched,
];
