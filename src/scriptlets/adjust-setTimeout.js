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
 * @scriptlet adjust-setTimeout
 *
 * @description
 * Adjusts delay for specified setTimeout() callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nano-settimeout-boosterjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('adjust-setTimeout'[, matchCallback [, matchDelay[, boost]]])
 * ```
 *
 * - `matchCallback` - optional, string or regular expression for stringified callback matching;
 * defaults to match all callbacks; invalid regular expression will cause exit and rule will not work
 * - `matchDelay` - optional, defaults to 1000, matching setTimeout delay; decimal integer OR '*' for any delay
 * - `boost` - optional, default to 0.05, float, capped at 50 times for up and down (0.02...50), setTimeout delay multiplier
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
export function adjustSetTimeout(source, matchCallback, matchDelay, boost) {
    const nativeSetTimeout = window.setTimeout;

    const matchRegexp = toRegExp(matchCallback);

    const timeoutWrapper = (callback, delay, ...args) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/221
        if (!isValidCallback(callback)) {
            // eslint-disable-next-line max-len
            const message = `Scriptlet can't be applied because of invalid callback: '${String(callback)}'.`;
            logMessage(source, message);
        } else if (matchRegexp.test(callback.toString()) && isDelayMatched(matchDelay, delay)) {
            delay *= getBoostMultiplier(boost);
            hit(source);
        }

        return nativeSetTimeout.apply(window, [callback, delay, ...args]);
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
