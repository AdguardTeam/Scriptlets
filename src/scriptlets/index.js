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

// next module should be built and put in the tmp directory before building this module
// eslint-disable-next-line import/no-unresolved,import/extensions
import { getScriptletFunction } from '../../tmp/scriptlets-func';

/**
 * @typedef {Object} Source - scriptlet properties
 * @property {string} name Scriptlet name
 * @property {Array<string>} args Arguments for scriptlet function
 * @property {'extension'|'corelibs'|'test'} engine -
 * Defines the final form of scriptlet string presentation
 * @property {string} [version]
 * @property {boolean} [verbose] flag to enable printing to console debug information
 * @property {string} [ruleText] Source rule text is used for debugging purposes
 * @property {string} [domainName] domain name where scriptlet is applied; for debugging purposes
 */

/**
 * Returns scriptlet code by param
 * @param {Source} source
 * @returns {string|null} scriptlet code
 */
function getScriptletCode(source) {
    if (!validator.isValidScriptletName(source.name)) {
        return null;
    }

    const scriptletFunction = getScriptletFunction(source.name).toString();
    const result = source.engine === 'corelibs' || source.engine === 'test'
        ? wrapInNonameFunc(scriptletFunction)
        : passSourceAndProps(source, scriptletFunction);
    return result;
}

/**
 * Scriptlets variable
 *
 * @returns {Object} object with methods:
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
    };
})();

export default scriptletsObject;
