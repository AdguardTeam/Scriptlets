import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 * Adjusts interval for specified setInterval() callbacks.
 * @param {Source} source
 * @param {string|RegExp} match matching in string of callback function
 * @param {string|number} interval matching interval
 * @param {string|number} boost interval multiplier
 */
export function adjustSetInterval(source, match, interval, boost) {
    const nativeInterval = window.setInterval;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    const nativeIsFinite = Number.isFinite || window.isFinite; // eslint-disable-line compat/compat

    interval = parseInt(interval, 10);
    interval = nativeIsNaN(interval) ? 1000 : interval;

    boost = parseInt(boost, 10);
    boost = nativeIsNaN(interval) || !nativeIsFinite(boost) ? 0.05 : boost;

    match = match ? toRegExp(match) : toRegExp('/.?/');

    if (boost < 0.02) {
        boost = 0.02;
    }
    if (boost > 50) {
        boost = 50;
    }

    const intervalWrapper = (cb, d, ...args) => {
        if (d === interval && match.test(cb.toString())) {
            d *= boost;
            hit(source);
        }
        return nativeInterval.apply(window, [cb, d, ...args]);
    };
    window.setInterval = intervalWrapper;
}

adjustSetInterval.names = [
    'adjust-setInterval',
    'ubo-nano-setInterval-booster.js',
];

adjustSetInterval.injections = [toRegExp, hit];
