import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';

/**
 * Abort property reading even if it doesn't exist in execution moment
 *
 * @param {Source} source
 * @param {string} property propery name
 */
export function abortOnPropertyRead(source, property) {
    if (!property) {
        return;
    }
    const rid = randomId();
    const abort = () => {
        if (source.hit) {
            source.hit();
        }
        throw new ReferenceError(rid);
    };
    const setChainPropAccess = (owner, property) => {
        // eslint-disable-next-line prefer-const
        let { base, prop, chain } = getPropertyInChain(owner, property);
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
            get: abort,
            set: () => { },
        });
    };

    setChainPropAccess(window, property);
}

abortOnPropertyRead.names = [
    'abort-on-property-read',
    'ubo-abort-on-property-read.js',
    'abp-abort-on-property-read',
];
abortOnPropertyRead.injections = [randomId, setPropertyAccess, getPropertyInChain];
