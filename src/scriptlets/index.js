import {
    attachDependencies,
    addCall,
    passSourceAndProps,
    wrapInNonameFunc,
} from '../helpers/injector';

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
 * Check is scriptlet params valid
 * @param {Object} source
 */
function isValidScriptletSource(source) {
    if (!source.name) {
        return false;
    }
    const scriptlet = getScriptletByName(source.name);
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
    if (!isValidScriptletSource(source)) {
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
 * @returns {Object} object with method `invoke`
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `Source` type
 */
// eslint-disable-next-line no-undef
scriptlets = (() => ({
    invoke: getScriptletCode,
    validate: isValidScriptletSource,
}))();
