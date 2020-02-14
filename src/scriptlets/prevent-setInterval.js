import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setInterval
 *
 * @description
 * Prevents a `setInterval` call if the text of the callback is matching the specified search string/regexp and (optionally) have the specified interval.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#setinterval-defuserjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-setInterval"[, <search>[, <interval>]])
 * ```
 *
 * **Parameters**
 * - `search` (optional) string or regular expression that must match the stringified callback . If not set, prevents all `setInterval` calls.
 * - `interval` (optional) must be an integer. If set, it matches the interval passed to the `setInterval` call.
 *
 * **Example**
 *
 * 1. Prevents `setInterval` calls if the callback contains `value` and the interval is set to `300`.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "value", "300")
 *     ```
 *
 *     For instance, the followiing call will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 300);
 *     ```
 *
 * 2. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the interval.
 *     ```
 *     example.org#%#//scriptlet("prevent-setInterval", "/\.test/")
 *     ```
 *
 *     For instance, the followiing call will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 */
/* eslint-enable max-len */
export function preventSetInterval(source, match, interval) {
    const nativeInterval = window.setInterval;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    interval = parseInt(interval, 10);
    interval = nativeIsNaN(interval) ? null : interval;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const intervalWrapper = (cb, d, ...args) => {
        if ((!interval || d === interval) && match.test(cb.toString())) {
            hit(source);
            return nativeInterval(() => { }, d);
        }
        return nativeInterval.apply(window, [cb, d, ...args]);
    };
    window.setInterval = intervalWrapper;
}

preventSetInterval.names = [
    'prevent-setInterval',
    'setInterval-defuser.js',
    'ubo-setInterval-defuser.js',
    'sid.js',
    'ubo-sid.js',
];

preventSetInterval.injections = [toRegExp, hit];
