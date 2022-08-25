import {
    hit,
    isValidStrPattern,
    isValidMatchStr,
    toRegExp,
    nativeIsNaN,
    parseMatchArg,
    handleOldReplacement,
    createDecoy,
    getPreventGetter,
    noopNull,
    getWildcardSymbol,
    // following helpers are needed for helpers above
    noopFunc,
    trueFunc,
    startsWith,
    endsWith,
    substringBefore,
    substringAfter,
} from '../helpers/index';

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
 * example.org#%#//scriptlet('prevent-window-open'[, match[, delay[, replacement]]])
 * ```
 *
 * - `match` - optional, string or regular expression. If not set or regular expression is invalid, all window.open calls will be matched.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * - `delay` - optional, number of seconds. If not set, scriptlet will return `null`,
 * otherwise valid sham window object as injected `iframe` will be returned
 * for accessing its methods (blur(), focus() etc.) and will be removed after the delay.
 * - `replacement` - optional, string; one of the predefined constants:
 *     - `obj` - for returning an object instead of default iframe;
 *        for cases when the page requires a valid `window` instance to be returned
 *     - `log` - for logging window.open calls; permitted for production filter lists.
 *
 * **Examples**
 * 1. Prevent all `window.open` calls:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open')
 * ```
 *
 * 2. Prevent `window.open` for all URLs containing `example`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', 'example')
 * ```
 *
 * 3. Prevent `window.open` for all URLs matching RegExp `/example\./`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '/example\./')
 * ```
 *
 * 4. Prevent `window.open` for all URLs **NOT** containing `example`:
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '!example')
 * ```
 *
 * Old syntax of prevent-window-open parameters:
 * - `match` - optional, defaults to "matching", any positive number or nothing for "matching", 0 or empty string for "not matching"
 * - `search` - optional, string or regexp for matching the URL passed to `window.open` call; defaults to search all `window.open` call
 * - `replacement` - optional, string to return prop value or property instead of window.open; defaults to return noopFunc.
 * **Examples**
 * ```
 *     example.org#%#//scriptlet('prevent-window-open', '1', '/example\./')
 *     example.org#%#//scriptlet('prevent-window-open', '0', 'example')
 *     example.org#%#//scriptlet('prevent-window-open', '', '', 'trueFunc')
 *     example.org#%#//scriptlet('prevent-window-open', '1', '', '{propName=noopFunc}')
 * ```
 *
 * > For better compatibility with uBO, old syntax is not recommended to use.
 */
/* eslint-enable max-len */
export function preventWindowOpen(source, match = getWildcardSymbol(), delay, replacement) {
    // default match value is needed for preventing all window.open calls
    // if scriptlet runs without args
    const nativeOpen = window.open;
    const isNewSyntax = match !== '0' && match !== '1';

    const oldOpenWrapper = (str, ...args) => {
        match = Number(match) > 0;
        // 'delay' was 'search' prop for matching in old syntax
        if (!isValidStrPattern(delay)) {
            // eslint-disable-next-line no-console
            console.log(`Invalid parameter: ${delay}`);
            return nativeOpen.apply(window, [str, ...args]);
        }
        const searchRegexp = toRegExp(delay);
        if (match !== searchRegexp.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }
        hit(source);
        return handleOldReplacement(replacement);
    };

    const newOpenWrapper = (url, ...args) => {
        const shouldLog = replacement && replacement.indexOf('log') > -1;
        if (shouldLog) {
            const argsStr = args && args.length > 0
                ? `, ${args.join(', ')}`
                : '';
            const logMessage = `log: window-open: ${url}${argsStr}`;
            hit(source, logMessage);
        }

        let shouldPrevent = false;
        if (match === getWildcardSymbol()) {
            shouldPrevent = true;
        } else if (isValidMatchStr(match)) {
            const { isInvertedMatch, matchRegexp } = parseMatchArg(match);
            shouldPrevent = matchRegexp.test(url) !== isInvertedMatch;
        } else {
            // eslint-disable-next-line no-console
            console.log(`Invalid parameter: ${match}`);
            shouldPrevent = false;
        }

        if (shouldPrevent) {
            const parsedDelay = parseInt(delay, 10);

            let result;
            if (nativeIsNaN(parsedDelay)) {
                result = noopNull();
            } else {
                const decoyArgs = { replacement, url, delay: parsedDelay };
                const decoy = createDecoy(decoyArgs);
                let popup = decoy.contentWindow;
                if (typeof popup === 'object' && popup !== null) {
                    Object.defineProperty(popup, 'closed', { value: false });
                    Object.defineProperty(popup, 'opener', { value: window });
                    Object.defineProperty(popup, 'frameElement', { value: null });
                } else {
                    const nativeGetter = decoy.contentWindow && decoy.contentWindow.get;
                    Object.defineProperty(decoy, 'contentWindow', {
                        get: getPreventGetter(nativeGetter),
                    });
                    popup = decoy.contentWindow;
                }

                result = popup;
            }

            hit(source);
            return result;
        }

        return nativeOpen.apply(window, [url, ...args]);
    };

    window.open = isNewSyntax ? newOpenWrapper : oldOpenWrapper;

    // Protect window.open from native code check
    window.open.toString = nativeOpen.toString.bind(nativeOpen);
}

preventWindowOpen.names = [
    'prevent-window-open',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'window.open-defuser.js',
    'ubo-window.open-defuser.js',
    'ubo-window.open-defuser',
    'nowoif.js',
    'ubo-nowoif.js',
    'ubo-nowoif',
];

preventWindowOpen.injections = [
    hit,
    isValidStrPattern,
    isValidMatchStr,
    toRegExp,
    nativeIsNaN,
    parseMatchArg,
    handleOldReplacement,
    createDecoy,
    getPreventGetter,
    noopNull,
    getWildcardSymbol,
    noopFunc,
    trueFunc,
    startsWith,
    endsWith,
    substringBefore,
    substringAfter,
];
