import { redirectsCjs } from '../redirects';

import {
    attachDependencies,
    addCall,
    passSourceAndProps,
    wrapInNonameFunc,
} from '../helpers/injector';

import validator from '../helpers/validator';

import {
    isValidScriptletRule,
    convertUboScriptletToAdg,
    convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
} from '../helpers/converter';


/**
 * @typedef {Object} Source - scriptlet properties
 * @property {string} name Scriptlet name
 * @property {Array<string>} args Arguments for scriptlet function
 * @property {'extension'|'corelibs'|'test'} engine -
 * Defines the final form of scriptlet string presentation
 * @property {string} [version]
 * @property {boolean} [verbose] flag to enable printing to console debug information
 * @property {string} [ruleText] Source rule text is used for debugging purposes
 */

/**
* Returns scriptlet code by param
* @param {Source} source
*/
function getScriptletCode(source) {
    if (!validator.isValidScriptletName(source.name)) {
        return null;
    }

    const scriptlet = validator.getScriptletByName(source.name);
    let result = attachDependencies(scriptlet);
    result = addCall(scriptlet, result);
    result = source.engine === 'corelibs' || source.engine === 'test'
        ? wrapInNonameFunc(result)
        : passSourceAndProps(source, result);
    return result;
}

/**
 * Scriptlets variable
 *
 * @returns {Object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
const scriptletsObject = (() => ({
    invoke: getScriptletCode,
    isValidScriptletName: validator.isValidScriptletName,
    isValidScriptletRule,
    isAdgScriptletRule: validator.isAdgScriptletRule,
    isUboScriptletRule: validator.isUboScriptletRule,
    isAbpSnippetRule: validator.isAbpSnippetRule,
    convertUboToAdg: convertUboScriptletToAdg,
    convertAbpToAdg: convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgToUbo: convertAdgScriptletToUbo,
    redirects: redirectsCjs,
}))();

export default scriptletsObject;
