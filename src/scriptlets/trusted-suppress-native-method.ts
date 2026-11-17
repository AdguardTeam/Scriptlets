import {
    hit,
    logMessage,
    getPropertyInChain,
    getMethodOwner,
    inferValue,
    isValueMatched,
    getAbortFunc,
    matchStackTrace,
    addStackTraceMessageLine,
    getErrorMessage,
    getThrownValueMessage,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    toRegExp,
    nativeIsNaN,
    randomId,
    createOnErrorHandler,
    isEmptyObject,
    isArbitraryObject,
    isStringMatched,
    isArrayMatched,
    isObjectMatched,
    backupRegExpValues,
    restoreRegExpValues,
    splitByPipeRespectingRegex,
    getFunctionProxyProperty,
    isValidStrPattern,
    uboPatternToRegExp,
    unescapeUboArgument,
    getAdgSuppressSettings,
    getUboSuppressSettings,
    suppressNativeMethodBySettings,
} from '../helpers';
import { type Source } from './scriptlets';

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
 *     - `prevent` – replaces the method call with the call of an empty function,
 *     - `debug` – pauses in the debugger, if the developer tools are open, and calls the method,
 *       e.g. to find the code which calls it.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 *
 * If the method is a constructor, e.g. `Function.prototype.constructor`, its calls by `new` are suppressed too,
 * but `new` of a matched call throws an error also with `prevent`, as it has to return an object.
 * Use `prevent-constructor` to get an object which does nothing instead.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments,
 * e.g. `example.org##+js(trusted-suppress-native-method, eval, '"ads"')`:
 *
 * ```text
 * example.org##+js(trusted-suppress-native-method, methodPath[, signature[, how[, stack]]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * <!-- markdownlint-disable line-length -->
 *
 * - `signature` — matchers separated by `|`, which are matched against the arguments in the same positions;
 *   a signature with quotes has to be wrapped in single quotes, e.g. `'"ads"'`, as uBO removes the outer quotes
 *   of an argument, so `"ads"` is `ads` without quotes, which matches any argument:
 *     - `"text"` — the argument converted to a string contains the text, or matches it if it is a regular expression, e.g. `"/ads?/i"`
 *     - `/regexp/` — the argument converted to a string matches the regular expression, which has no flags
 *     - `true`, `false`, `null` and `undefined` — the argument is exactly the value
 *     - any other matcher, e.g. an empty one, a text without quotes, a number or an object, matches any argument
 * - an empty or omitted `signature` only logs the arguments of each call, without suppressing it
 * - `how` — an omitted one prevents the call, as any value other than `abort` and `debug`
 * - `stack` — may start with `!` to match the calls whose stack trace does not match the rest of it
 *
 * <!-- markdownlint-enable line-length -->
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
    signatureStr?: string,
    how?: string,
    stack?: string,
) {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments,
    // in which the signature and `how` may be omitted
    const settings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboSuppressSettings(
            source,
            methodPath,
            unescapeUboArgument(signatureStr) as string | undefined,
            how,
            unescapeUboArgument(stack) as string | undefined,
        )
        : getAdgSuppressSettings(source, methodPath, signatureStr as string, how, stack);

    if (settings === null) {
        return;
    }

    suppressNativeMethodBySettings(source, settings);
}

export const trustedSuppressNativeMethodNames = [
    'trusted-suppress-native-method',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-suppress-native-method.js',
    'ubo-trusted-suppress-native-method',
];

// eslint-disable-next-line prefer-destructuring
trustedSuppressNativeMethod.primaryName = trustedSuppressNativeMethodNames[0];

trustedSuppressNativeMethod.injections = [
    hit,
    logMessage,
    getPropertyInChain,
    getMethodOwner,
    inferValue,
    isValueMatched,
    getAbortFunc,
    matchStackTrace,
    addStackTraceMessageLine,
    getErrorMessage,
    getThrownValueMessage,
    splitByPipeRespectingRegex,
    getFunctionProxyProperty,
    isValidStrPattern,
    uboPatternToRegExp,
    unescapeUboArgument,
    getAdgSuppressSettings,
    getUboSuppressSettings,
    suppressNativeMethodBySettings,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    toRegExp,
    nativeIsNaN,
    randomId,
    createOnErrorHandler,
    isEmptyObject,
    isArbitraryObject,
    isStringMatched,
    isArrayMatched,
    isObjectMatched,
    backupRegExpValues,
    restoreRegExpValues,
];
