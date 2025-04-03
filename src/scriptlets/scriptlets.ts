// Ignore this module, because it appears only during build
// @ts-ignore
// eslint-disable-next-line import/order
import { getScriptletFunction } from 'scriptlets-func';
import { passSourceAndProps, wrapInNonameFunc } from '../helpers/injector';
import { type PolicyApi } from '../helpers/trusted-types-utils';

/**
 * Interface of content script provided API.
 *
 * This API is used to provide a set of utilities and shared state
 * for scriptlets running in the context of a web page. Particularly,
 * it includes:
 * - Trusted Types Policy API utilities.
 * - Shared state between different scriptlet rules.
 *
 * NOTE: Currently only CoreLibs provides this API.
 */
export interface ContentScriptApi {
    /**
     * Trusted Types Policy API utilities.
     *
     * @see {@link PolicyApi} for more information.
     */
    readonly policy: PolicyApi;

    /**
     * Shared state between different script and scriptlet rules.
     *
     * This object acts as a centralized repository for shared data.
     * - Keys represent the unique identifiers or names of the shared data.
     * - Values can be of any type and should correspond to the specific data shared across script rules.
     *
     * @example
     * ```adguard
     * ! Modify in one script rule
     * #%#api.shared.testKey = 'testValue'
     *
     * ! Access in another (logs 'testValue')
     * #%#console.log(api.shared.testKey)
     * ```
     */
    readonly shared: Record<string, unknown>;
}

/**
 * Scriptlet properties
 */
export interface Source {
    /**
     * Scriptlet name
     */
    name: string;

    /**
     * Arguments for scriptlet function
     */
    args: string[];

    /**
     * {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
     */
    engine: string;

    /**
     * Version
     */
    version: string;

    /**
     * flag to enable printing to console debug information
     */
    verbose: boolean;

    /**
     * Source rule text is used for debugging purposes.
     *
     * @deprecated since it is not used in the code anymore.
     */
    ruleText?: string;

    /**
     * Domain name, used to improve logging
     */
    domainName?: string;

    /**
     * Optional unique identifier for a scriptlet instance.
     *
     * This identifier is used to prevent multiple executions of the same scriptlet on the page.
     * If provided, this `uniqueId` will be combined with the scriptlet's `name` and `args`
     * to create a unique identifier for the scriptlet call. This identifier is
     * stored in the `Window.prototype.toString` object to ensure the scriptlet
     * is not executed more than once in the same context.
     *
     * By avoiding multiple executions, it helps in reducing redundant operations and
     * potential side effects that might occur if the same scriptlet is called multiple times.
     *
     * If `uniqueId` is not specified, no such unique identifier is created, and the
     * scriptlet can be called multiple times.
     */
    uniqueId?: string;

    /**
     * Instance of content script provided API.
     *
     * Property optional because:
     * - for backwards compatibility,
     * - currently only CoreLibs provides this API.
     *
     * @see {@link ContentScriptApi} for more information.
     */
    api?: ContentScriptApi;
}

/**
 * Returns scriptlet code by `source`.
 *
 * @param source Scriptlet properties.
 *
 * @returns Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
function getScriptletCode(source: Source): string {
    const scriptletFunction = getScriptletFunction(source.name);
    // In case isValidScriptletName check will pass invalid scriptlet name,
    // for example when there is a bad alias
    if (typeof scriptletFunction !== 'function') {
        throw new Error(`Error: cannot invoke scriptlet with name: '${source.name}'`);
    }

    const scriptletFunctionString = scriptletFunction.toString();

    const result = source.engine === 'corelibs' || source.engine === 'test'
        ? wrapInNonameFunc(scriptletFunctionString)
        : passSourceAndProps(source, scriptletFunctionString);
    return result;
}

export const scriptlets = {
    invoke: getScriptletCode,
    getScriptletFunction,
};
