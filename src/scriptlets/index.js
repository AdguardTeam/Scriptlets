import { redirectsCjs } from '../redirects/redirects';

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
    getScriptletByName,
    isValidScriptletName,
} from '../helpers/validator';

import {
    isValidScriptletRule,
    convertUboScriptletToAdg,
    convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
} from '../helpers/converter';

// import { parseRule } from '../helpers/parse-rule';

// import * as scriptletsList from './scriptletsList';

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
 * Global scriptlet variable
 *
 * @returns {Object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
// eslint-disable-next-line no-undef
scriptlets = (() => ({
    invoke: getScriptletCode,
    validateName: isValidScriptletName,
    validateRule: isValidScriptletRule,
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    convertUboToAdg: convertUboScriptletToAdg,
    convertAbpToAdg: convertAbpSnippetToAdg,
    convertScriptletToAdg,
    convertAdgToUbo: convertAdgScriptletToUbo,
    redirects: redirectsCjs,
}))();

export default scriptlets; // eslint-disable-line no-undef
