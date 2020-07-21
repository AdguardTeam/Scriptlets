import { hit, toRegExp } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet adjust-setInterval
 *
 * @description
 * Adjusts interval for specified setInterval() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('adjust-setInterval'[, match [, interval[, boost]]])
 * ```
 *
 * - `match` - optional, string/regular expression, matching in stringified callback function
 * - `interval` - optional, defaults to 1000, decimal integer, matching setInterval delay
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), interval multiplier
 *
 * **Examples**
 * 1. Adjust all setInterval() x20 times where interval equal 1000ms:
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval')
 *     ```
 *
 * 2. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example')
 *     ```
 *
 * 3. Adjust all setInterval() x20 times where callback mathed with `example` and interval equal 400ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '400')
 *     ```
 *
 * 4. Slow down setInterval() x2 times where callback matched with `example` and interval equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '', '2')
 *     ```
 * 5.  Adjust all setInterval() x50 times where interval equal 2000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.02')
 *     ```
 */
/* eslint-enable max-len */
export function adjustSetInterval(source, match, interval, boost) {
    const nativeInterval = window.setInterval;
    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    const nativeIsFinite = Number.isFinite || window.isFinite; // eslint-disable-line compat/compat

    interval = parseInt(interval, 10);
    interval = nativeIsNaN(interval) ? 1000 : interval;

    boost = parseFloat(boost);
    boost = nativeIsNaN(boost) || !nativeIsFinite(boost) ? 0.05 : boost;

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
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nano-setInterval-booster.js',
    'ubo-nano-setInterval-booster.js',
    'nano-sib.js',
    'ubo-nano-sib.js',
    'ubo-nano-setInterval-booster',
    'ubo-nano-sib',
];

adjustSetInterval.injections = [toRegExp, hit];
