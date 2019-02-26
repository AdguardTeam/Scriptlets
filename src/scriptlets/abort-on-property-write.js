import randomId from '../helpers/random-id';
import setPropertyAccess from '../helpers/set-property-access';
import getPropertyInChain from '../helpers/get-property-in-chain';

/**
 * Abort property writing
 * 
 * @param {Source} source
 * @param {string} property propery name
 */
function abortOnPropertyWrite(source, property) {
    if (!property) {
        return;
    }
    const rid = randomId();
    const abort = () => {
        source.hit && source.hit();
        throw new ReferenceError(rid);
    };
    const setChainPropAccess = (owner, property) => {
        let { base, prop, chain } = getPropertyInChain(owner, property);
        if (chain) {
            const setter = a => {
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

export default abortOnPropertyWrite;