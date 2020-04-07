import {
    hit, startsWith, toRegExp, noopFunc,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-requestAnimationFrame
 *
 * @description
 * Prevents a `requestAnimationFrame` call if:
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#requestanimationframe-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-requestAnimationFrame"[, <search>])
 * ```
 *
 * **Parameters**
 *
 * - `search` (optional) string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 *
 * **Examples**
 *
 */
/* eslint-enable max-len */

// eslint-disable-next-line no-unused-vars
export function preventRequestAnimationFrame(source, match) {
    const nativeRequestAnimationFrame = window.requestAnimationFrame;

    const log = console.log.bind(console); // eslint-disable-line no-console

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
            hit(source);
            log(`requestAnimationFrame("${callback.toString()}")`);
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
];

preventRequestAnimationFrame.injections = [hit, startsWith, toRegExp, noopFunc];
