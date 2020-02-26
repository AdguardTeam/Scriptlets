import { toRegExp, startsWith } from '../helpers/string-utils';
import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setTimeout
 *
 * @description
 * Prevents a `setTimeout` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified delay.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#settimeout-defuserjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-setTimeout"[, <search>[, <delay>]])
 * ```
 *
 * **Parameters**
 * - `search` (optional) string or regular expression that must match the stringified callback . If not set, prevents all `setTimeout` calls.
 * - `delay` (optional) must be an integer. If set, it matches the delay passed to the `setTimeout` call.
 *
 * **Examples**
 *
 * 1. Prevents `setTimeout` calls if the callback contains `value` and the delay is set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setTimeout", "value", "300")
 *     ```
 *
 *     For instance, the followiing call will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value";
 *     }, 300);
 *     ```
 *
 * 2. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet("prevent-setTimeout", "/\.test/")
 *     ```
 *
 *     For instance, the followiing call will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value";
 *     }, 100);
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

    let shouldPrevent = false;
    const timeoutWrapper = (callback, timeout, ...args) => {
        if (shouldLog) {
            hit(source);
            log(`setTimeout("${callback.toString()}", ${timeout})`);
            // return nativeTimeout.apply(window, [callback, timeout, ...args]);
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
            return nativeTimeout(() => { }, timeout);
        }

        return nativeTimeout.apply(window, [callback, timeout, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

preventSetTimeout.names = [
    'prevent-setTimeout',
    'setTimeout-defuser.js',
    'ubo-setTimeout-defuser.js',
    'std.js',
    'ubo-std.js',
];

preventSetTimeout.injections = [toRegExp, startsWith, hit];
