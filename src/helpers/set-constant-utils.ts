import { hit } from './hit';
import { getPropertyInChain } from './get-property-in-chain';
import { isEmptyObject } from './object-utils';
import { getDescriptorAddon } from './get-descriptor-addon';
import { matchStackTrace } from './match-stack';
import { logMessage } from './log-message';
import { inferValue } from './string-utils';
import { wrapConstantValue } from './noop-utils';
import {
    parseUboOptions,
    unescapeUboArgument,
    getUboConstantValue,
    cloakUboFunction,
} from './ubo-utils';
import { runAtReadyState } from './ready-state-utils';
import { type Source } from '../scriptlets';
import { type ChainBase } from '../../types/types';

/**
 * Property handler interface used by trapProp.
 */
interface PropHandler {
    /**
     * Actual value of the property as set by page scripts,
     * stored so it can be returned when the constant override does not apply.
     */
    factValue: unknown;

    /**
     * Initializes the handler with the property's current value.
     *
     * @param a Existing value of the property at trap time.
     *
     * @returns `true` if the trap should proceed, `false` to cancel
     * (e.g. when `mustCancel` determines the value should not be overridden).
     */
    init(a: unknown): boolean;

    /**
     * Getter invoked when the trapped property is read.
     * Depending on the handler, it may return the constant value or the factual value.
     *
     * @returns Value to expose to the caller.
     */
    get(): unknown;

    /**
     * Setter invoked when the trapped property is written to.
     * Updates `factValue` and may trigger further chain traversal or constant reassignment.
     *
     * @param a New value being assigned to the property.
     */
    set(a: unknown): void;
}

/**
 * Configuration for the setChainPropAccess factory.
 */
interface SetChainPropAccessConfig {
    /**
     * Scriptlet source object for logging and hit reporting.
     */
    source: Source;

    /**
     * Stack trace pattern to match against; if falsy, constant is returned unconditionally.
     */
    stack: string | undefined;

    /**
     * Returns true if the constant assignment should be canceled based on the incoming value type.
     */
    mustCancel: (value: unknown) => boolean;

    /**
     * Defines a property descriptor on the base object to intercept get/set access.
     *
     * @param base Object on which to define the property.
     * @param prop Property name to intercept.
     * @param configurable Whether the property descriptor should be configurable.
     * @param handler Handler object containing `get` and `set` methods.
     *
     * @returns `true` if the trap was successfully defined, `false` otherwise.
     */
    trapProp: (base: ChainBase, prop: string, configurable: boolean, handler: PropHandler) => boolean;

    /**
     * Returns the current constant value (may change if `mustCancel` triggers reassignment).
     *
     * @returns Current constant value.
     */
    getConstantValue: () => unknown;

    /**
     * Updates the constant value when the end property setter detects a cancellation.
     *
     * @param value New constant value.
     */
    setConstantValue: (value: unknown) => void;
}

/**
 * Creates setChainPropAccess function for set-constant and trusted-set-constant scriptlets.
 *
 * Traverses given chain to set constant value to its end prop.
 * Chains that yet include non-object values (e.g null) are valid and will be
 * traversed when appropriate chain member is set by an external script.
 *
 * @param config Configuration object with scriptlet-specific dependencies.
 *
 * @returns `setChainPropAccess` function.
 */
