import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-window-open
 *
 * @description
 * Prevents `window.open` calls when URL either matches or not matches the specified string/regexp. Using it without parameters prevents all `window.open` calls.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#windowopen-defuserjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-window-open'[, <match>[, <search>]])
 * ```
 *
 * **Parameters**
 * - `match` (optional) defaults to "matching", any positive number for "matching", 0 or any string for "not matching",
 * - `search` (optional) string or regexp for matching the URL passed to `window.open` call.
 *
 * **Example**
 *
 * 1. Prevent all `window.open` calls:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open')
 * ```
 *
 * 2. Prevent `window.open` for all URLs containing `example`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '1', 'example')
 * ```
 *
 * 3. Prevent `window.open` for all URLs matching RegExp `/example\./`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '1', '/example\./')
 * ```
 *
 * 4. Prevent `window.open` for all URLs **NOT** containing `example`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '0', 'example')
 * ```
 */
/* eslint-enable max-len */
export function preventWindowOpen(source, inverse, match) {
    const nativeOpen = window.open;

    inverse = inverse
        ? !(+inverse)
        : !!inverse;
    match = match
        ? toRegExp(match)
        : toRegExp('/.?/');

    // eslint-disable-next-line consistent-return
    const openWrapper = (str, ...args) => {
        if (inverse === match.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }
        hit(source);
    };
    window.open = openWrapper;
}

preventWindowOpen.names = [
    'prevent-window-open',
    'window.open-defuser.js',
    'ubo-window.open-defuser.js',
];

preventWindowOpen.injections = [toRegExp, hit];
