/* eslint-disable no-new-func */
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { setPropertyAccess } from '../helpers/set-property-access';

export function setConstant(source, property, value) {
    if (!property) {
        return;
    }

    let constantValue;
    if (value === 'undefined') {
        constantValue = undefined;
    } else if (value === 'false') {
        constantValue = false;
    } else if (value === 'true') {
        constantValue = true;
    } else if (value === 'noopFunc') {
        constantValue = () => {};
    } else if (value === 'trueFunc') {
        constantValue = () => true;
    } else if (value === 'falseFunc') {
        constantValue = () => false;
    } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (Number.isNaN(constantValue)) {
            return;
        }
        if (Math.abs(constantValue) > 0x7FFF) {
            return;
        }
    } else {
        return;
    }


    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    let canceled = false;
    const mustCancel = (target) => {
        if (canceled) {
            return canceled;
        }
        canceled = target !== undefined
            && constantValue !== undefined
            && typeof target !== typeof constantValue;
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

        hit();
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
    'ubo-set-constant.js',
];
setConstant.injections = [getPropertyInChain, setPropertyAccess];
