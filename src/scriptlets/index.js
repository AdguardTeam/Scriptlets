import { redirects } from '../redirects';
import validator from '../helpers/validator';
import { passSourceAndProps, wrapInNonameFunc } from '../helpers/injector';
import {
    isValidScriptletRule,
    convertUboScriptletToAdg,
    convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
} from '../helpers/converter';
import { version } from '../../package.json';

// next module should be built and put in the tmp directory before building this module
// eslint-disable-next-line import/no-unresolved,import/extensions
import { getScriptletFunction } from '../../tmp/scriptlets-func';

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
 * Returns scriptlet code by `source`.
 *
 * @param {Source} source Scriptlet properties.
 *
 * @returns {string|null} Scriptlet code.
 * @throws An error on unknown scriptlet name.
 */
function getScriptletCode(source) {
    if (!validator.isValidScriptletName(source.name)) {
        return null;
    }

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

/**
 * Scriptlets variable
 *
 * @returns {object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
const scriptletsObject = (() => {
    return {
        invoke: getScriptletCode,
        getScriptletFunction,
        isValidScriptletName: validator.isValidScriptletName,
        isValidScriptletRule,
        isAdgScriptletRule: validator.isAdgScriptletRule,
        isUboScriptletRule: validator.isUboScriptletRule,
        isAbpSnippetRule: validator.isAbpSnippetRule,
        convertUboToAdg: convertUboScriptletToAdg,
        convertAbpToAdg: convertAbpSnippetToAdg,
        convertScriptletToAdg,
        convertAdgToUbo: convertAdgScriptletToUbo,
        redirects,
        SCRIPTLETS_VERSION: version,
    };
})();

export default scriptletsObject;
