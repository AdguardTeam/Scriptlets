import { toRegExp } from '../helpers/string-utils';
import { log } from '../helpers';

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
    delay = parseInt(delay, 10);
    delay = Number.isNaN(delay) ? null : delay;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const timeoutWrapper = (cb, d, ...args) => {
        if ((!delay || d === delay) && match.test(cb.toString())) {
            log(source);
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

preventSetTimeout.injections = [toRegExp, log];
