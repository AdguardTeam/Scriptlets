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
 *         - `yes`
 *         - `no`
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
    } else if (value === 'yes') {
        constantValue = 'yes';
    } else if (value === 'no') {
        constantValue = 'no';
    } else {
        return;
    }

    const getCurrentScript = () => {
        if ('currentScript' in document) {
            return document.currentScript; // eslint-disable-line compat/compat
        }
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    };

    const ourScript = getCurrentScript();

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

    const trapProp = (base, prop, configurable, handler) => {
        if (!handler.init(base[prop])) {
            return;
        }
        const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        let prevGetter;
        let prevSetter;
        // This is required to prevent scriptlets overwrite each over
        if (origDescriptor instanceof Object) {
            base[prop] = constantValue;
            if (origDescriptor.get instanceof Function) {
                prevGetter = origDescriptor.get;
            }
            if (origDescriptor.set instanceof Function) {
                prevSetter = origDescriptor.set;
            }
        }
        Object.defineProperty(base, prop, {
            configurable,
            get() {
                if (prevGetter !== undefined) {
                    prevGetter();
                }
                return handler.get();
            },
            set(a) {
                if (prevSetter !== undefined) {
                    prevSetter(a);
                }
                handler.set(a);
            },
        });
    };

    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        const { base } = chainInfo;
        const { prop, chain } = chainInfo;

        // Handler method init is used to keep track of factual value
        // and apply mustCancel() check only on end prop
        const undefPropHandler = {
            factValue: undefined,
            init(a) {
                this.factValue = a;
                return true;
            },
            get() {
                return this.factValue;
            },
            set(a) {
                // Prevent breakage due to loop assignments like win.obj = win.obj
                if (this.factValue === a) {
                    return;
                }

                this.factValue = a;
                if (a instanceof Object) {
                    setChainPropAccess(a, chain);
                }
            },
        };
        const endPropHandler = {
            factValue: undefined,
            init(a) {
                if (mustCancel(a)) {
                    return false;
                }
                this.factValue = a;
                return true;
            },
            get() {
                // .currrentSript script check so we won't trap other scriptlets on the same chain
                // eslint-disable-next-line compat/compat
                return document.currentScript === ourScript ? this.factValue : constantValue;
            },
            set(a) {
                if (!mustCancel(a)) {
                    return;
                }
                constantValue = a;
            },
        };

        // End prop case
        if (!chain) {
            trapProp(base, prop, false, endPropHandler);
            hit(source);
            return;
        }

        // Defined prop in chain
        const propValue = owner[prop];
        if (propValue instanceof Object || (typeof propValue === 'object' && propValue !== null)) {
            setChainPropAccess(propValue, chain);
        }

        // Undefined prop in chain
        trapProp(owner, prop, true, undefPropHandler);
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
