import { type ChainBase } from '../../types/types';

/**
 * Defines an intermediate getter/setter trap on `owner[prop]` to intercept
 * chain property assignment and allow recursive re-application of chain access.
 *
 * Reads the current value of `owner[prop]` safely (using try/catch) so that an
 * already-existing intermediate property keeps its value after the trap is set.
 *
 * @param owner Object on which to define the intercepting property.
 * @param prop Intermediate property name to intercept.
 * @param chain Remaining property chain string.
 * @param setChainPropAccess Callback invoked when the intercepted property is
 *                           assigned a new Object value.
 */
export const interceptChainProp = (
    owner: ChainBase,
    prop: string,
    chain: string,
    setChainPropAccess: (base: ChainBase, chain: string) => void,
): void => {
    let base: unknown;
    try {
        base = owner[prop];
    } catch (e) {
        base = undefined;
    }
    const setter = (a: unknown): void => {
        base = a;
        if (a instanceof Object) {
            setChainPropAccess(a as ChainBase, chain);
        }
    };
    Object.defineProperty(owner, prop, {
        get: () => base,
        set: setter,
    });
};
