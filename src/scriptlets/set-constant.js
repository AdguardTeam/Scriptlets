import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { setPropertyAccess } from '../helpers/set-property-access';
import { hit } from '../helpers';

/**
 * Creates a constant property and assigns it one of the values from the predefined list.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-
 *
 * @param {Source} source
 * @param {string} property path to a property
 * @param {string} value
 */
export function setConstant(source, property, value) {
    if (!property) {
        return;
    }

    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat

    let constantValue;
    if (value === 'undefined') {
        constantValue = undefined;
    } else if (value === 'false') {
        constantValue = false;
    } else if (value === 'true') {
        constantValue = true;
    } else if (value === 'null') {
        constantValue = null;
    } else if (value === 'noopFunc') {
        constantValue = () => {};
    } else if (value === 'trueFunc') {
        constantValue = () => true;
    } else if (value === 'falseFunc') {
        constantValue = () => false;
    } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (nativeIsNaN(constantValue)) {
            return;
        }
        if (Math.abs(constantValue) > 0x7FFF) {
            return;
        }
    } else if (value === '-1') {
        constantValue = -1;
    }  else if (value === '') {
        constantValue = '';
    } else {
        return;
    }

    let canceled = false;
    const mustCancel = (value) => {
        if (canceled) {
            return canceled;
        }
        canceled = value !== undefined
            && constantValue !== undefined
            && typeof value !== typeof constantValue;
        return canceled;
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

        if (mustCancel(base[prop])) { return; }

        hit(source);
        setPropertyAccess(base, prop, {
            get: () => constantValue,
            set: (a) => {
                if (mustCancel(a)) {
                    constantValue = a;
                }
            },
        });
    };

    setChainPropAccess(window, property);
}

setConstant.names = [
    'set-constant',
    'set-constant.js',
    'ubo-set-constant.js',
];
setConstant.injections = [getPropertyInChain, setPropertyAccess, hit];
