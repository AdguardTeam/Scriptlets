import {
    hit,
    logMessage,
    getNumberFromString,
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
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    setPropertyAccess,
    toRegExp,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-constant
 *
 * @description
 * Creates a constant property and assigns it one of the values from the predefined list.
 *
 * > Actually, it's not a constant. Please note, that it can be rewritten with a value of a different type.
 *
 * > If empty object is present in chain it will be trapped until chain leftovers appear.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-constantjs-
 *
 * Related ABP snippet:
 * https://github.com/adblockplus/adblockpluscore/blob/adblockpluschrome-3.9.4/lib/content/snippets.js#L1361
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-constant', property, value[, stack,[ valueWrapper[, setProxyTrap]]])
 * ```
 *
 * - `property` — required, path to a property (joined with `.` if needed). The property must be attached to `window`.
 * - `value` — required. Possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `emptyObj` — empty object
 *         - `emptyArr` — empty array
 *         - `noopFunc` — function with empty body
 *         - `noopCallbackFunc` — function returning noopFunc
 *         - `trueFunc` — function returning true
 *         - `falseFunc` — function returning false
 *         - `throwFunc` — function throwing an error
 *         - `noopPromiseResolve` — function returning Promise object that is resolved with an empty response
 *         - `noopPromiseReject` — function returning Promise.reject()
 *         - `''` — empty string
 *         - `-1` — number value `-1`
 *         - `yes`
 *         - `no`
 * - `stack` — string or regular expression that must match the current function call stack trace,
 *   defaults to matching every call; if regular expression is invalid, it will be skipped
 * - `valueWrapper` – optional, string to modify a value to be set. Possible wrappers:
 *     - `asFunction` – function returning value
 *     - `asCallback` – function returning callback, that would return value
 *     - `asResolved` – Promise that would resolve with value
 *     - `asRejected` – Promise that would reject with value
 * - `setProxyTrap` – optional, boolean, if set to true, proxy trap will be set on the object
 *
 * ### Examples
 *
 * ```adblock
 * ! Any access to `window.first` will return `false`
 * example.org#%#//scriptlet('set-constant', 'first', 'false')
 *
 * ✔ window.first === false
 * ```
 *
 * ```adblock
 * ! Any call to `window.second()` will return `true`
 * example.org#%#//scriptlet('set-constant', 'second', 'trueFunc')
 *
 * ✔ window.second() === true
 * ✔ window.second.toString() === "function trueFunc() {return true;}"
 * ```
 *
 * ```adblock
 * ! Any call to `document.third()` will return `true` if the method is related to `checking.js`
 * example.org#%#//scriptlet('set-constant', 'document.third', 'trueFunc', 'checking.js')
 *
 * ✔ document.third() === true  // if the condition described above is met
 * ```
 *
 * ```adblock
 * ! Any call to `document.fourth()` will return `yes`
 * example.org#%#//scriptlet('set-constant', 'document.fourth', 'yes', '', 'asFunction')
 *
 * ✔ document.fourth() === 'yes'
 * ```
 *
 * ```adblock
 * ! Any call to `document.fifth()` will return `yes`
 * example.org#%#//scriptlet('set-constant', 'document.fifth', '42', '', 'asRejected')
 *
 * ✔ document.fifth.catch((reason) => reason === 42) // promise rejects with specified number
 * ```
 *
 * ```adblock
 * ! Any access to `window.foo.bar` will return `false` and the proxy trap will be set on the `foo` object
 * ! It may be required in the case when `foo` object is overwritten by website script
 * ! Related to this issue - https://github.com/AdguardTeam/Scriptlets/issues/330
 * example.org#%#//scriptlet('set-constant', 'foo.bar', 'false', '', '', 'true')
 *
 * ✔ window.foo.bar === false
 * ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function setConstant(source, property, value, stack = '', valueWrapper = '', setProxyTrap = false) {
    const uboAliases = [
        'set-constant.js',
        'ubo-set-constant.js',
        'set.js',
        'ubo-set.js',
        'ubo-set-constant',
        'ubo-set',
    ];

    /**
     * UBO set-constant analog has it's own args sequence:
     * (property, value, defer | wrapper)
     * 'defer' – a stringified number, which defines execution time, or
     * 'wrapper' - string which defines value wrapper name
     *
     * joysound.com##+js(set, document.body.oncopy, null, 3)
     * kompetent.de##+js(set, Object.keys, 42, asFunction)
     */
    if (uboAliases.includes(source.name)) {
        /**
         * Check that third argument was intended as 'valueWrapper' argument,
         * by excluding 'defer' single digits case, and move it to 'valueWrapper'
         */
        if (stack.length !== 1 && !getNumberFromString(stack)) {
            valueWrapper = stack;
        }
        /**
         * ubo doesn't support 'stack', while adg doesn't support 'defer'
         * that goes in the same spot, so we discard it
         */
        stack = undefined;
    }

    if (!property
        || !matchStackTrace(stack, new Error().stack)) {
        return;
    }

    let isProxyTrapSet = false;

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
    } else if (value === 'noopCallbackFunc') {
        constantValue = noopCallbackFunc;
    } else if (value === 'trueFunc') {
        constantValue = trueFunc;
    } else if (value === 'falseFunc') {
        constantValue = falseFunc;
    } else if (value === 'throwFunc') {
        constantValue = throwFunc;
    } else if (value === 'noopPromiseResolve') {
        constantValue = noopPromiseResolve;
    } else if (value === 'noopPromiseReject') {
        constantValue = noopPromiseReject;
    } else if (/^\d+$/.test(value)) {
        constantValue = parseFloat(value);
        if (nativeIsNaN(constantValue)) {
            return;
        }
        if (Math.abs(constantValue) > 32767) {
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

    const valueWrapperNames = [
        'asFunction',
        'asCallback',
        'asResolved',
        'asRejected',
    ];

    if (valueWrapperNames.includes(valueWrapper)) {
        const valueWrappersMap = {
            asFunction(v) {
                return () => v;
            },
            asCallback(v) {
                return () => (() => v);
            },
            asResolved(v) {
                return Promise.resolve(v);
            },
            asRejected(v) {
                return Promise.reject(v);
            },
        };

        constantValue = valueWrappersMap[valueWrapper](constantValue);
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
     * IMPORTANT! this duplicates corresponding func in trusted-set-constant scriptlet as
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

            if (base[prop]) {
                base[prop] = constantValue;
            }

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
                // Set a proxy trap to observe changes
                // This is a partial fix and only works with a single scriptlet,
                // a full fix requires synchronisation between the scriptlets
                // TODO: add proper fix when synchronisation between scriptlets is added
                // https://github.com/AdguardTeam/Scriptlets/issues/330
                if (a instanceof Object) {
                    // Get properties which should be checked and remove first one
                    // because it's current object
                    const propertiesToCheck = property.split('.').slice(1);
                    if (setProxyTrap && !isProxyTrapSet) {
                        isProxyTrapSet = true;
                        a = new Proxy(a, {
                            get: (target, propertyKey, val) => {
                                // Check if object contains required property, if so
                                // check if current value is equal to constantValue, if not, set it to constantValue
                                propertiesToCheck.reduce((object, currentProp, index, array) => {
                                    const currentObj = object?.[currentProp];
                                    if (currentObj && index === array.length - 1 && currentObj !== constantValue) {
                                        object[currentProp] = constantValue;
                                    }
                                    return currentObj || object;
                                }, target);
                                return Reflect.get(target, propertyKey, val);
                            },
                        });
                    }
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
     * IMPORTANT! this duplicates corresponding func in trusted-set-constant scriptlet as
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
    logMessage,
    getNumberFromString,
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
    matchStackTrace,
    nativeIsNaN,
    isEmptyObject,
    // following helpers should be imported and injected
    // because they are used by helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    setPropertyAccess,
    toRegExp,
];