export const createSetChainPropAccessor = (config: SetChainPropAccessConfig) => {
    const {
        source,
        stack,
        mustCancel,
        trapProp,
        getConstantValue,
        setConstantValue,
    } = config;

    /**
     * Traverses the given chain to set the constant value to its end property.
     *
     * @param owner Base object of the chain.
     * @param property Property name to intercept.
     */
    const setChainPropAccess = (owner: ChainBase, property: string): void => {
        const chainInfo = getPropertyInChain(owner, property);
        const { base, prop, chain } = chainInfo;

        // Handler method init is used to keep track of factual value
        // and apply mustCancel() check only on end prop
        const inChainPropHandler = {
            factValue: undefined as unknown,
            init(a: unknown) {
                this.factValue = a;
                return true;
            },
            get() {
                return this.factValue;
            },
            set(a: unknown) {
                // Prevent breakage due to loop assignments like win.obj = win.obj
                if (this.factValue === a) {
                    return;
                }

                this.factValue = a;
                if (a instanceof Object) {
                    setChainPropAccess(a as ChainBase, chain as string);
                }
            },
        };
        const endPropHandler = {
            factValue: undefined as unknown,
            descriptorAddon: getDescriptorAddon(),
            init(a: unknown) {
                if (mustCancel(a)) {
                    return false;
                }
                this.factValue = a;
                return true;
            },
            get() {
                if (!stack) {
                    hit(source);
                    return getConstantValue();
                }
                if (!this.descriptorAddon.isAbortingSuspended) {
                    this.descriptorAddon.isAbortingSuspended = true;
                    let stackMatches = false;
                    try {
                        stackMatches = matchStackTrace(stack, new Error().stack || '');
                    } catch (e) {
                        // Invalid regex or other error - return original value
                        this.descriptorAddon.isAbortingSuspended = false;
                        return this.factValue;
                    }
                    this.descriptorAddon.isAbortingSuspended = false;
                    if (stackMatches) {
                        hit(source);
                        return getConstantValue();
                    }
                }
                return this.factValue;
            },
            set(a: unknown) {
                if (mustCancel(a)) {
                    setConstantValue(a);
                    return;
                }
                this.factValue = a;
            },
        };

        // End prop case
        if (!chain) {
            trapProp(base, prop, false, endPropHandler);
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
            setChainPropAccess(propValue as ChainBase, chain);
        }

        // Undefined prop in chain
        trapProp(base, prop, true, inChainPropHandler);
    };

    return setChainPropAccess;
};

/**
 * Settings of `setConstantBySettings()`, which are parsed from the arguments of `trusted-set-constant` once,
 * by `getAdgConstantSetting()` or `getUboConstantSetting()`.
 */
export interface ConstantSetting {
    /**
     * Path to the property, e.g. `navigator.userAgent`.
     */
    property: string;

    /**
     * Value to set.
     */
    value: unknown;

    /**
     * Text or regular expression which the stack trace of reading the property has to match,
     * or an empty string to set the value for all reads.
     */
    stack: string;

    /**
     * If true, the value of the page replaces the constant once the page writes a value of another type,
     * as in AdGuard syntax. Otherwise writes of the page are ignored, as in uBO.
     */
    isCanceledByOtherType: boolean;

    /**
     * Ready state of the document when the property is trapped, see `runAtReadyState()`,
     * or `undefined` to trap it at once.
     */
    runAt: unknown;
}

/**
 * Parses the arguments of AdGuard `trusted-set-constant`: `value` is inferred by `inferValue()`, and the rule
 * is not applied if it throws, e.g. for a number greater than 32767, as before uBO arguments were supported;
 * `stack` is matched against the stack trace of reading the property; `valueWrapper` wraps the value
 * as in `set-constant`, see `wrapConstantValue()`; and the option `runAt, value` delays trapping the property,
 * see `runAtReadyState()`.
 *
 * Requires `logMessage`, `inferValue`, `wrapConstantValue` and `parseUboOptions`, with their dependencies,
 * in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param property Path to the property.
 * @param value Value to set.
 * @param stack Text or regular expression which the stack trace has to match.
 * @param valueWrapper Name of the wrapper of the value, e.g. `asFunction`.
 * @param args Named options which follow `valueWrapper`, e.g. `['runAt', 'interactive']`.
 *
 * @returns Settings of the constant, or `null` if the rule is not applied.
 */
export const getAdgConstantSetting = (
    source: Source,
    property: string,
    value: string,
    stack: string,
    valueWrapper: unknown,
    args: unknown[],
): ConstantSetting | null => {
    if (!property) {
        return null;
    }

    let constantValue: unknown;
    try {
        constantValue = inferValue(value);
    } catch (e) {
        logMessage(source, e);
        return null;
    }

    return {
        property,
        value: wrapConstantValue(constantValue, valueWrapper),
        stack: stack || '',
        isCanceledByOtherType: true,
        runAt: parseUboOptions(args).runAt,
    };
};

