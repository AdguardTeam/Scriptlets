/* eslint-disable no-new-func */
import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { stringToFunc, toRegExp } from '../helpers/string-utils';
import { onErrorHandler } from '../helpers';

export function abortCurrentInlineScript(source, property, search = null) {
    const regex = search ? toRegExp(search) : null;
    const rid = randomId();

    const hit = stringToFunc(source.hit);

    const getCurrentScript = () => {
        if (!document.currentScript) {
            const scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        }
        return document.currentScript;
    };

    const ourScript = getCurrentScript();

    const abort = () => {
        const scriptEl = getCurrentScript();
        if (scriptEl instanceof HTMLScriptElement
            && scriptEl.textContent.length > 0
            && scriptEl !== ourScript
            && (!regex || regex.test(scriptEl.textContent))) {
            hit();
            throw new ReferenceError(rid);
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

    window.onerror = onErrorHandler(rid).bind();
}

abortCurrentInlineScript.names = [
    'abort-current-inline-script',
    'ubo-abort-current-inline-script.js',
    'abp-abort-current-inline-script',
];

abortCurrentInlineScript.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    toRegExp,
    stringToFunc,
    onErrorHandler,
];
