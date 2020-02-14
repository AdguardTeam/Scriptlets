import {
    attachDependencies,
    addCall,
    passSourceAndProps,
    wrapInNonameFunc,
} from '../helpers/injector';

import {
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    convertUboToAdg,
    convertAbpToAdg,
    convertScriptletToAdg,
    convertAdgToUbo,
} from '../helpers/converter';

import { parseRule } from '../helpers/parse-rule';

import * as scriptletsList from './scriptletsList';

/**
 * @typedef {Object} Source - scriptlet properties
 * @property {string} name Scriptlet name
 * @property {Array<string>} args Arguments for scriptlet function
 * @property {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
 * @property {string} [version]
 * @property {boolean} [verbose] flag to enable printing to console debug information
 * @property {string} [ruleText] Source rule text is used for debugging purposes
 */


/**
 * Find scriptlet by it's name
 * @param {string} name
 */
function getScriptletByName(name) {
    const scriptlets = Object.keys(scriptletsList).map((key) => scriptletsList[key]);
    return scriptlets
        .find((s) => s.names && s.names.indexOf(name) > -1);
}

/**
 * Checks if the scriptlet name is valid
 * @param {string} name - Scriptlet name
 */
function isValidScriptletName(name) {
    if (!name) {
        return false;
    }
    const scriptlet = getScriptletByName(name);
    if (!scriptlet) {
        return false;
    }
    return true;
}

/**
* Returns scriptlet code by param
* @param {Source} source
*/
function getScriptletCode(source) {
    if (!isValidScriptletName(source.name)) {
        return null;
    }

    const scriptlet = getScriptletByName(source.name);
    let result = attachDependencies(scriptlet);
    result = addCall(scriptlet, result);
    result = source.engine === 'corelibs'
        ? wrapInNonameFunc(result)
        : passSourceAndProps(source, result);
    return result;
}

/**
 * Validates any scriptlet rule
 * @param {string} input - can be Adguard or Ubo or Abp scriptlet rule
 */
export function isValidScriptletRule(input) {
    if (!input) {
        return false;
    }
    // ABP 'input' rule may contain more than one snippet
    const rulesArray = convertScriptletToAdg(input);

    // checking if each of parsed scriptlets is valid
    // if at least one of them is not valid - whole 'input' rule is not valid too
    const isValid = rulesArray.reduce((acc, rule) => {
        const parsedRule = parseRule(rule);
        return isValidScriptletName(parsedRule.name) && acc;
    }, true);

    return isValid;
}


/**
 * Global scriptlet variable
 *
 * @returns {Object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
const scriptlets = {
    invoke: getScriptletCode,
    validateName: isValidScriptletName,
    validateRule: isValidScriptletRule,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    convertUboToAdg,
    convertAbpToAdg,
    convertScriptletToAdg,
    convertAdgToUbo,
};

export default scriptlets;
