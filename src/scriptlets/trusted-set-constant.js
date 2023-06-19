import {
    hit,
    inferValue,
    logMessage,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    getNativeRegexpTest,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-constant
 *
 * @description
 * Creates a constant property and assigns it a specified value.
 *
 * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
 *
 * > If empty object is present in chain it will be trapped until chain leftovers appear.
 *
 * > Use [set-constant](./about-scriptlets.md#set-constant) to set predefined values and functions.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-constant', property, value[, stack])
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `value` — required, an arbitrary value to be set; value type is being inferred from the argument,
 *   e.g '500' will be set as number; to set string type value wrap argument into another pair of quotes: `'"500"'`;
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if regular expression is invalid it will be skipped
 *
 * ### Examples
 *
 * 1. Set property values of different types
 *
 *     ```adblock
 *     ! Set string value wrapping argument into another pair of quotes
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '"null"')
 *
 *     ✔ window.click_r === 'null'
 *     ✔ typeof window.click_r === 'string'
 *
 *     ! Set inferred null value
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', 'null')
 *
 *     ✔ window.click_r === null
 *     ✔ typeof window.click_r === 'object'
 *
 *     ! Set number type value
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '48')
 *
 *     ✔ window.click_r === 48
 *     ✔ typeof window.click_r === 'number'
 *
 *     ! Set array or object as property value, argument should be a JSON string
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '[1,"string"]')
 *     example.org#%#//scriptlet('trusted-set-constant', 'click_r', '{"aaa":123,"bbb":{"ccc":"string"}}')
 *     ```
 *
 * 1. Use script stack matching to set value
 *
 *     ```adblock
 *     ! `document.first` will return `1` if the method is related to `checking.js`
 *     example.org#%#//scriptlet('trusted-set-constant', 'document.first', '1', 'checking.js')
 *
 *     ✔ document.first === 1  // if the condition described above is met
 *     ```
 *
 * @added v1.8.2.
 */
/* eslint-enable max-len */
export function trustedSetConstant(source, property, value, stack) {
    if (!property
        || !matchStackTrace(stack, new Error().stack)) {
        return;
    }

    let constantValue;
    try {
        constantValue = inferValue(value);
    } catch (e) {
        logMessage(source, e);
        return;
    }

    let canceled = false;
    const mustCancel = (value) => {
        if (canceled) {
            return canceled;
        }
        canceled = value !== undefined
            && constantValue !== undefined
            && typeof value !== typeof constantValue
            && value !== null;
        return canceled;
    };

    /**
     * Safely sets property on a given object
     *
     * IMPORTANT! this duplicates corresponding func in set-constant scriptlet as
     * reorganizing this to common helpers will most definitely complicate debugging
     *
     * @param {object} base arbitrary reachable object
     * @param {string} prop property name
     * @param {boolean} configurable if set property should be configurable
     * @param {object} handler custom property descriptor object
     * @returns {boolean} true if prop was trapped successfully
     */
    const trapProp = (base, prop, configurable, handler) => {
        if (!handler.init(base[prop])) {
            return false;
        }

        const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        let prevSetter;
        // This is required to prevent scriptlets overwrite each over
        if (origDescriptor instanceof Object) {
            // This check is required to avoid defining non-configurable props
            if (!origDescriptor.configurable) {
                const message = `Property '${prop}' is not configurable`;
                logMessage(source, message);
                return false;
            }

            base[prop] = constantValue;
            if (origDescriptor.set instanceof Function) {
                prevSetter = origDescriptor.set;
            }
        }
        Object.defineProperty(base, prop, {
            configurable,
            get() {
                return handler.get();
            },
            set(a) {
                if (prevSetter !== undefined) {
                    prevSetter(a);
                }
                handler.set(a);
            },
        });
        return true;
    };

    /**
     * Traverses given chain to set constant value to its end prop
     * Chains that yet include non-object values (e.g null) are valid and will be
     * traversed when appropriate chain member is set by an external script
     *
     * IMPORTANT! this duplicates corresponding func in set-constant scriptlet as
     * reorganizing this to common helpers will most definitely complicate debugging
     *
     * @param {object} owner object that owns chain
     * @param {string} property chain of owner properties
     */
    const setChainPropAccess = (owner, property) => {
        const chainInfo = getPropertyInChain(owner, property);
        const { base } = chainInfo;
        const { prop, chain } = chainInfo;

        // Handler method init is used to keep track of factual value
        // and apply mustCancel() check only on end prop
        const inChainPropHandler = {
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
            init(a) {
                if (mustCancel(a)) {
                    return false;
                }
                return true;
            },
            get() {
                return constantValue;
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
            const isTrapped = trapProp(base, prop, false, endPropHandler);
            if (isTrapped) {
                hit(source);
            }
            return;
        }

        // Null prop in chain
        if (base !== undefined && base[prop] === null) {
            trapProp(base, prop, true, inChainPropHandler);
            return;
        }

        // Empty object prop in chain
        if ((base instanceof Object || typeof base === 'object') && isEmptyObject(base)) {
            trapProp(base, prop, true, inChainPropHandler);
        }

        // Defined prop in chain
        const propValue = owner[prop];
        if (propValue instanceof Object || (typeof propValue === 'object' && propValue !== null)) {
            setChainPropAccess(propValue, chain);
        }

        // Undefined prop in chain
        trapProp(base, prop, true, inChainPropHandler);
    };
    setChainPropAccess(window, property);
}

trustedSetConstant.names = [
    'trusted-set-constant',
    // trusted scriptlets support no aliases
];
trustedSetConstant.injections = [
    hit,
    inferValue,
    logMessage,
    noopArray,
    noopObject,
    noopFunc,
    noopCallbackFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    getPropertyInChain,
    setPropertyAccess,
    toRegExp,
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    getNativeRegexpTest,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
];
