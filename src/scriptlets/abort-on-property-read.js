import {
    randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, toRegExp,
} from '../helpers';

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
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L864
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('abort-on-property-read', property[, stack])
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`
 * - `stack` (optional) string or regular expression that must match the current function call stack trace
 *
 * **Examples**
 * ```
 * ! Aborts script when it tries to access `window.alert`
 * example.org#%#//scriptlet('abort-on-property-read', 'alert')
 *
 * ! Aborts script when it tries to access `navigator.language`
 * example.org#%#//scriptlet('abort-on-property-read', 'navigator.language')
 *
 * ! Aborts script when it tries to access `window.adblock` and it's error stack trace contains `test.js`
 * example.org#%#//scriptlet('abort-on-property-read', 'adblock', 'test.js')
 * ```
 */
/* eslint-enable max-len */
export function abortOnPropertyRead(source, property, stack) {
    if (!property) {
        return;
    }

    // https://github.com/AdguardTeam/Scriptlets/issues/82
    stack = stack ? toRegExp(stack) : toRegExp('/.?/');

    const stackTrace = new Error().stack // get original stack trace
        .split('\n')
        // .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    if (!stack.test(stackTrace)) {
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

    window.onerror = createOnErrorHandler(rid)
        .bind();
}

abortOnPropertyRead.names = [
    'abort-on-property-read',
    'abort-on-property-read.js',
    'ubo-abort-on-property-read.js',
    'aopr.js',
    'ubo-aopr.js',
    'abp-abort-on-property-read',
];
abortOnPropertyRead.injections = [
    randomId,
    toRegExp,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
];