/**
 * Parses the arguments of uBO `trusted-set-constant`, i.e. of rules converted from uBO syntax,
 * as uBO `setConstantFn()` does for a trusted source:
 * - `rawValue` is a constant of uBO, see `getUboConstantValue()`, e.g. `json:"text"` or `{"value": "text"}`,
 *   and any other text is `undefined`;
 * - `noopFunc`, `trueFunc` and `falseFunc` look like native functions named as the property,
 *   see `cloakUboFunction()`;
 * - named options follow `rawValue`: `as, value` wraps the value, see `getUboConstantValue()`,
 *   and `runAt, value` delays trapping the property, see `runAtReadyState()`;
 * - writes of the page are ignored, and there is no `stack`.
 *
 * Requires `parseUboOptions`, `unescapeUboArgument`, `getUboConstantValue` and `cloakUboFunction`
 * in the injections of the scriptlet.
 *
 * @param chain Path to the property.
 * @param rawValue Value to set.
 * @param args Named options which follow `rawValue`, e.g. `['runAt', '2']`.
 *
 * @returns Settings of the constant, or `null` if the rule is not applied.
 */
export const getUboConstantSetting = (
    chain: unknown,
    rawValue: unknown,
    args: unknown[],
): ConstantSetting | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const CLOAKED_FUNCTIONS = ['noopFunc', 'trueFunc', 'falseFunc'];

    const property = typeof chain === 'string' ? unescapeUboArgument(chain) as string : '';
    const raw = typeof rawValue === 'string' ? unescapeUboArgument(rawValue) as string : '';
    const options = parseUboOptions(args.map(unescapeUboArgument));

    // As in uBO, the rule is not applied without a property, e.g. for `a.`
    const trappedProp = property.slice(property.lastIndexOf('.') + 1);
    if (property === '' || trappedProp === '') {
        return null;
    }

    let value = getUboConstantValue(raw, options);
    if (CLOAKED_FUNCTIONS.includes(raw)) {
        value = cloakUboFunction(value as Function, trappedProp);
    }

    return {
        property,
        value,
        stack: '',
        isCanceledByOtherType: false,
        runAt: options.runAt,
    };
};

/**
 * Sets a constant property by the settings parsed from the arguments of `trusted-set-constant`.
 * Each property of the path is trapped, so the value is set also if the path is created later,
 * and the last one returns the value, if `stack` matches the stack trace of reading it.
 *
 * Requires `hit`, `logMessage`, `createSetChainPropAccessor` and `runAtReadyState`,
 * with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param setting Settings of the constant.
 */
export const setConstantBySettings = (source: Source, setting: ConstantSetting): void => {
    const {
        property,
        stack,
        isCanceledByOtherType,
        runAt,
    } = setting;
    let constantValue = setting.value;

    let canceled = false;
    const mustCancel = (value: unknown): boolean => {
        if (!isCanceledByOtherType) {
            return false;
        }
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
     * Safely sets property on a given object.
     *
     * @param base Arbitrary reachable object.
     * @param prop Property name.
     * @param configurable If set property should be configurable.
     * @param handler Custom property descriptor object.
     *
     * @returns True if prop was trapped successfully.
     */
    const trapProp = (base: ChainBase, prop: string, configurable: boolean, handler: PropHandler): boolean => {
        if (!handler.init(base[prop])) {
            return false;
        }

        const origDescriptor = Object.getOwnPropertyDescriptor(base, prop);
        let prevSetter: ((v: unknown) => void) | undefined;
        // This is required to prevent scriptlets overwrite each over
        if (origDescriptor instanceof Object) {
            // This check is required to avoid defining non-configurable props
            if (!origDescriptor.configurable) {
                const message = `Property '${prop}' is not configurable`;
                logMessage(source, message);
                return false;
            }

            (base as unknown as Record<string, unknown>)[prop] = constantValue;
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
        setConstantValue: (v: unknown) => { constantValue = v; },
    });

    runAtReadyState(() => setChainPropAccess(window as unknown as ChainBase, property), runAt);
};
