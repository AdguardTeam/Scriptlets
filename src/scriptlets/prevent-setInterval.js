import {
    hit,
    toRegExp,
    startsWith,
    noopFunc,
    nativeIsNaN,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setInterval
 *
 * @description
 * Prevents a `setInterval` call if:
 * 1) the text of the callback is matching the specified `search` string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the interval is matching the specified `delay`; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-setinterval-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-setInterval'[, search[, delay]])
 * ```
 *
 * Call with no arguments will log calls to setInterval while debugging (`log-setInterval` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` - optional, string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setInterval` calls due to specified `delay`.
 * - `delay` - optional, must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setInterval` call will be matched.
 *
 * > If `prevent-setInterval` without parameters logs smth like `setInterval(undefined, 1000)`,
 * it means that no callback was passed to setInterval() and that's not scriptlet issue

 *  **Examples**
 * 1. Prevents `setInterval` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet('prevent-setInterval', '/\.test/')
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setInterval` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setInterval', '!value')
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "test -- prevented";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setInterval(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 *
 * 3. Prevents `setInterval` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setInterval', 'value', '!300')
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "value 1 -- executed";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "value 2 -- prevented";
 *     }, 400);
 *     setInterval(function () {
 *         window.test = "value 3 -- prevented";
 *     }, 500);
 *     ```
 *
 * 4. Prevents `setInterval` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setInterval', '!value', '!300')
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
 *     ```javascript
 *     setInterval(function () {
 *         window.test = "test -- executed";
 *     }, 300);
 *     setInterval(function () {
 *         window.test = "test -- prevented";
 *     }, 400);
 *     setInterval(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setInterval(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 */
/* eslint-enable max-len */
export function preventSetInterval(source, match, delay) {
    const nativeInterval = window.setInterval;
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs setIntervals to console if no arguments have been specified
    const shouldLog = ((typeof match === 'undefined') && (typeof delay === 'undefined'));

    const INVERT_MARKER = '!';

    const isNotMatch = startsWith(match, INVERT_MARKER);
    const matchValue = isNotMatch ? match.slice(1) : match;
    const matchRegexp = toRegExp(matchValue);

    const isNotDelay = startsWith(delay, INVERT_MARKER);
    let delayValue = isNotDelay ? delay.slice(1) : delay;
    delayValue = parseInt(delayValue, 10);
    const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;

    const intervalWrapper = (callback, interval, ...args) => {
        let shouldPrevent = false;

        // https://github.com/AdguardTeam/Scriptlets/issues/105
        const cbString = String(callback);

        if (shouldLog) {
            hit(source);
            log(`setInterval(${cbString}, ${interval})`);
        } else if (!delayMatch) {
            shouldPrevent = matchRegexp.test(cbString) !== isNotMatch;
        } else if (!match) {
            shouldPrevent = (interval === delayMatch) !== isNotDelay;
        } else {
            shouldPrevent = matchRegexp.test(cbString) !== isNotMatch
                && (interval === delayMatch) !== isNotDelay;
        }

        if (shouldPrevent) {
            hit(source);
            return nativeInterval(noopFunc, interval);
        }

        return nativeInterval.apply(window, [callback, interval, ...args]);
    };
    window.setInterval = intervalWrapper;
}

preventSetInterval.names = [
    'prevent-setInterval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setInterval-if.js', // new implementation of setInterval-defuser.js
    'ubo-no-setInterval-if.js',
    'setInterval-defuser.js', // old name should be supported as well
    'ubo-setInterval-defuser.js',
    'nosiif.js', // new short name of no-setInterval-if
    'ubo-nosiif.js',
    'sid.js', // old short scriptlet name
    'ubo-sid.js',
    'ubo-no-setInterval-if',
    'ubo-setInterval-defuser',
    'ubo-nosiif',
    'ubo-sid',
];

preventSetInterval.injections = [
    hit,
    toRegExp,
    startsWith,
    noopFunc,
    nativeIsNaN,
];
