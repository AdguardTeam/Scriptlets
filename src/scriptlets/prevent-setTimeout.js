import {
    hit,
    noopFunc,
    isPreventionNeeded,
    // following helpers are needed for helpers above
    parseMatchArg,
    parseDelayArg,
    toRegExp,
    startsWith,
    nativeIsNaN,
    isValidCallback,
    isValidMatchStr,
    escapeRegExp,
    isValidStrPattern,
    nativeIsFinite,
    isValidMatchNumber,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-setTimeout
 *
 * @description
 * Prevents a `setTimeout` call if:
 * 1) the text of the callback is matching the specified `matchCallback` string/regexp which does not start with `!`;
 * otherwise mismatched calls should be defused;
 * 2) the delay is matching the specified `matchDelay`; otherwise mismatched calls should be defused.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-settimeout-ifjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-setTimeout'[, matchCallback[, matchDelay]])
 * ```
 *
 * Call with no arguments will log calls to setTimeout while debugging (`log-setTimeout` superseding),
 * so production filter lists' rules definitely require at least one of the parameters:
 * - `matchCallback` - optional, string or regular expression; invalid regular expression will be skipped and all callbacks will be matched.
 * If starts with `!`, scriptlet will not match the stringified callback but all other will be defused.
 * If do not start with `!`, the stringified callback will be matched.
 * If not set, prevents all `setTimeout` calls due to specified `matchDelay`.
 * - `matchDelay` - optional, must be an integer.
 * If starts with `!`, scriptlet will not match the delay but all other will be defused.
 * If do not start with `!`, the delay passed to the `setTimeout` call will be matched.
 *
 * > If `prevent-setTimeout` log looks like `setTimeout(undefined, 1000)`,
 * it means that no callback was passed to setTimeout() and that's not scriptlet issue
 * and obviously it can not be matched by `matchCallback`.
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
export function preventSetTimeout(source, matchCallback, matchDelay) {
    // if browser does not support Proxy (e.g. Internet Explorer),
    // we use none-proxy "legacy" wrapper for preventing
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    const isProxySupported = typeof Proxy !== 'undefined';

    const nativeTimeout = window.setTimeout;
    const log = console.log.bind(console); // eslint-disable-line no-console

    // logs setTimeouts to console if no arguments have been specified
    const shouldLog = ((typeof matchCallback === 'undefined') && (typeof matchDelay === 'undefined'));

    const legacyTimeoutWrapper = (callback, delay, ...args) => {
        let shouldPrevent = false;
        if (shouldLog) {
            hit(source);
            // https://github.com/AdguardTeam/Scriptlets/issues/105
            log(`setTimeout(${String(callback)}, ${delay})`);
        } else {
            shouldPrevent = isPreventionNeeded({
                callback,
                delay,
                matchCallback,
                matchDelay,
            });
        }
        if (shouldPrevent) {
            hit(source);
            return nativeTimeout(noopFunc, delay);
        }
        return nativeTimeout.apply(window, [callback, delay, ...args]);
    };

    const handlerWrapper = (target, thisArg, args) => {
        const callback = args[0];
        const delay = args[1];
        let shouldPrevent = false;
        if (shouldLog) {
            hit(source);
            // https://github.com/AdguardTeam/Scriptlets/issues/105
            log(`setTimeout(${String(callback)}, ${delay})`);
        } else {
            shouldPrevent = isPreventionNeeded({
                callback,
                delay,
                matchCallback,
                matchDelay,
            });
        }
        if (shouldPrevent) {
            hit(source);
            args[0] = noopFunc;
        }
        return target.apply(thisArg, args);
    };

    const setTimeoutHandler = {
        apply: handlerWrapper,
    };

    window.setTimeout = isProxySupported
        ? new Proxy(window.setTimeout, setTimeoutHandler)
        : legacyTimeoutWrapper;
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
    noopFunc,
    isPreventionNeeded,
    // following helpers should be injected as helpers above use them
    parseMatchArg,
    parseDelayArg,
    toRegExp,
    startsWith,
    nativeIsNaN,
    isValidCallback,
    isValidMatchStr,
    escapeRegExp,
    isValidStrPattern,
    nativeIsFinite,
    isValidMatchNumber,
];
