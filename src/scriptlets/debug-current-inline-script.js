import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler,
    hit,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet debug-current-inline-script
 *
 * @description
 * This scriptlet is basically the same as [abort-current-inline-script](#abort-current-inline-script), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 *```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet('debug-current-inline-script', 'alert')
 * ```
 */
/* eslint-enable max-len */
export function debugCurrentInlineScript(source, property, search = null) {
    const searchRegexp = toRegExp(search);
    const rid = randomId();

    const getCurrentScript = () => {
        if ('currentScript' in document) {
            return document.currentScript; // eslint-disable-line compat/compat
        }
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    };

    const ourScript = getCurrentScript();

    const abort = () => {
        const scriptEl = getCurrentScript();
        if (scriptEl instanceof HTMLScriptElement
            && scriptEl.textContent.length > 0
            && scriptEl !== ourScript
            && (!search || searchRegexp.test(scriptEl.textContent))) {
            hit(source);
            debugger; // eslint-disable-line no-debugger
        }
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

        let currentValue = base[prop];
        setPropertyAccess(base, prop, {
            set: (value) => {
                abort();
                currentValue = value;
            },
            get: () => {
                abort();
                return currentValue;
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid)
        .bind();
}

debugCurrentInlineScript.names = [
    'debug-current-inline-script',
];

debugCurrentInlineScript.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    createOnErrorHandler,
    hit,
];
