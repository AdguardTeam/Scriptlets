/* eslint-disable no-new-func */
import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { toRegExp } from '../helpers/string-utils';

export function abortCurrentInlineScript(source, property, search = null) {
    const regex = search ? toRegExp(search) : null;
    const rid = randomId();

    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    const ourScript = document.currentScript;

    const abort = () => {
        const scriptEl = document.currentScript;
        if (scriptEl instanceof HTMLScriptElement
            && scriptEl.src === ''
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

        setPropertyAccess(base, prop, {
            set: (value) => {
                abort();
                base = value;
            },
            get: () => {
                abort();
                return base;
            },
        });
    };

    setChainPropAccess(window, property);
}

abortCurrentInlineScript.names = [
    'abort-current-inline-script',
    'ubo-abort-current-inline-script.js',
    'abp-abort-current-inline-script',
];

abortCurrentInlineScript.injections = [randomId, setPropertyAccess, getPropertyInChain, toRegExp];
