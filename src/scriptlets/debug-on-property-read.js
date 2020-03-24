import { randomId } from '../helpers/random-id';
import { setPropertyAccess } from '../helpers/set-property-access';
import { getPropertyInChain } from '../helpers/get-property-in-chain';
import { createOnErrorHandler, hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet debug-on-property-read
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 * ```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet('debug-on-property-read', 'alert')
 * ```
 */
/* eslint-enable max-len */
export function debugOnPropertyRead(source, property) {
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

        setPropertyAccess(base, prop, {
            get: abort,
            set: () => { },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid)
        .bind();
}

debugOnPropertyRead.names = [
    'debug-on-property-read',
];
debugOnPropertyRead.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
];
