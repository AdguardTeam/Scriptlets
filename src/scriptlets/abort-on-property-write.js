import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isEmptyObject,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet abort-on-property-write
 *
 * @description
 * Aborts a script when it attempts to **write** the specified property.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-writejs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-on-property-write.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('abort-on-property-write', property)
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed).
 *   The property must be attached to `window`
 *
 * ### Examples
 *
 * ```adblock
 * ! Aborts script when it tries to set `window.adblock` value
 * example.org#%#//scriptlet('abort-on-property-write', 'adblock')
 * ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function abortOnPropertyWrite(source, property) {
    if (!property) {
        return;
    }

    const rid = randomId();
    const abort = () => {
        hit(source);
        throw new ReferenceError(rid);
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

abortOnPropertyWrite.names = [
    'abort-on-property-write',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-property-write.js',
    'ubo-abort-on-property-write.js',
    'aopw.js',
    'ubo-aopw.js',
    'ubo-abort-on-property-write',
    'ubo-aopw',
    'abp-abort-on-property-write',
];

abortOnPropertyWrite.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isEmptyObject,
];
