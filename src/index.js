import { getScriptletCode } from './injector';

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
 * Global scriptlet variable
 *
 * @returns {Object} object with method `invoke`
 * `invoke` method receives one argument with `Source` type
 */
scriptlets = (() => ({ invoke: getScriptletCode }))(); // eslint-disable-line no-undef
