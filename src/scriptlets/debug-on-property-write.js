import {
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    toRegExp,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet debug-on-property-write
 *
 * @description
 * This scriptlet is basically the same as [abort-on-property-write](#abort-on-property-write), but instead of aborting it starts the debugger.
 *
 * **It is not supposed to be used in production filter lists!**
 *
 * **Syntax**
 * ```
 * ! Aborts script when it tries to write in property `window.test`
 * example.org#%#//scriptlet("debug-on-property-write", "test")
 * ```
 */
/* eslint-enable max-len */
export function debugOnPropertyWrite(source, property, stack) {
    if (!property) {
        return;
    }

    // https://github.com/AdguardTeam/Scriptlets/issues/82
    stack = stack ? toRegExp(stack) : toRegExp('/.?/');
    const stackTrace = new Error().stack
        .split('\n')
        .slice(2)
        .map((line) => line.trim())
        .join('\n');

    if (!stack.test(stackTrace)) {
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

        setPropertyAccess(base, prop, { set: abort });
    };

    setChainPropAccess(window, property);

    window.onerror = createOnErrorHandler(rid).bind();
}

debugOnPropertyWrite.names = [
    'debug-on-property-write',
];

debugOnPropertyWrite.injections = [
    randomId,
    setPropertyAccess,
    getPropertyInChain,
    createOnErrorHandler,
    hit,
    toRegExp,
];
