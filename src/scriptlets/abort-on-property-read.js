import randomId from '../helpers/random-id';
import wrapPropertyAccess from '../helpers/wrap-property-access';

function abortOnPropertyRead(property) {
    const rid = randomId();

    if (!property) {
        return;
    }

    const descriptor = {
        get() { throw new ReferenceError(rid); },
        set() {},
    };

    wrapPropertyAccess(window, property, descriptor);
}

abortOnPropertyRead.sName = 'abort-on-property-read';
abortOnPropertyRead.injections = [randomId, wrapPropertyAccess];

export default abortOnPropertyRead;