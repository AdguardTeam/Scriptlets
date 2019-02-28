/* eslint-disable no-new-func */
import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';

/**
 * Abort property writing
 *
 * @param {Source} source
 * @param {string} property propery name
 */
export function abortOnPropertyWrite(source, property) {
    if (!property) {
        return;
    }
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};
    const rid = randomId();
    const abort = () => {
        hit();
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

        setPropertyAccess(base, prop, { set: abort });
    };

    setChainPropAccess(window, property);
}

abortOnPropertyWrite.names = [
    'abort-on-property-write',
    'ubo-abort-on-property-write.js',
    'abp-abort-on-property-write',
];
abortOnPropertyWrite.injections = [randomId, setPropertyAccess, getPropertyInChain];
