import { redirectsCjs } from '../redirects';

import {
    attachDependencies,
    addCall,
    passSourceAndProps,
    wrapInNonameFunc,
} from '../helpers/injector';

import * as scriptletsList from './scriptlets-list';

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
 * @property {string} [domainName] domain name where scriptlet is applied; for debugging purposes
 */

/**
 * Returns scriptlet code by param
 * @param {Source} source
 * @returns {string} scriptlet code
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
 * Method creates string for file with scriptlets functions,
 * where dependencies are placed inside scriptlet functions
 */
const getScriptletFunctionString = () => {
    function wrapInFunc(name, code) {
        return `function ${name}(source, args){\n${code}\n}`;
    }

    const scriptletsFunctions = Object.values(scriptletsList);

    const scriptletsStrings = scriptletsFunctions.map((scriptlet) => {
        const scriptletWithDeps = attachDependencies(scriptlet);
        const scriptletWithCall = addCall(scriptlet, scriptletWithDeps);
        return wrapInFunc(scriptlet.name, scriptletWithCall);
    });

    const scriptletsString = scriptletsStrings.join('\n');

    const scriptletsMapString = `const scriptletsMap = {\n${scriptletsFunctions.map((scriptlet) => {
        return scriptlet.names.map((name) => {
            return `'${name}': ${scriptlet.name}`;
        }).join(',\n');
    }).join(',\n')}\n}`;

    const exportString = `var getScriptletFunction = (name) => {
        return scriptletsMap[name];
    };
    module.exports = { getScriptletFunction };
    `;

    return `${scriptletsString}\n${scriptletsMapString}\n${exportString}`;
};

/**
 * Scriptlets variable
 *
 * @returns {Object} object with methods:
 * `invoke` method receives one argument with `Source` type
 * `validate` method receives one argument with `String` type
 */
const scriptletsObject = (() => ({
    invoke: getScriptletCode,
    getScriptletFunctionString,
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
