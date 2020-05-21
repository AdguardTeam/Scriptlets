import {
    randomId, setPropertyAccess, getPropertyInChain, createOnErrorHandler, hit, toRegExp,
} from '../helpers';

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
 * https://github.com/adblockplus/adblockpluscore/blob/6b2a309054cc23432102b85d13f12559639ef495/lib/content/snippets.js#L896
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('abort-on-property-write', property[, stack])
 * ```
 *
 * **Parameters**
 * - `property` (required) path to a property (joined with `.` if needed). The property must be attached to `window`
 * - `stack` (optional) string or regular expression that must match the current function call stack trace
 *
 * **Examples**
 * ```
 * ! Aborts script when it tries to set `window.adblock` value
 * example.org#%#//scriptlet('abort-on-property-write', 'adblock')
 *
 * ! Aborts script when it tries to set `window.adblock` value and it's error stack trace contains `checking.js`
 * example.org#%#//scriptlet('abort-on-property-write', 'adblock', '')
 * ```
 */
/* eslint-enable max-len */
export function abortOnPropertyWrite(source, property, stack) {
    if (!property) {
        return;
    }

    // https://github.com/AdguardTeam/Scriptlets/issues/82
    stack = stack ? toRegExp(stack) : toRegExp('/.?/');

    const stackTrace = new Error().stack // get original stack trace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
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

        setPropertyAccess(base, prop, { set: abort });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

abortOnPropertyWrite.names = [
    'abort-on-property-write',
    'abort-on-property-write.js',
    'ubo-abort-on-property-write.js',
    'aopw.js',
    'ubo-aopw.js',
    'abp-abort-on-property-write',
];

abortOnPropertyWrite.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    toRegExp,
];
