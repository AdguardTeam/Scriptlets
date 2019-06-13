import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { createOnErrorHandler, hit } from '../helpers';

/**
 * Call debugger on property writing
 *
 * @param {Source} source
 * @param {string} property propery name
 */
export function debugOnPropertyWrite(source, property) {
    if (!property) {
        return;
    }
    const rid = randomId();
    const abort = () => {
        hit(source);
        // eslint-disable-next-line no-debugger
        debugger;
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

    window.onerror = createOnErrorHandler(rid).bind();
}

debugOnPropertyWrite.names = [
    'debug-on-property-write',
];

debugOnPropertyWrite.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
];
