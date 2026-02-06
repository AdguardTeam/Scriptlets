import {
    hit,
    inferValue,
    logMessage,
    createSetChainPropAccessor,
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
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    getDescriptorAddon,
} from '../helpers';

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
 *   e.g '500' will be set as number; simple strings that do not match
 *   other types are automatically set as strings, e.g 'yes', 'no', 'allow';
 *   to set string type value that looks like other types,
 *   wrap argument into another pair of quotes, e.g. `'"500"'` for a string;
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
 *
 *     ! Set simple string value without quotes
 *     example.org#%#//scriptlet('trusted-set-constant', 'test', 'no')
 *
 *     ✔ window.test === 'no'
 *     ✔ typeof window.test === 'string'
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
    if (!property) {
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

    const setChainPropAccess = createSetChainPropAccessor({
        source,
        stack,
        mustCancel,
        trapProp,
        getConstantValue: () => constantValue,
        setConstantValue: (v) => { constantValue = v; },
    });
    setChainPropAccess(window, property);
}

export const trustedSetConstantNames = [
    'trusted-set-constant',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedSetConstant.primaryName = trustedSetConstantNames[0];

trustedSetConstant.injections = [
    hit,
    inferValue,
    logMessage,
    createSetChainPropAccessor,
    // following helpers should be imported and injected
    // because they are used by helpers above
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
    shouldAbortInlineOrInjectedScript,
    backupRegExpValues,
    restoreRegExpValues,
    getDescriptorAddon,
];
