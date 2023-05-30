import {
    hit,
    noopFunc,
    isPreventionNeeded,
    logMessage,
    // following helpers are needed for helpers above
    toRegExp,
    nativeIsNaN,
    parseMatchArg,
    parseDelayArg,
    isValidCallback,
    isValidMatchStr,
    isValidStrPattern,
    escapeRegExp,
    nativeIsFinite,
    isValidMatchNumber,
    parseRawDelay,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setInterval
 *
 * @description
 * Prevents a `setInterval` call if:
 *
 * 1. The text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
 *    otherwise mismatched calls should be defused.
 * 1. The delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-setInterval'[, matchCallback[, matchDelay]])
 * ```
 *
 * > Call with no arguments will log all setInterval calls (`log-setInterval` superseding),
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * - `matchCallback` — optional, string or regular expression;
 *   invalid regular expression will be skipped and all callbacks will be matched.
 *   If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 *   If do not start with `!`, the stringified callback will be matched.
 *   If not set, prevents all `setInterval` calls due to specified `matchDelay`.
 * - `matchDelay` — optional, must be an integer.
 *   If starts with `!`, scriptlet will not match the delay but all other will be defused.
 *   If do not start with `!`, the delay passed to the `setInterval` call will be matched.
 *   Decimal delay values will be rounded down, e.g `10.95` will be matched by `matchDelay` with value `10`.
 *
 * > If `prevent-setInterval` log looks like `setInterval(undefined, 1000)`,
 * > it means that no callback was passed to setInterval() and that's not scriptlet issue
 * > and obviously it can not be matched by `matchCallback`.
 *
 * ### Examples
 *
 * 1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-setInterval', '/\.test/')
 *     ```
 *
 *     For instance, the following call will be prevented:
 *
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 1. Prevents `setInterval` calls if the callback does not contain `value`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-setInterval', '!value')
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
 *
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "test -- prevented";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setInterval(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 *
 * 1. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-setInterval', 'value', '!300')
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
 *
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value 1 -- executed";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "value 2 -- prevented";
 *     }, 400);
 *     setInterval(function () {
 *         window.test = "value 3 -- prevented";
 *     }, 500);
 *     ```
 *
 * 1. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-setInterval', '!value', '!300')
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
 *
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "test -- executed";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "test -- prevented";
 *     }, 400);
 *     setInterval(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setInterval(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 *
 * 1. Prevents `setInterval` calls if the callback contains `value` and delay is a decimal number
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-setInterval', 'value', '300')
 *     ```
 *
 *     For instance, the following calls will be prevented:
 *
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 300 + Math.random());
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function preventSetInterval(source, matchCallback, matchDelay) {
    // logs setIntervals to console if no arguments have been specified
    const shouldLog = ((typeof matchCallback === 'undefined') && (typeof matchDelay === 'undefined'));

    const handlerWrapper = (target, thisArg, args) => {
        const callback = args[0];
        const delay = args[1];
        let shouldPrevent = false;
        if (shouldLog) {
            hit(source);
            // https://github.com/AdguardTeam/Scriptlets/issues/105
            logMessage(source, `setInterval(${String(callback)}, ${delay})`, true);
        } else {
            shouldPrevent = isPreventionNeeded({
                callback,
                delay,
                matchCallback,
                matchDelay,
            });
        }
        if (shouldPrevent) {
            hit(source);
            args[0] = noopFunc;
        }
        return target.apply(thisArg, args);
    };

    const setIntervalHandler = {
        apply: handlerWrapper,
    };

    window.setInterval = new Proxy(window.setInterval, setIntervalHandler);
}

preventSetInterval.names = [
    'prevent-setInterval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setInterval-if.js', // new implementation of setInterval-defuser.js
    'ubo-no-setInterval-if.js',
    'setInterval-defuser.js', // old name should be supported as well
    'ubo-setInterval-defuser.js',
    'nosiif.js', // new short name of no-setInterval-if
    'ubo-nosiif.js',
    'sid.js', // old short scriptlet name
    'ubo-sid.js',
    'ubo-no-setInterval-if',
    'ubo-setInterval-defuser',
    'ubo-nosiif',
    'ubo-sid',
];

preventSetInterval.injections = [
    hit,
    noopFunc,
    isPreventionNeeded,
    logMessage,
    // following helpers should be injected as helpers above use them
    toRegExp,
    nativeIsNaN,
    parseMatchArg,
    parseDelayArg,
    isValidCallback,
    isValidMatchStr,
    isValidStrPattern,
    escapeRegExp,
    nativeIsFinite,
    isValidMatchNumber,
    parseRawDelay,
];
