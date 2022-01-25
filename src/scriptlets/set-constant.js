import {
    hit,
    noopArray,
    noopObject,
    noopFunc,
    trueFunc,
    falseFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-constant
 *
 * @description
 * Creates a constant property and assigns it one of the values from the predefined list.
 *
 * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-
 *
 * Related ABP snippet:
 * https://github.com/adblockplus/adblockpluscore/blob/adblockpluschrome-3.9.4/lib/content/snippets.js#L1361
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-constant', property, value[, stack])
 * ```
 *
 * - `property` - required, path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `value` - required. Possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `emptyObj` - empty object
 *         - `emptyArr` - empty array
 *         - `noopFunc` - function with empty body
 *         - `trueFunc` - function returning true
 *         - `falseFunc` - function returning false
 *         - `noopPromiseResolve` - function returning Promise object that is resolved with an empty response
 *         - `noopPromiseReject` - function returning Promise.reject()
 *         - `''` - empty string
 *         - `-1` - number value `-1`
 * - `stack` - optional, string or regular expression that must match the current function call stack trace;
 * if regular expression is invalid it will be skipped
 *
 * **Examples**
 * ```
 * ! Any access to `window.first` will return `false`
 * example.org#%#//scriptlet('set-constant', 'first', 'false')
 *
 * ✔ window.first === false
 * ```
 *
 * ```
 * ! Any call to `window.second()` will return `true`
 * example.org#%#//scriptlet('set-constant', 'second', 'trueFunc')
 *
 * ✔ window.second() === true
 * ✔ window.second.toString() === "function trueFunc() {return true;}"
 * ```
 *
 * ```
 * ! Any call to `document.third()` will return `true` if the method is related to `checking.js`
 * example.org#%#//scriptlet('set-constant', 'document.third', 'trueFunc', 'checking.js')
 *
 * ✔ document.third() === true  // if the condition described above is met
 * ```
 */
/* eslint-enable max-len */
export function setConstant(source, property, value, stack) {
    if (!property
        || !matchStackTrace(stack, new Error().stack)) {
        return;
    }

    const emptyArr = noopArray();
    const emptyObj = noopObject();

    let constantValue;
    if (value === 'undefined') {
        constantValue = undefined;
    } else if (value === 'false') {
        constantValue = false;
    } else if (value === 'true') {
        constantValue = true;
    } else if (value === 'null') {
        constantValue = null;
    } else if (value === 'emptyArr') {
        constantValue = emptyArr;
    } else if (value === 'emptyObj') {
        constantValue = emptyObj;
    } else if (value === 'noopFunc') {
        constantValue = noopFunc;
    } else if (value === 'trueFunc') {
        constantValue = trueFunc;
    } else if (value === 'falseFunc') {
        constantValue = falseFunc;
    } else if (value === 'noopPromiseResolve') {
        constantValue = noopPromiseResolve;
    } else if (value === 'noopPromiseReject') {
        constantValue = noopPromiseReject;
    } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (nativeIsNaN(constantValue)) {
            return;
        }
        if (Math.abs(constantValue) > 0x7FFF) {
            return;
        }
    } else if (value === '-1') {
        constantValue = -1;
    } else if (value === '') {
        constantValue = '';
    } else {
        return;
    }

    let canceled = false;
    const mustCancel = (value) => {
        if (canceled) {
            return canceled;
        }
        canceled = value !== undefined
            && constantValue !== undefined
            && typeof value !== typeof constantValue;
        return canceled;
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        let { base } = chainInfo;
        const { prop, chain } = chainInfo;

        // The scriptlet might be executed before the chain property has been created.
        // In this case we're checking whether the base element exists or not
        // and if not, we simply exit without overriding anything
        if (base instanceof Object === false && base === null) {
            // log the reason only while debugging
            if (source.verbose) {
                const props = property.split('.');
                const propIndex = props.indexOf(prop);
                const baseName = props[propIndex - 1];
                console.log(`set-constant failed because the property '${baseName}' does not exist`); // eslint-disable-line no-console, max-len
            }
            return;
        }

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

        if (mustCancel(base[prop])) { return; }

        hit(source);
        setPropertyAccess(base, prop, {
            get: () => constantValue,
            set: (a) => {
                if (mustCancel(a)) {
                    constantValue = a;
                }
            },
        });
    };

    setChainPropAccess(window, property);
}

setConstant.names = [
    'set-constant',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-constant.js',
    'ubo-set-constant.js',
    'set.js',
    'ubo-set.js',
    'ubo-set-constant',
    'ubo-set',
    'abp-override-property-read',
];
setConstant.injections = [
    hit,
    noopArray,
    noopObject,
    noopFunc,
    trueFunc,
    falseFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
];
