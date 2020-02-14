import { toRegExp } from '../helpers/string-utils';
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
    delay = parseInt(delay, 10);
    delay = nativeIsNaN(delay) ? null : delay;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const timeoutWrapper = (cb, d, ...args) => {
        if ((!delay || d === delay) && match.test(cb.toString())) {
            hit(source);
            return nativeTimeout(() => { }, d);
        }
        return nativeTimeout.apply(window, [cb, d, ...args]);
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

preventSetTimeout.injections = [toRegExp, hit];
