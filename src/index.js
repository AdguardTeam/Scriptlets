import { getScriptletCode } from './injector';

/**
 * @typedef {Object} Source
 * @property {string} name Scriptlet name
 * @property {Array<string>} args Arguments for scriptlet function
 * @property {'extension'|'corelibs'} engine Defines the final form of scriptlet string presentation
 * @property {string} [version]
 * @property {Function} [hit] Will be executed when target action is triggered
 */

/**
 * Global scriptlet variable
 *
 * @returns {Object} object with method `invoke`
 * `invoke` method recieves one argument with `Source` type
 */
scriptlets = (() => ({ invoke: getScriptletCode }))(); // eslint-disable-line no-undef
