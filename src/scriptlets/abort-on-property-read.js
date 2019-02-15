import randomId from '../helpers/random-id';
import setPropertyAccess from '../helpers/set-property-access';
import getPropertyInChain from '../helpers/get-property-in-chain';

/**
 * Abort access to property if exists
 * @param {string} property propery name
 */
function abortOnPropertyRead(source, property) {
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

        setPropertyAccess(base, prop, {
            get: abort,
            set: () => { },
        });
    };

    setChainPropAccess(window, property);
}

abortOnPropertyRead.sName = 'abort-on-property-read';
abortOnPropertyRead.injections = [randomId, setPropertyAccess, getPropertyInChain];

export default abortOnPropertyRead;