import {
    hit,
    isValidCallback,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    logMessage,
    // following helpers are needed for helpers above
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    shouldMatchAnyDelay,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet adjust-setInterval
 *
 * @description
 * Adjusts delay for specified setInterval() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-setinterval-boosterjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('adjust-setInterval'[, matchCallback [, matchDelay[, boost]]])
 * ```
 *
 * - `matchCallback` — optional, string or regular expression for stringified callback matching;
 *   defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
 * - `matchDelay` — optional, defaults to 1000, matching setInterval delay; decimal integer OR '*' for any delay
 * - `boost` — optional, default to 0.05, float,
 *   capped at 1000 times for up and 50 for down (0.001...50), setInterval delay multiplier
 *
 * ### Examples
 *
 * 1. Adjust all setInterval() x20 times where delay equal 1000ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval')
 *     ```
 *
 * 1. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 1000ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', 'example')
 *     ```
 *
 * 1. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 400ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '400')
 *     ```
 *
 * 1. Slow down setInterval() x2 times where callback matched with `example` and delay equal 1000ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '', '2')
 *     ```
 *
 * 1. Adjust all setInterval() x50 times where delay equal 2000ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.02')
 *     ```
 *
 * 1. Adjust all setInterval() x1000 times where delay equal 2000ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.001')
 *     ```
 *
 * 1. Adjust all setInterval() x50 times where delay is randomized
 *
 *     ```adblock
 *     example.org#%#//scriptlet('adjust-setInterval', '', '*', '0.02')
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function adjustSetInterval(source, matchCallback, matchDelay, boost) {
    const nativeSetInterval = window.setInterval;

    const matchRegexp = toRegExp(matchCallback);

    const intervalWrapper = (callback, delay, ...args) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/221
        if (!isValidCallback(callback)) {
            // eslint-disable-next-line max-len
            const message = `Scriptlet can't be applied because of invalid callback: '${String(callback)}'`;
            logMessage(source, message);
        } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
            delay *= getBoostMultiplier(boost);
            hit(source);
        }
        return nativeSetInterval.apply(window, [callback, delay, ...args]);
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
    'adjust-setInterval.js',
    'ubo-adjust-setInterval.js',
    'ubo-nano-setInterval-booster',
    'ubo-nano-sib',
    'ubo-adjust-setInterval',
];

adjustSetInterval.injections = [
    hit,
    isValidCallback,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    logMessage,
    // following helpers should be injected as helpers above use them
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    shouldMatchAnyDelay,
];
