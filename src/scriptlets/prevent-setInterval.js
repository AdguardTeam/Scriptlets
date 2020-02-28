import { toRegExp, startsWith } from '../helpers/string-utils';
import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setInterval
 *
 * @description
 * Prevents a `setInterval` call if:
 * 1) the text of the callback is matching the specified `search` string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the interval is matching the specified `delay`; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-setInterval"[, <search>[, <delay>]])
 * ```
 *
 * **Parameters**
 *
 * Call with no arguments will log calls to setInterval while debugging,
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` (optional) string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setInterval` calls due to specified `delay`.
 * - `delay` (optional) must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setInterval` call will be matched.
 *
 *  **Examples**
 *
 * 1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet("prevent-setInterval", "/\.test/")
 *     ```
 *
 *     For instance, the followiing call will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setInterval` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "!value")
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
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
 * 3. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "value", "!300")
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
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
 * 4. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "!value", "!300")
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
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
 */
/* eslint-enable max-len */
export function preventSetInterval(source, match, delay) {
    const nativeInterval = window.setInterval;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs setIntervals to console if no arguments have been specified
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

    let shouldPrevent = false;
    const intervalWrapper = (callback, interval, ...args) => {
        if (shouldLog) {
            hit(source);
            log(`setInverval("${callback.toString()}", ${interval})`);
        } else if (!delay) {
            shouldPrevent = match.test(callback.toString()) !== isNotMatch;
        } else if (match === '/.?/') {
            shouldPrevent = (interval === delay) !== isNotDelay;
        } else {
            shouldPrevent = match.test(callback.toString()) !== isNotMatch
                && (interval === delay) !== isNotDelay;
        }

        if (shouldPrevent) {
            hit(source);
            return nativeInterval(() => { }, interval);
        }

        return nativeInterval.apply(window, [callback, interval, ...args]);
    };
    window.setInterval = intervalWrapper;
}

preventSetInterval.names = [
    'prevent-setInterval',
    'no-setInterval-if.js', // new implementation of setInterval-defuser.js
    'ubo-no-setInterval-if.js',
    'setInterval-defuser.js', // old name should be supported as well
    'ubo-setInterval-defuser.js',
    'nosiif.js', // new short name of no-setInterval-if
    'ubo-nosiif.js',
    'sid.js', // old short scriptlet name
    'ubo-sid.js',
];

preventSetInterval.injections = [toRegExp, startsWith, hit];
