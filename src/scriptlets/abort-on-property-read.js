import randomId from '../helpers/random-id';
import setPropertyAccess from '../helpers/set-property-access';
import getChainProperty from '../helpers/getChainProperty';

/**
 * Abort access to property if exists
 * @param {string} property propery name
 */
function abortOnPropertyRead(property) {
    const rid = randomId();

    if (!property) {
        return;
    }

    const descriptor = {
        get() { throw new ReferenceError(rid); },
        set() { },
    };

    const chain = getChainProperty(window, property);
    if (!chain) {
        return;
    }
    setPropertyAccess(chain.base, chain.property, descriptor);
}

abortOnPropertyRead.sName = 'abort-on-property-read';
abortOnPropertyRead.injections = [randomId, setPropertyAccess, getChainProperty];

export default abortOnPropertyRead;