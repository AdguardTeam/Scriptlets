import { toRegExp } from '../helpers/string-utils';
import { hit } from '../helpers';

/**
 *
 * @param {Source} source
 * @param {string|RegExp} match matching in string of callback function
 * @param {string|number} interval matching interval
 * @param {string|number} boost interval multiplier
 */
export function boostSetInterval(source, match, interval, boost) {
    const nativeInterval = window.setInterval;
    interval = parseInt(interval, 10);
    interval = Number.isNaN(interval) ? 1000 : interval;

    boost = parseInt(boost, 10);
    boost = Number.isNaN(interval) || !Number.isFinite(boost) ? 0.05 : boost;

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

boostSetInterval.names = [
    'boost-setInterval',
    'ubo-nano-setInterval-booster.js',
];

boostSetInterval.injections = [toRegExp, hit];
