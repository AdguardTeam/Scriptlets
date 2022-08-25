import {
    hit,
    isValidCallback,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    // following helpers are needed for helpers above
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    getWildcardSymbol,
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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('adjust-setInterval'[, matchCallback [, matchDelay[, boost]]])
 * ```
 *
 * - `matchCallback` - optional, string or regular expression for stringified callback matching;
 * defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
 * - `matchDelay` - optional, defaults to 1000, matching setInterval delay; decimal integer OR '*' for any delay
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), setInterval delay multiplier
 *
 * **Examples**
 * 1. Adjust all setInterval() x20 times where delay equal 1000ms:
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval')
 *     ```
 *
 * 2. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example')
 *     ```
 *
 * 3. Adjust all setInterval() x20 times where callback matched with `example` and delay equal 400ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '400')
 *     ```
 *
 * 4. Slow down setInterval() x2 times where callback matched with `example` and delay equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', 'example', '', '2')
 *     ```
 * 5. Adjust all setInterval() x50 times where delay equal 2000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', '', '2000', '0.02')
 *     ```
 * 6. Adjust all setInterval() x50 times where delay is randomized
 *     ```
 *     example.org#%#//scriptlet('adjust-setInterval', '', '*', '0.02')
 *     ```
 */
/* eslint-enable max-len */
export function adjustSetInterval(source, matchCallback, matchDelay, boost) {
    const nativeSetInterval = window.setInterval;

    const matchRegexp = toRegExp(matchCallback);

    const intervalWrapper = (callback, delay, ...args) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/221
        if (!isValidCallback(callback)) {
            if (source.verbose) {
                // eslint-disable-next-line no-console, max-len
                console.log(`Scriptlet adjust-setInterval can not be applied because of invalid callback: '${String(callback)}'.`);
            }
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
    'ubo-nano-setInterval-booster',
    'ubo-nano-sib',
];

adjustSetInterval.injections = [
    hit,
    isValidCallback,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    // following helpers should be injected as helpers above use them
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    getWildcardSymbol,
    shouldMatchAnyDelay,
];
