
/**
 * AdGuard Scriptlets
 * Version 1.1.3
 */

Object.defineProperty(exports, '__esModule', { value: true });

var converter = require('./converter-fba7d5c1.js');

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
  var scriptlets = Object.keys(converter.scriptletsList).map(function (key) {
    return converter.scriptletsList[key];
  });
  return scriptlets.find(function (s) {
    return s.names && s.names.indexOf(name) > -1;
  });
}
/**
 * Checks if the scriptlet name is valid
 * @param {string} name - Scriptlet name
 */


function isValidScriptletName(name) {
  if (!name) {
    return false;
  }

  var scriptlet = getScriptletByName(name);

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

  var scriptlet = getScriptletByName(source.name);
  var result = converter.attachDependencies(scriptlet);
  result = converter.addCall(scriptlet, result);
  result = source.engine === 'corelibs' ? converter.wrapInNonameFunc(result) : converter.passSourceAndProps(source, result);
  return result;
}
/**
 * Validates any scriptlet rule
 * @param {string} input - can be Adguard or Ubo or Abp scriptlet rule
 */


function isValidScriptletRule(input) {
  if (!input) {
    return false;
  } // ABP 'input' rule may contain more than one snippet


  var rulesArray = converter.convertScriptletToAdg(input); // checking if each of parsed scriptlets is valid
  // if at least one of them is not valid - whole 'input' rule is not valid too

  var isValid = rulesArray.reduce(function (acc, rule) {
    var parsedRule = converter.parseRule(rule);
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

var scriptlets = {
  invoke: getScriptletCode,
  validateName: isValidScriptletName,
  validateRule: isValidScriptletRule,
  isAdgScriptletRule: converter.isAdgScriptletRule,
  isUboScriptletRule: converter.isUboScriptletRule,
  isAbpSnippetRule: converter.isAbpSnippetRule,
  convertUboToAdg: converter.convertUboScriptletToAdg,
  convertAbpToAdg: converter.convertAbpSnippetToAdg,
  convertScriptletToAdg: converter.convertScriptletToAdg,
  convertAdgToUbo: converter.convertAdgScriptletToUbo
};

exports.default = scriptlets;
exports.isValidScriptletRule = isValidScriptletRule;

/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
//# sourceMappingURL=ScriptletsCjs.js.map
