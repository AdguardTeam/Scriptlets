import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isEmptyObject,
    interceptChainProp,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet debug-on-property-write
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write),
 * but instead of aborting it starts the debugger.
 *
 * > It is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Debug script when it tries to write in property `window.test`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('debug-on-property-write', 'test')
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function debugOnPropertyWrite(source, property) {
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

        setPropertyAccess(base, prop, { set: abort });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

export const debugOnPropertyWriteNames = [
    'debug-on-property-write',
];

// eslint-disable-next-line prefer-destructuring
debugOnPropertyWrite.primaryName = debugOnPropertyWriteNames[0];

debugOnPropertyWrite.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isEmptyObject,
    interceptChainProp,
];
