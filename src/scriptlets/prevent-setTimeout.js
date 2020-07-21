import {
    hit, noopFunc, toRegExp, startsWith,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setTimeout
 *
 * @description
 * Prevents a `setTimeout` call if:
 * 1) the text of the callback is matching the specified search string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the timeout is matching the specified delay; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-setTimeout'[, search[, delay]])
 * ```
 *
 * Call with no arguments will log calls to setTimeout while debugging (`log-setTimeout` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` - optional, string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setTimeout` calls due to specified `delay`.
 * - `delay` - optional, must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
 *
 * **Examples**
 * 1. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet('prevent-setTimeout', '/\.test/')
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setTimeout` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', '!value')
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "test -- prevented";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setTimeout(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 *
 * 3. Prevents `setTimeout` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', 'value', '!300')
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value 1 -- executed";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "value 2 -- prevented";
 *     }, 400);
 *     setTimeout(function () {
 *         window.test = "value 3 -- prevented";
 *     }, 500);
 *     ```
 *
 * 4. Prevents `setTimeout` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', '!value', '!300')
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "test -- executed";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "test -- prevented";
 *     }, 400);
 *     setTimeout(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setTimeout(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 */
/* eslint-enable max-len */
export function preventSetTimeout(source, match, delay) {
    const nativeTimeout = window.setTimeout;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs setTimeouts to console if no arguments have been specified
    const shouldLog = ((typeof match === 'undefined') && (typeof delay === 'undefined'));

    const INVERT_MARKER = '!';

    const isNotMatch = startsWith(match, INVERT_MARKER);
    if (isNotMatch) {
        match = match.slice(1);
    }
    const isNotDelay = startsWith(delay, INVERT_MARKER);
    if (isNotDelay) {
        delay = delay.slice(1);
    }

    delay = parseInt(delay, 10);
    delay = nativeIsNaN(delay) ? null : delay;

    match = match ? toRegExp(match) : toRegExp('/.?/');

    const timeoutWrapper = (callback, timeout, ...args) => {
        let shouldPrevent = false;
        if (shouldLog) {
            hit(source);
            log(`setTimeout("${callback.toString()}", ${timeout})`);
        } else if (!delay) {
            shouldPrevent = match.test(callback.toString()) !== isNotMatch;
        } else if (match === '/.?/') {
            shouldPrevent = (timeout === delay) !== isNotDelay;
        } else {
            shouldPrevent = match.test(callback.toString()) !== isNotMatch
                && (timeout === delay) !== isNotDelay;
        }

        if (shouldPrevent) {
            hit(source);
            return nativeTimeout(noopFunc, timeout);
        }

        return nativeTimeout.apply(window, [callback, timeout, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

preventSetTimeout.names = [
    'prevent-setTimeout',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setTimeout-if.js', // new implementation of setTimeout-defuser.js
    'ubo-no-setTimeout-if.js',
    'setTimeout-defuser.js', // old name should be supported as well
    'ubo-setTimeout-defuser.js',
    'nostif.js', // new short name of no-setTimeout-if
    'ubo-nostif.js',
    'std.js', // old short scriptlet name
    'ubo-std.js',
    'ubo-no-setTimeout-if',
    'ubo-setTimeout-defuser',
    'ubo-nostif',
    'ubo-std',
];

preventSetTimeout.injections = [toRegExp, startsWith, hit, noopFunc];
