import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 * Prevent calls to setInterval for specified matching in passed callback and delay
 * by setting callback to empty function
 *
 * @param {Source} source
 * @param {string|RegExp} match matching in string of callback function
 * @param {string|number} interval matching interval
 */
export function preventSetInterval(source, match, interval) {
    const nativeInterval = window.setInterval;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    interval = parseInt(interval, 10);
    interval = nativeIsNaN(interval) ? null : interval;

    match = match ? toRegExp(match) : toRegExp('/.?/');
    const intervalWrapper = (cb, d, ...args) => {
        if ((!interval || d === interval) && match.test(cb.toString())) {
            hit(source);
            return nativeInterval(() => { }, d);
        }
        return nativeInterval.apply(window, [cb, d, ...args]);
    };
    window.setInterval = intervalWrapper;
}

preventSetInterval.names = [
    'prevent-setInterval',
    'setInterval-defuser.js',
    'ubo-setInterval-defuser.js',
];

preventSetInterval.injections = [toRegExp, hit];
