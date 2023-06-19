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
 * @scriptlet abort-on-property-read
 *
 * @description
 * Aborts a script when it attempts to **read** the specified property.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#abort-on-property-readjs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/abort-on-property-read.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('abort-on-property-read', property)
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`
 *
 * ### Examples
 *
 * ```adblock
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet('abort-on-property-read', 'alert')
 *
 * ! Aborts script when it tries to access `navigator.language`
 * example.org#%#//scriptlet('abort-on-property-read', 'navigator.language')
 * ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function abortOnPropertyRead(source, property) {
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

        setPropertyAccess(base, prop, {
            get: abort,
            set: () => {
            },
        });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

abortOnPropertyRead.names = [
    'abort-on-property-read',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'abort-on-property-read.js',
    'ubo-abort-on-property-read.js',
    'aopr.js',
    'ubo-aopr.js',
    'ubo-abort-on-property-read',
    'ubo-aopr',
    'abp-abort-on-property-read',
];
abortOnPropertyRead.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    isEmptyObject,
];
