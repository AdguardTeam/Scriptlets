import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    toRegExp,
    matchStackTrace,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet abort-on-stack-trace
 *
 * @description
 * Aborts a script when it attempts to utilize (read or write to) the specified property and it's error stack trace contains given value.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock-for-firefox-legacy/commit/7099186ae54e70b588d5e99554a05d783cabc8ff
 *
 * **Syntax**
 * ```
 * example.com#%#//scriptlet('abort-on-stack-trace', property, stack)
 * ```
 *
 * - `property` - required, path to a property. The property must be attached to window.
 * - `stack` - required, string that must match the current function call stack trace.
 *
 * **Examples**
 * ```
 * ! Aborts script when it tries to access `window.Ya` and it's error stack trace contains `test.js`
 * example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'test.js')
 *
 * ! Aborts script when it tries to access `window.Ya.videoAd` and it's error stack trace contains `test.js`
 * example.org#%#//scriptlet('abort-on-stack-trace', 'Ya.videoAd', 'test.js')
 *
 * ! Aborts script when stack trace matches with any of these parameters
 * example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexFuncName')
 * example.org#%#//scriptlet('abort-on-stack-trace', 'Ya', 'yandexScriptName')
 * ```
 */
/* eslint-enable max-len */
export function abortOnStacktrace(source, property, stack) {
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

        let value = base[prop];
        setPropertyAccess(base, prop, {
            get() {
                if (matchStackTrace(stack, new Error().stack)) {
                    abort();
                }
                return value;
            },
            set(newValue) {
                if (matchStackTrace(stack, new Error().stack)) {
                    abort();
                }
                value = newValue;
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid)
        .bind();
}

abortOnStacktrace.names = [
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
abortOnStacktrace.injections = [
    randomId,
    toRegExp,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    matchStackTrace,
];
