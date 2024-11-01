// Ignore this module, because it appears only during build
// @ts-ignore
import { getScriptletFunction } from 'scriptlets-func';

import { passSourceAndProps, wrapInNonameFunc } from '../helpers/injector';

/**
 * @typedef {object} Source Scriptlet properties.
 * @property {string} name Scriptlet name.
 * @property {Array<string>} args Arguments for scriptlet function.
 * @property {'extension'|'corelibs'|'test'} engine Defines the final form of scriptlet string presentation.
 * @property {string} [version] Extension version.
 * @property {boolean} [verbose] Flag to enable debug information printing to console.
 * @property {string} [ruleText] Source rule text, needed for debug purposes.
 * @property {string} [domainName] Domain name where scriptlet is applied, needed for debug purposes.
 */

/**
 * Scriptlet properties
 */
export interface IConfiguration {
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
}
/**
 * Returns scriptlet code by `source`.
 *
 * @param {Source} source Scriptlet properties.
 *
 * @returns {string|null} Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
function getScriptletCode(source: IConfiguration): string {
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

// FIXME remove when not needed
/**
 * Scriptlets variable
 *
 * @returns {object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
// const scriptlets = (() => {
//     return {
//         invoke: getScriptletCode,
//         getScriptletFunction,
//
// FIXME export from the validators module
// isValidScriptletName: validator.isValidScriptletName,
// isValidScriptletRule,
// isAdgScriptletRule: validator.isAdgScriptletRule,
// isUboScriptletRule: validator.isUboScriptletRule,
// isAbpSnippetRule: validator.isAbpSnippetRule,
// FIXME export from the converters module
// convertUboToAdg: convertUboScriptletToAdg,
// convertAbpToAdg: convertAbpSnippetToAdg,
// convertScriptletToAdg,
// convertAdgToUbo: convertAdgScriptletToUbo,
// FIXME export from the redirects module
// redirects,
//     };
// })();

export const scriptlets = {
    invoke: getScriptletCode,
    getScriptletFunction,
};

// FIXME make available like this
// import { scriptlets } '@adguard/scriptlets';
// import { converters } '@adguard/scriptlets/converters';
// import { redirects } '@adguard/scriptlets/redirects';
// import { validator } '@adguard/scriptlets/validators';

// export { scriptlets };
