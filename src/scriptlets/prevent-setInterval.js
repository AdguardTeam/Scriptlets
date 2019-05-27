import { toRegExp, stringToFunc } from '../helpers/string-utils';
import { createHitFunction } from '../helpers';

/**
 * Prevent calls to setInterval for specified matching in passed callback and delay
 * by setting callback to empty function
 *
 * @param {Source} source
 * @param {string|RegExp} match matching in string of callback function
 * @param {string|number} interval matching interval
 */
export function preventSetInterval(source, match, interval) {
    const hit = createHitFunction(source);
    const nativeInterval = window.setInterval;
    interval = parseInt(interval, 10);
    interval = Number.isNaN(interval) ? null : interval;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const intervalWrapper = (cb, d, ...args) => {
        if ((!interval || d === interval) && match.test(cb.toString())) {
            hit();
            return nativeInterval(() => { }, d);
        }
        return nativeInterval.apply(window, [cb, d, ...args]);
    };
    window.setInterval = intervalWrapper;
}

preventSetInterval.names = [
    'prevent-setInterval',
    'ubo-setInterval-defuser.js',
];

preventSetInterval.injections = [toRegExp, stringToFunc, createHitFunction];
