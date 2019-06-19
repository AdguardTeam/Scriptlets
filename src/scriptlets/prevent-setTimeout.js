import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 * Prevent calls to setTimeout for specified matching in passed callback and delay
 * by setting callback to empty function
 *
 * @param {Source} source
 * @param {string|RegExp} match matching in string of callback function
 * @param {string|number} delay matching delay
 */
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
    'ubo-setTimeout-defuser.js',
];

preventSetTimeout.injections = [toRegExp, hit];
