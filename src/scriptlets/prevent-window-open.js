import {
    toRegExp,
    substringBefore,
    substringAfter,
    startsWith,
    endsWith,
} from '../helpers/string-utils';

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
 * example.org#%#//scriptlet('prevent-window-open'[, <match>[, <search>[, <replacement>]]])
 * ```
 *
 * **Parameters**
 * - `match` (optional) defaults to "matching", any positive number or nothing for "matching", 0 or empty string for "not matching",
 * - `search` (optional) string or regexp for matching the URL passed to `window.open` call; defaults to search all `window.open` call.
 * - `replacement` (optional) string to return prop value or property instead of window.open; defaults to return noopFunc
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
 * 5. Prevent all `window.open` calls and return 'trueFunc' instead of it if website checks it:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', , , 'trueFunc')
 * ```
 * 6. Prevent all `window.open` and add 'propName'=noopFunc as a property of window.open if website checks it:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '1', , '[propName]=noopFunc')
 * ```
 */
/* eslint-enable max-len */
export function preventWindowOpen(source, match = 1, search, replacement) {
    // Default value of 'match' is needed to prevent all `window.open` calls
    // if the scriptlet is used without parameters
    const nativeOpen = window.open;

    match = +match > 0;

    search = search
        ? toRegExp(search)
        : toRegExp('/.?/');

    // eslint-disable-next-line consistent-return
    const openWrapper = (str, ...args) => {
        if (match !== search.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }

        hit(source);

        const noopFunc = () => { };
        const trueFunc = () => true;

        let result;

        // defaults to return noopFunc instead of window.open
        if (!replacement) {
            result = noopFunc;
        } else if (replacement === 'trueFunc') {
            result = trueFunc;
        } else if (replacement.indexOf('=') > -1) {
            // We should return noopFunc instead of window.open
            // but with some property if website checks it (examples 5, 6)
            // https://github.com/AdguardTeam/Scriptlets/issues/71
            const propPart = substringBefore(replacement, '=');
            const isProp = startsWith(propPart, '[') && endsWith(propPart, ']');
            if (isProp) {
                const prop = propPart.substring(1, propPart.lenght - 1);
                const inputValue = substringAfter(replacement, '=');
                if (inputValue === 'noopFunc') {
                    result = noopFunc[prop][noopFunc];
                    // result = noopFunc[prop];
                }
            }
        }

        return result;
    };

    window.open = openWrapper;
}

preventWindowOpen.names = [
    'prevent-window-open',
    'window.open-defuser.js',
    'ubo-window.open-defuser.js',
];

preventWindowOpen.injections = [
    toRegExp,
    hit,
    startsWith,
    endsWith,
    substringBefore,
    substringAfter,
];
