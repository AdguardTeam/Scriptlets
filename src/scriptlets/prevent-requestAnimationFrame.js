import {
    hit, startsWith, toRegExp, noopFunc,
} from '../helpers';

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
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#requestanimationframe-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-requestAnimationFrame'[, <search>])
 * ```
 *
 * **Parameters**
 *
 * - `search` (optional) string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 *
 * Call with no argument will log all requestAnimationFrame calls while debugging.
 * So do not use the scriptlet without any parameter in production filter lists.
 *
 * **Examples**
 *
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

    // logs requestAnimationFrame to console if no arguments have been specified
    const shouldLog = typeof match === 'undefined';

    const INVERT_MARKER = '!';

    const doNotMatch = startsWith(match, INVERT_MARKER);
    if (doNotMatch) {
        match = match.slice(1);
    }

    match = match ? toRegExp(match) : toRegExp('/.?/');

    const rafWrapper = (callback, ...args) => {
        let shouldPrevent = false;
        if (shouldLog) {
            const logMessage = `log: requestAnimationFrame("${callback.toString()}")`;
            hit(source, logMessage);
        } else {
            shouldPrevent = match.test(callback.toString()) !== doNotMatch;
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
    'requestAnimationFrame-if.js',
    'ubo-requestAnimationFrame-if.js',
    'raf-if.js',
    'ubo-raf-if.js',
    'ubo-requestAnimationFrame-if',
    'ubo-raf-if',
];

preventRequestAnimationFrame.injections = [hit, startsWith, toRegExp, noopFunc];
