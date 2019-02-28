/* eslint-disable no-new-func */
import { toRegExp } from '../helpers/string-utils';

/**
 * Prevent calls to setTimeout for specified matching in passed callback and delay
 * by setting callback to empty function
 *
 * @param {Source} source
 * @param {string|RegExp} match mathicng in string of callback function
 * @param {string|number} delay matching delay
 */
export function setTimeoutDefuser(source, match, delay) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};
    const nativeTimeout = window.setTimeout;
    delay = parseInt(delay, 10);
    delay = Number.isNaN(delay) ? null : delay;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const timeoutWrapper = (cb, d, ...args) => {
        if ((!delay || d === delay) && match.test(cb.toString())) {
            hit();
            return nativeTimeout(() => { }, d);
        }
        return nativeTimeout.apply(window, [cb, d, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

setTimeoutDefuser.names = [
    'prevent-setTimeout',
    'ubo-setTimeout-defuser.js',
];

setTimeoutDefuser.injections = [toRegExp];

export default setTimeoutDefuser;
