import { ScriptletInjectionRule } from '@adguard/agtree';

/**
 * Checks if the `rule` is AdGuard scriptlet rule
 *
 * @param rule - rule text
 * @returns true if given rule is adg rule
 */
declare const isAdgScriptletRule: (rule: string) => boolean;
/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param rule rule text
 * @returns true if given rule is ubo rule
 */
declare const isUboScriptletRule: (rule: string) => boolean;
/**
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param rule rule text
 * @returns true if given rule is abp rule
 */
declare const isAbpSnippetRule: (rule: string) => boolean;
/**
 * Checks whether the `name` is valid scriptlet name.
 * Uses cache for better performance.
 *
 * @param name Scriptlet name.
 * @returns True if scriptlet name is a valid one or an empty string,
 * otherwise false.
 */
declare const isValidScriptletName: (name: string | null) => boolean;
/**
 * 1. For ADG scriptlet checks whether the scriptlet syntax and name are valid.
 * 2. For UBO and ABP scriptlet first checks their compatibility with ADG
 * by converting them into ADG syntax, and after that checks the name.
 *
 * ADG or UBO rules are "single-scriptlet", but ABP rule may contain more than one snippet
 * so if at least one of them is not valid — whole `ruleText` rule is not valid too.
 *
 * @param rule Any scriptlet rule — ADG or UBO or ABP.
 *
 * @returns True if scriptlet name is valid in rule.
 */
declare const isValidScriptletRule: (rule: string | ScriptletInjectionRule) => boolean;
/**
 * Checks if the specified redirect resource is compatible with AdGuard
 *
 * @param redirectName - Redirect resource name to check
 * @returns - true if the redirect resource is compatible with AdGuard
 */
declare const isRedirectResourceCompatibleWithAdg: (redirectName: string) => boolean;
/**
 * Checks if the `rule` is **valid** AdGuard redirect resource rule
 *
 * @param rule - rule text
 * @returns true if given rule is valid adg redirect
 */
declare const isValidAdgRedirectRule: (rule: string) => boolean;

export { isAbpSnippetRule, isAdgScriptletRule, isRedirectResourceCompatibleWithAdg, isUboScriptletRule, isValidAdgRedirectRule, isValidScriptletName, isValidScriptletRule };
