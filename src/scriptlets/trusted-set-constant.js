import {
    hit,
    inferValue,
    logMessage,
    createSetChainPropAccessor,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    getDescriptorAddon,
    parseUboOptions,
    unescapeUboArgument,
    getUboConstantValue,
    wrapConstantValue,
    cloakUboFunction,
    runAtUboReadyState,
    getAdgConstantSetting,
    getUboConstantSetting,
    setConstantBySettings,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-constant
 *
 * @description
 * Creates a constant property and assigns it a specified value.
 *
 * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
 *
 * > If empty object is present in chain it will be trapped until chain leftovers appear.
 *
 * > Use [set-constant](./about-scriptlets.md#set-constant) to set predefined values and functions.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-constant', property, value[, stack[, valueWrapper[, ...options]]])
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `value` — required, an arbitrary value to be set; value type is being inferred from the argument,
 *   e.g '500' will be set as number; simple strings that do not match
 *   other types are automatically set as strings, e.g 'yes', 'no', 'allow';
 *   to set string type value that looks like other types,
 *   wrap argument into another pair of quotes, e.g. `'"500"'` for a string;
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if regular expression is invalid it will be skipped
 * - `valueWrapper` – optional, function to modify a constant, as in `set-constant`. Possible wrappers:
 *     - `asFunction` – function returning value
 *     - `asCallback` – function returning callback, that would return value
 *     - `asResolved` – Promise that would resolve with value
 *     - `asRejected` – Promise that would reject with value
 * - `...options` — optional, pairs of a name and a value which follow `valueWrapper`, which may be empty:
 *     - `runAt, value` — set the property when the document is `loading`, `interactive` or `complete`,
 *       instead of at once, i.e. on `DOMContentLoaded` for `interactive`
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g. `example.org##+js(trusted-set, ads.enabled, json:false)`,
 * also by its other name `trusted-set-constant`:
 *
 * ```text
 * example.org##+js(trusted-set, chain, rawValue[, ...options])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `rawValue` — one of:
 *     - `json:` followed by JSON, e.g. `json:"text"` or `json:{"a":1}`
 *     - JSON of an object with `value`, e.g. `{"value": "text"}` sets `text`, not the object
 *     - `undefined`, `false`, `true`, `null`, `''` or empty, `[]` or `emptyArr`, `{}` or `emptyObj`,
 *       `noopFunc`, `trueFunc`, `falseFunc`, `throwFunc`, or an integer between -32767 and 32767;
 *       `noopFunc`, `trueFunc` and `falseFunc` look like native functions named as the property
 *     - any other text is `undefined`, as in uBO, e.g. `visible` or `'1'`
 * - options are pairs of a name and a value which follow `rawValue`:
 *     - `as, value` — `function`, `callback`, `resolved` or `rejected`, to set a function which returns the value,
 *       a function which returns such a function, or a promise of the value
 *     - `runAt, value` — set the property when the document is `loading` or `1`, `interactive` or `2`,
 *       or `complete` or `3`, instead of at once
 * - writes of the page to the property are ignored, also of a value of another type
 * - there is no `stack`
 *
 * ### Examples
 *
 * 1. Set property values of different types
 *
 *     ```adblock
 *     ! Set string value wrapping argument into another pair of quotes
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '"null"')
 *
 *     ✔ window.click_r === 'null'
 *     ✔ typeof window.click_r === 'string'
 *
 *     ! Set inferred null value
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', 'null')
 *
 *     ✔ window.click_r === null
 *     ✔ typeof window.click_r === 'object'
 *
 *     ! Set number type value
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '48')
 *
 *     ✔ window.click_r === 48
 *     ✔ typeof window.click_r === 'number'
 *
 *     ! Set array or object as property value, argument should be a JSON string
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '[1,"string"]')
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '{"aaa":123,"bbb":{"ccc":"string"}}')
 *
 *     ! Set simple string value without quotes
 *     example.org#%#//scriptlet('trusted-set-constant', 'test', 'no')
 *
 *     ✔ window.test === 'no'
 *     ✔ typeof window.test === 'string'
 *     ```
 *
 * 1. Set a function which returns an object, when the document is interactive
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-constant', 'getConsent', '{"ads":false}', '', 'asFunction', 'runAt', 'interactive')
 *
 *     ✔ window.getConsent() // { ads: false }, after DOMContentLoaded
 *     ```
 *
 * 1. Use script stack matching to set value
 *
 *     ```adblock
 *     ! `document.first` will return `1` if the method is related to `checking.js`
 *     example.org#%#//scriptlet('trusted-set-constant', 'document.first', '1', 'checking.js')
 *
 *     ✔ document.first === 1  // if the condition described above is met
 *     ```
 *
 * @added v1.8.2.
 */
/* eslint-enable max-len */
export function trustedSetConstant(source, property, value, stack, ...extraArgs) {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix,
    // and uBO arguments, i.e. named options instead of `stack`
    const constantSetting = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboConstantSetting(property, value, typeof stack === 'undefined' ? extraArgs : [stack].concat(extraArgs))
        : getAdgConstantSetting(source, property, value, stack, extraArgs[0], extraArgs.slice(1));

    if (constantSetting === null) {
        return;
    }

    setConstantBySettings(source, constantSetting);
}

export const trustedSetConstantNames = [
    'trusted-set-constant',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-set-constant.js',
    'ubo-trusted-set-constant',
    'ubo-trusted-set.js',
    'ubo-trusted-set',
];

// eslint-disable-next-line prefer-destructuring
trustedSetConstant.primaryName = trustedSetConstantNames[0];

trustedSetConstant.injections = [
    hit,
    inferValue,
    logMessage,
    createSetChainPropAccessor,
    parseUboOptions,
    unescapeUboArgument,
    getUboConstantValue,
    wrapConstantValue,
    cloakUboFunction,
    runAtUboReadyState,
    getAdgConstantSetting,
    getUboConstantSetting,
    setConstantBySettings,
    // following helpers should be imported and injected
    // because they are used by helpers above
    noopArray,
    noopObject,
    noopFunc,
    noopCallbackFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    getNativeRegexpTest,
    getRegexpTester,
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    getDescriptorAddon,
];
