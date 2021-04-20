import {
    toRegExp,
    substringBefore,
    substringAfter,
    startsWith,
    endsWith,
    hit,
    noopFunc,
    trueFunc,
} from '../helpers';

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
 * example.org#%#//scriptlet('prevent-window-open'[, match[, search[, replacement]]])
 * ```
 *
 * - `match` - optional, defaults to "matching", any positive number or nothing for "matching", 0 or empty string for "not matching"
 * - `search` - optional, string or regexp for matching the URL passed to `window.open` call; defaults to search all `window.open` call
 * - `replacement` - optional, string to return prop value or property instead of window.open; defaults to return noopFunc
 *
 * **Example**
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
 *     example.org#%#//scriptlet('prevent-window-open', '', '', 'trueFunc')
 * ```
 * 6. Prevent all `window.open` and returns callback
 * which returns object with property 'propName'=noopFunc
 * as a property of window.open if website checks it:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '1', '', '{propName=noopFunc}')
 * ```
 */
/* eslint-enable max-len */
export function preventWindowOpen(source, match = 1, search, replacement) {
    // Default value of 'match' is needed to prevent all `window.open` calls
    // if the scriptlet is used without parameters
    const nativeOpen = window.open;

    // unary plus converts 'match' to a number
    // e.g.: +'1' -> 1; +false -> 0
    match = +match > 0;

    const searchRegexp = toRegExp(search);

    // eslint-disable-next-line consistent-return
    const openWrapper = (str, ...args) => {
        if (match !== searchRegexp.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }

        hit(source);

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
            const isProp = startsWith(replacement, '{') && endsWith(replacement, '}');
            if (isProp) {
                const propertyPart = replacement.slice(1, -1);
                const propertyName = substringBefore(propertyPart, '=');
                const propertyValue = substringAfter(propertyPart, '=');
                if (propertyValue === 'noopFunc') {
                    result = () => {
                        const resObj = { };
                        resObj[propertyName] = noopFunc;
                        return resObj;
                    };
                }
            }
        }

        return result;
    };

    window.open = openWrapper;
}

preventWindowOpen.names = [
    'prevent-window-open',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'window.open-defuser.js',
    'ubo-window.open-defuser.js',
    'ubo-window.open-defuser',
];

preventWindowOpen.injections = [
    toRegExp,
    startsWith,
    endsWith,
    substringBefore,
    substringAfter,
    hit,
    noopFunc,
    trueFunc,
];
