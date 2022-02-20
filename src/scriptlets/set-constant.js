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
export function setConstant(source, chain, value, stack) {
    if (!chain
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

    const ourScript = document.currentScript;
    const trapProperty = (base, prop, chainLeftover, stage) => {
        debugger;
        let value = base[prop];
        Object.defineProperty(base, prop, {
            configurable: true,
            get() {
                switch (stage) {
                    case 'endProp':
                        return document.currentScript === ourScript
                            ? value
                            : constantValue;
                    case 'inChain':
                        return undefined;
                }
            },
            set(v) {
                switch (stage) {
                    case 'endProp':
                        break;
                    case 'inChain':
                        if (v instanceof Object) {
                            trapChain(v, chainLeftover);
                        }
                        constantValue = v;
                        break;
                }
            },
        });
    };

    const trapChain = (base, chain) => {
        let stage;
        let newBase;
        let newChain;
        let targetProperty;
        const chainArr = chain.split('.');
        if (chainArr.length === 1) {
            stage = 'endProp';
            targetProperty = chainArr[0];
            trapProperty(base, targetProperty, newChain, stage);
        }
        // Get index of first undefined property in chain
        const stopIndex = chainArr.findIndex((prop, index, array) => {
            let currentPropValue = array.slice(0, index + 1).reduce((previous, current) => previous[current], base);
            return typeof currentPropValue === 'undefined';
        });
        // Trap target property if all chain (target prop state is irrelevant, checks in trapProperty)
        if (stopIndex === -1 || stopIndex === chainArr.length - 1) {
            stage = 'endProp';
            targetProperty = chainArr.pop(); // get target prop and remove it from array
            newBase = chainArr.reduce((previous, current) => previous[current], base); // get new base value from last item
            trapProperty(newBase, targetProperty, newChain, stage);
        }
        // Some key on chain is undefined
        if (stopIndex !== -1) {
            stage = 'inChain';
            targetProperty = chainArr[stopIndex];
            newChain = chainArr.slice(stopIndex + 1).join('.'); // get chain leftover after unefined element
            // get element that preceeds undefined as new base
            newBase = chainArr.slice(0, stopIndex).reduce((previous, current) => previous[current], base);
            trapProperty(newBase, targetProperty, newChain, stage);
        };
    };

    trapChain(window, chain);
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
