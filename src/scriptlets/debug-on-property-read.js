import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    noopFunc,
    isEmptyObject,
    interceptChainProp,
} from '../helpers';

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
 * 1. Debug script if it tries to access `window.alert`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('debug-on-property-read', 'alert')
 *     ```
 *
 * 1. Debug script if it tries to access `window.open`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('debug-on-property-read', 'open')
 *     ```
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
        const { base, prop, chain } = chainInfo;
        if (chain) {
            interceptChainProp(owner, prop, chain, setChainPropAccess);
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

export const debugOnPropertyReadNames = [
    'debug-on-property-read',
];

// eslint-disable-next-line prefer-destructuring
debugOnPropertyRead.primaryName = debugOnPropertyReadNames[0];

debugOnPropertyRead.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    noopFunc,
    isEmptyObject,
    interceptChainProp,
];
