/* eslint-disable no-new-func */
import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { toRegExp } from '../helpers/string-utils';
import { hit, createOnErrorHandler } from '../helpers';

export function debugCurrentInlineScript(source, property, search = null) {
    const regex = search ? toRegExp(search) : null;
    const rid = randomId();

    const getCurrentScript = () => {
        if (!document.currentScript) { // eslint-disable-line compat/compat
            const scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        }
        return document.currentScript; // eslint-disable-line compat/compat
    };

    const ourScript = getCurrentScript();

    const abort = () => {
        const scriptEl = getCurrentScript();
        if (scriptEl instanceof HTMLScriptElement
            && scriptEl.textContent.length > 0
            && scriptEl !== ourScript
            && (!regex || regex.test(scriptEl.textContent))) {
            hit(source);
            // eslint-disable-next-line no-debugger
            debugger;
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
