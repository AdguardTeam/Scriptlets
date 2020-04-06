import {
    hit,
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
}

preventRequestAnimationFrame.names = [
    'prevent-requestAnimationFrame',
    'requestAnimationFrame-if.js',
    'ubo-requestAnimationFrame-if.js',
    'raf-if.js',
    'ubo-raf-if.js',
];

preventRequestAnimationFrame.injections = [hit];
