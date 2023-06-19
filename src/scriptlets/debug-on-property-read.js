import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    noopFunc,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isEmptyObject,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet debug-on-property-read
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-read](#abort-on-property-read),
 * but instead of aborting it starts the debugger.
 *
 * > It is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * ```adblock
 * ! Debug script if it tries to access `window.alert`
 * example.org#%#//scriptlet('debug-on-property-read', 'alert')
 *
 * ! or `window.open`
 * example.org#%#//scriptlet('debug-on-property-read', 'open')
 * ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function debugOnPropertyRead(source, property) {
    if (!property) {
        return;
    }
    const rid = randomId();
    const abort = () => {
        hit(source);
        debugger; // eslint-disable-line no-debugger
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
            set: noopFunc,
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
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
    noopFunc,
    isEmptyObject,
];
