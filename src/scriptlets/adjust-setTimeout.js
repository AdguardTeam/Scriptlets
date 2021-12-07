import {
    hit,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    // following helpers are needed for helpers above
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    getWildcardSymbol,
    shouldMatchAnyDelay,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet adjust-setTimeout
 *
 * @description
 * Adjusts timeout for specified setTimeout() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('adjust-setTimeout'[, match [, timeout[, boost]]])
 * ```
 *
 * - `match` - optional, string or regular expression for stringified callback matching;
 * defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
 * - `timeout` - optional, defaults to 1000, matching setTimeout delay; decimal integer OR '*' for any delay
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), timeout multiplier
 *
 * **Examples**
 * 1. Adjust all setTimeout() x20 times where timeout equal 1000ms:
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout')
 *     ```
 *
 * 2. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout', 'example')
 *     ```
 *
 * 3. Adjust all setTimeout() x20 times where callback matched with `example` and timeout equal 400ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout', 'example', '400')
 *     ```
 *
 * 4. Slow down setTimeout() x2 times where callback matched with `example` and timeout equal 1000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout', 'example', '', '2')
 *     ```
 * 5. Adjust all setTimeout() x50 times where timeout equal 2000ms
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout', '', '2000', '0.02')
 *     ```
 * 6. Adjust all setTimeout() x20 times where callback matched with `test` and timeout is randomized
 *     ```
 *     example.org#%#//scriptlet('adjust-setTimeout', 'test', '*')
 *     ```
 */
/* eslint-enable max-len */
export function adjustSetTimeout(source, match, timeout, boost) {
    const nativeSetTimeout = window.setTimeout;

    const matchRegexp = toRegExp(match);

    const timeoutWrapper = (cb, d, ...args) => {
        if (matchRegexp.test(cb.toString()) && isDelayMatched(timeout, d)) {
            d *= getBoostMultiplier(boost);
            hit(source);
        }
        return nativeSetTimeout.apply(window, [cb, d, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

adjustSetTimeout.names = [
    'adjust-setTimeout',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nano-setTimeout-booster.js',
    'ubo-nano-setTimeout-booster.js',
    'nano-stb.js',
    'ubo-nano-stb.js',
    'ubo-nano-setTimeout-booster',
    'ubo-nano-stb',
];

adjustSetTimeout.injections = [
    hit,
    toRegExp,
    getBoostMultiplier,
    isDelayMatched,
    nativeIsNaN,
    nativeIsFinite,
    getMatchDelay,
    getWildcardSymbol,
    shouldMatchAnyDelay,
];
