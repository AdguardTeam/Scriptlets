import { hit } from './hit';
import { getPropertyInChain } from './get-property-in-chain';
import { isEmptyObject } from './object-utils';
import { getDescriptorAddon } from './get-descriptor-addon';
import { matchStackTrace } from './match-stack';
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
