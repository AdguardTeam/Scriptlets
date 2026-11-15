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
    getMethodOwner,
    getFunctionProxyProperty,
    extractRegexAndReplacement,
    logMessage,
    getThrownValueMessage,
    toRegExp,
    stringifyWithFunctions,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    nativeIsNaN,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboReplaceDirective,
    getUboConstantValue,
    getAdgArgumentReplacement,
    getUboArgumentReplacement,
    replaceArguments,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-argument
 *
 * @description
 * Replaces a specific argument of a native method with a constant value, JSON parsed value,
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
 * - `argumentIndex` – required, string index of the argument to replace (0-based),
 *   or `this` to replace the object which the method is called on, e.g. the string of `String.prototype.includes`.
 *   `pattern` is matched against that object then.
 * - `argumentValue` – required, string value to set for the argument.
 *   If it starts with `replace:`, it is treated as a replacement pattern in the format `replace:/regex/replacement/`.
 *   To replace all occurrences of a pattern, the replacement string must include the global flag `g`, like this: `replace:/foo/bar/g`, otherwise only the first occurrence will be replaced.
 *   If the matched argument is not a string, it is converted to a string before applying the replacement,
 *   and the argument is modified only when the replacement changes the resulting value;
 *   otherwise the original value and its type are kept.
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
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-replace-argument, JSON.parse, 0, repl:/"ads":true/"ads":false/, condition, ads)`:
 *
 * ```text
 * example.org##+js(trusted-replace-argument, propChain, argpos, argraw[, ...options])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `argpos` — position of the argument, `this` for the object which the method is called on,
 *   or empty to log the arguments; a negative position replaces no argument, as in uBO
 * - `argraw` — one of:
 *     - `repl:/regex/replacement/flags` — replaces the matches in the argument converted to a string,
 *       e.g. `repl:/ads/no_ads/g`; `\/` is a slash in the regular expression or the replacement
 *     - `add:number` — adds the number to the argument converted to a number
 *     - `json:` followed by JSON, e.g. `json:"text"`, or JSON of an object with `value`, e.g. `{"value": "text"}`
 *     - `undefined`, `false`, `true`, `null`, `''` or empty, `[]` or `emptyArr`, `{}` or `emptyObj`,
 *       `noopFunc`, `trueFunc`, `falseFunc`, `throwFunc`, or an integer between -32767 and 32767
 *     - any other text is `undefined`, as in uBO
 * - options are pairs of a name and a value which follow `argraw`:
 *     - `condition, value` — string or regular expression which the argument, converted to a string, has to match
 *     - `as, value` — `function`, `callback`, `resolved` or `rejected`, to replace the argument with a function
 *       which returns the value, a function which returns such a function, or a promise of the value
 * - the argument is replaced only if it has changed, and only if the call has it
 * - a rule with an invalid regular expression is not applied
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
 * 1. Replace the string which `String.prototype.includes` is called on, if the pattern matches it:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-argument', 'String.prototype.includes', 'this', 'replace:/firefox/chrome/', 'mozilla/5.0')
 *     ```
 *
 *     For instance, the following call will return `true`:
 *
 *     ```html
 *     navigator.userAgent.toLowerCase().includes('chrome');
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
    ...extraArgs: string[]
) {
    let argumentReplacement;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix,
    // and uBO arguments, i.e. named options instead of `pattern`, `stack` and `verbose`
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        argumentReplacement = getUboArgumentReplacement(
            source,
            typeof methodPath === 'string' ? unescapeUboArgument(methodPath) as string : '',
            typeof argumentIndex === 'string' ? unescapeUboArgument(argumentIndex) as string : '',
            typeof argumentValue === 'string' ? unescapeUboArgument(argumentValue) as string : '',
            extraArgs.map(unescapeUboArgument),
        );
    } else {
        const pattern = extraArgs[0];
        const stack = typeof extraArgs[1] !== 'undefined' ? extraArgs[1] : '';
        const verbose = typeof extraArgs[2] !== 'undefined' ? extraArgs[2] : 'false';
        argumentReplacement = getAdgArgumentReplacement(
            source,
            methodPath,
            argumentIndex,
            argumentValue,
            pattern,
            stack,
            verbose,
        );
    }

    if (argumentReplacement === null) {
        return;
    }

    replaceArguments(source, argumentReplacement);
}

export const trustedReplaceArgumentNames = [
    'trusted-replace-argument',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-replace-argument.js',
    'ubo-trusted-replace-argument',
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
    getMethodOwner,
    getFunctionProxyProperty,
    extractRegexAndReplacement,
    logMessage,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboReplaceDirective,
    getUboConstantValue,
    getAdgArgumentReplacement,
    getUboArgumentReplacement,
    replaceArguments,
    // following helpers are needed for helpers above
    toRegExp,
    stringifyWithFunctions,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    nativeIsNaN,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
];
