import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isValidStrPattern,
    matchStackTrace,
    getDescriptorAddon,
    logMessage,
    shouldAbortInlineOrInjectedScript,
    // following helpers are needed for helpers above
    escapeRegExp,
    toRegExp,
    isEmptyObject,
    getNativeRegexpTest,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet abort-on-stack-trace
 *
 * @description
 * Aborts a script when it attempts to utilize (read or write to) the specified property
 * and it's error stack trace contains given value.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock-for-firefox-legacy/commit/7099186ae54e70b588d5e99554a05d783cabc8ff
 *
 * ### Syntax
 *
 * ```text
 * example.com#%#//scriptlet('abort-on-stack-trace', property, stack)
 * ```
 *
 * - `property` — required, path to a property. The property must be attached to window.
 * - `stack` — required, string that must match the current function call stack trace.
 *     - values to abort inline or injected script, accordingly:
 *         - `inlineScript`
 *         - `injectedScript`
 *
 * ### Examples
 *
 * 1. Aborts script when it tries to access `window.Ya` and it's error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'test.js')
 *     ```
 *
 * 1. Aborts script when it tries to access `window.Ya.videoAd` and it's error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya.videoAd', 'test.js')
 *     ```
 *
 * 1. Aborts script when stack trace matches with any of these parameters
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexFuncName')
 *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexScriptName')
 *     ```
 *
 * 1. Aborts script when it tries to access `window.Ya` and it's an inline script
 *
 *     ```adblock
 *     example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'inlineScript')
 *     ```
 *
 * 1. Aborts script when it tries to access `window.Ya` and it's an injected script
 *
 *      ```adblock
 *      example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'injectedScript')
 *      ```
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function abortOnStackTrace(source, property, stack) {
    if (!property || !stack) {
        return;
    }

    const rid = randomId();
    const abort = () => {
        hit(source);
        throw new ReferenceError(rid);
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        let { base } = chainInfo;
        const { prop, chain } = chainInfo;
        if (chain) {
            const setter = (a) => {
                base = a;
                if (a instanceof Object) {
                    setChainPropAccess(a, chain);
                }
            };
            Object.defineProperty(owner, prop, {
                get: () => base,
                set: setter,
            });
            return;
        }

        if (!stack.match(/^(inlineScript|injectedScript)$/) && !isValidStrPattern(stack)) {
            logMessage(source, `Invalid parameter: ${stack}`);
            return;
        }

        // Prevent infinite loops when trapping prop used by helpers in getter/setter
        const descriptorWrapper = Object.assign(getDescriptorAddon(), {
            value: base[prop],
            get() {
                if (!this.isAbortingSuspended
                    && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
                    abort();
                }
                return this.value;
            },
            set(newValue) {
                if (!this.isAbortingSuspended
                    && this.isolateCallback(matchStackTrace, stack, new Error().stack)) {
                    abort();
                }
                this.value = newValue;
            },
        });

        setPropertyAccess(base, prop, {
            // Call wrapped getter and setter to keep isAbortingSuspended & isolateCallback values
            get() {
                return descriptorWrapper.get.call(descriptorWrapper);
            },
            set(newValue) {
                descriptorWrapper.set.call(descriptorWrapper, newValue);
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

abortOnStackTrace.names = [
    'abort-on-stack-trace',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-stack-trace.js',
    'ubo-abort-on-stack-trace.js',
    'aost.js',
    'ubo-aost.js',
    'ubo-abort-on-stack-trace',
    'ubo-aost',
    'abp-abort-on-stack-trace',
];
abortOnStackTrace.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isValidStrPattern,
    escapeRegExp,
    matchStackTrace,
    getDescriptorAddon,
    logMessage,
    toRegExp,
    isEmptyObject,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
];
