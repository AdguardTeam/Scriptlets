import { ScriptletInjectionRule } from '@adguard/agtree';

/**
 * Converts string of UBO scriptlet rule to AdGuard scriptlet rule
 *
 * @param rule UBO scriptlet rule
 * @returns array with one AdGuard scriptlet rule
 *
 * @deprecated
 */
declare const convertUboScriptletToAdg: (rule: string | ScriptletInjectionRule) => string[];
/**
 * Convert string of ABP snippet rule to AdGuard scriptlet rule
 *
 * @param rule ABP snippet rule
 * @returns array of AdGuard scriptlet rules, one or few items depends on Abp-rule
 */
declare const convertAbpSnippetToAdg: (rule: string | ScriptletInjectionRule) => string[];
/**
 * Converts any scriptlet rule into AdGuard syntax rule.
 * Comments and non-scriptlet rules are returned without changes.
 *
 * @param rule Rule.
 *
 * @returns Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
 * For the ADG `rule` validates its syntax, and returns an empty array if it is invalid.
 */
declare const convertScriptletToAdg: (rule: string | ScriptletInjectionRule) => string[];
/**
 * Converts AdGuard scriptlet rule to UBO syntax.
 *
 * @param rule AdGuard scriptlet rule
 * @returns UBO scriptlet rule
 * or undefined if `rule` is not valid AdGuard scriptlet rule.
 */
declare const convertAdgScriptletToUbo: (rule: string | ScriptletInjectionRule) => string | undefined;
/**
 * Converts Adg redirect rule to Ubo one
 * 1. Checks if there is Ubo analog for Adg rule
 * 2. Parses the rule and checks if there are any source type modifiers which are required by Ubo
 *    and if there are no one we add it manually to the end.
 *    Source types are chosen according to redirect name
 *    e.g. ||ad.com^$redirect=<name>,important  ->>  ||ad.com^$redirect=<name>,important,script
 * 3. Replaces Adg redirect name by Ubo analog
 *
 * Note: if adg redirect uses UBO's priority syntax, it will be lost on conversion, e.g:
 * ||example.com$redirect=noopjs:99 => ||example.com$redirect=noop.js
 *
 * @param rule adg rule
 * @returns converted ubo rule
 * @throws on incompatible rule
 */
declare const convertAdgRedirectToUbo: (rule: string) => string;

export { convertAbpSnippetToAdg, convertAdgRedirectToUbo, convertAdgScriptletToUbo, convertScriptletToAdg, convertUboScriptletToAdg };
