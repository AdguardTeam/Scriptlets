import {
    hit,
    toRegExp,
    startsWith,
    noopFunc,
    nativeIsNaN,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setTimeout
 *
 * @description
 * Prevents a `setTimeout` call if:
 * 1) the text of the callback is matching the specified search string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the timeout is matching the specified delay; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-setTimeout'[, search[, delay]])
 * ```
 *
 * Call with no arguments will log calls to setTimeout while debugging (`log-setTimeout` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `search` - optional, string or regular expression.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setTimeout` calls due to specified `delay`.
 * - `delay` - optional, must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
 *
 * > If `prevent-setTimeout` without parameters logs smth like `setTimeout(undefined, 1000)`,
 * it means that no callback was passed to setTimeout() and that's not scriptlet issue
 *
 * **Examples**
 * 1. Prevents `setTimeout` calls if the callback matches `/\.test/` regardless of the delay.
 *     ```bash
 *     example.org#%#//scriptlet('prevent-setTimeout', '/\.test/')
 *     ```
 *
 *     For instance, the following call will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value";
 *     }, 100);
 *     ```
 *
 * 2. Prevents `setTimeout` calls if the callback does not contain `value`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', '!value')
 *     ```
 *
 *     For instance, only the first of the following calls will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "test -- prevented";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setTimeout(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 *
 * 3. Prevents `setTimeout` calls if the callback contains `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', 'value', '!300')
 *     ```
 *
 *     For instance, only the first of the following calls will not be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "value 1 -- executed";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "value 2 -- prevented";
 *     }, 400);
 *     setTimeout(function () {
 *         window.test = "value 3 -- prevented";
 *     }, 500);
 *     ```
 *
 * 4. Prevents `setTimeout` calls if the callback does not contain `value` and the delay is not set to `300`.
 *     ```
 *     example.org#%#//scriptlet('prevent-setTimeout', '!value', '!300')
 *     ```
 *
 *     For instance, only the second of the following calls will be prevented:
 *     ```javascript
 *     setTimeout(function () {
 *         window.test = "test -- executed";
 *     }, 300);
 *     setTimeout(function () {
 *         window.test = "test -- prevented";
 *     }, 400);
 *     setTimeout(function () {
 *         window.test = "value -- executed";
 *     }, 400);
 *     setTimeout(function () {
 *         window.value = "test -- executed";
 *     }, 500);
 *     ```
 */
/* eslint-enable max-len */
export function preventSetTimeout(source, match, delay) {
    const nativeTimeout = window.setTimeout;
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs setTimeouts to console if no arguments have been specified
    const shouldLog = ((typeof match === 'undefined') && (typeof delay === 'undefined'));

    const INVERT_MARKER = '!';

    const isNotMatch = startsWith(match, INVERT_MARKER);
    const matchValue = isNotMatch ? match.slice(1) : match;
    const matchRegexp = toRegExp(matchValue);

    const isNotDelay = startsWith(delay, INVERT_MARKER);
    let delayValue = isNotDelay ? delay.slice(1) : delay;
    delayValue = parseInt(delayValue, 10);
    const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;

    const timeoutWrapper = (callback, timeout, ...args) => {
        let shouldPrevent = false;

        // https://github.com/AdguardTeam/Scriptlets/issues/105
        const cbString = String(callback);

        if (shouldLog) {
            hit(source);
            log(`setTimeout(${cbString}, ${timeout})`);
        } else if (!delayMatch) {
            shouldPrevent = matchRegexp.test(cbString) !== isNotMatch;
        } else if (matchValue === '/.?/') {
            shouldPrevent = (timeout === delayMatch) !== isNotDelay;
        } else {
            shouldPrevent = matchRegexp.test(cbString) !== isNotMatch
                && (timeout === delayMatch) !== isNotDelay;
        }

        if (shouldPrevent) {
            hit(source);
            return nativeTimeout(noopFunc, timeout);
        }

        return nativeTimeout.apply(window, [callback, timeout, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

preventSetTimeout.names = [
    'prevent-setTimeout',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-setTimeout-if.js', // new implementation of setTimeout-defuser.js
    'ubo-no-setTimeout-if.js',
    'nostif.js', // new short name of no-setTimeout-if
    'ubo-nostif.js',
    'ubo-no-setTimeout-if',
    'ubo-nostif',
    // old scriptlet names which should be supported as well.
    // should be removed eventually.
    // do not remove until other filter lists maintainers use them
    'setTimeout-defuser.js',
    'ubo-setTimeout-defuser.js',
    'ubo-setTimeout-defuser',
    'std.js',
    'ubo-std.js',
    'ubo-std',
];

preventSetTimeout.injections = [
    hit,
    toRegExp,
    startsWith,
    noopFunc,
    nativeIsNaN,
];
