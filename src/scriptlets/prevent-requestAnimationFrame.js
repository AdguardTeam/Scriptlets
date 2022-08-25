import {
    hit,
    noopFunc,
    parseMatchArg,
    isValidStrPattern,
    isValidCallback,
    // following helpers are needed for helpers above
    toRegExp,
    startsWith,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-requestAnimationFrame
 *
 * @description
 * Prevents a `requestAnimationFrame` call
 * if the text of the callback is matching the specified search string which does not start with `!`;
 * otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-requestanimationframe-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-requestAnimationFrame'[, search])
 * ```
 *
 * - `search` - optional, string or regular expression; invalid regular expression will be skipped and all callbacks will be matched.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 *
 * Call with no argument will log all requestAnimationFrame calls while debugging.
 * So do not use the scriptlet without any parameter in production filter lists.
 *
 * **Examples**
 * 1. Prevents `requestAnimationFrame` calls if the callback matches `/\.test/`.
 *     ```bash
 *     example.org#%#//scriptlet('prevent-requestAnimationFrame', '/\.test/')
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     var times = 0;
 *     requestAnimationFrame(function change() {
 *         window.test = 'new value';
 *         if (times < 2) {
 *             times += 1;
 *             requestAnimationFrame(change);
 *         }
 *     });
 *     ```
 * 2. Prevents `requestAnimationFrame` calls if **does not match** 'check'.
 *     ```bash
 *     example.org#%#//scriptlet('prevent-requestAnimationFrame', '!check')
 *     ```
 *
 *     For instance, only the first call will be prevented:
 *
 *     ```javascript
 *     var timesFirst = 0;
 *     requestAnimationFrame(function changeFirst() {
 *         window.check = 'should not be prevented';
 *         if (timesFirst < 2) {
 *             timesFirst += 1;
 *             requestAnimationFrame(changeFirst);
 *         }
 *     });
 *
 *     var timesSecond = 0;
 *     requestAnimationFrame(function changeSecond() {
 *         window.second = 'should be prevented';
 *         if (timesSecond < 2) {
 *             timesSecond += 1;
 *             requestAnimationFrame(changeSecond);
 *         }
 *     });
 *     ```
 */
/* eslint-enable max-len */

export function preventRequestAnimationFrame(source, match) {
    const nativeRequestAnimationFrame = window.requestAnimationFrame;
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs requestAnimationFrame to console if no arguments have been specified
    const shouldLog = typeof match === 'undefined';

    const { isInvertedMatch, matchRegexp } = parseMatchArg(match);

    const rafWrapper = (callback, ...args) => {
        let shouldPrevent = false;
        if (shouldLog) {
            hit(source);
            log(`requestAnimationFrame(${String(callback)})`);
        } else if (isValidCallback(callback) && isValidStrPattern(match)) {
            shouldPrevent = matchRegexp.test(callback.toString()) !== isInvertedMatch;
        }

        if (shouldPrevent) {
            hit(source);
            return nativeRequestAnimationFrame(noopFunc);
        }

        return nativeRequestAnimationFrame.apply(window, [callback, ...args]);
    };

    window.requestAnimationFrame = rafWrapper;
}

preventRequestAnimationFrame.names = [
    'prevent-requestAnimationFrame',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-requestAnimationFrame-if.js',
    'ubo-no-requestAnimationFrame-if.js',
    'norafif.js',
    'ubo-norafif.js',
    'ubo-no-requestAnimationFrame-if',
    'ubo-norafif',
];

preventRequestAnimationFrame.injections = [
    hit,
    noopFunc,
    parseMatchArg,
    isValidStrPattern,
    isValidCallback,
    // following helpers should be injected as helpers above use them
    toRegExp,
    startsWith,
];
