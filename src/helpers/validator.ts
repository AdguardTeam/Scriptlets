import {
    AdblockSyntax,
    CosmeticRuleType,
    GenericPlatform,
    modifiersCompatibilityTable,
    NetworkRuleType,
    redirectsCompatibilityTable,
    RuleCategory,
    SpecificPlatform,
} from '@adguard/agtree';
import * as scriptletListRaw from '../scriptlets/scriptlets-list';
import { getRuleNode } from './rule-helpers';

/* ************************************************************************
 *
 * Scriptlets
 *
 ************************************************************************** */

const UBO_JS_SUFFIX = '.js';

/**
 * Helper function to determine if the rule is a scriptlet rule for the specified syntax
 *
 * @param rule - rule text
 * @param syntax - syntax of the rule
 * @returns true if given rule is scriptlet rule for the specified syntax
 */
const isScriptletRuleForSyntax = (rule: string, syntax: AdblockSyntax): boolean => {
    try {
        const ruleNode = getRuleNode(rule);

        return ruleNode.category === RuleCategory.Cosmetic
            && ruleNode.type === CosmeticRuleType.ScriptletInjectionRule
            && ruleNode.syntax === syntax;
    } catch (e) {
        return false;
    }
};

/**
 * Checks if the `rule` is AdGuard scriptlet rule
 *
 * @param rule - rule text
 * @returns true if given rule is adg rule
 */
const isAdgScriptletRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Adg);

/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param rule rule text
 * @returns true if given rule is ubo rule
 */
const isUboScriptletRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Ubo);

/**
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param rule rule text
 * @returns true if given rule is abp rule
 */
const isAbpSnippetRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Abp);

/**
 * Returns array of scriptlet objects.
 * Needed for scriptlet name validation which will check aliases names.
 *
 * @returns Array of all scriptlet objects.
 */
const getScriptletsObjList = () => {
    return Object.values(scriptletListRaw);
};

/**
 * Finds scriptlet by the `name`.
 *
 * @param name Scriptlet name.
 * @param scriptlets Array of all scriptlet objects.
 * @returns {Function} Scriptlet function.
 */
const getScriptletByName = (name: string, scriptlets: Scriptlet[]): Scriptlet | undefined => {
    const allScriptletsFns = scriptlets || getScriptletsObjList();

    return allScriptletsFns.find((s) => {
        return s.names
            // full match name checking
            && (s.names.includes(name)
                // or check ubo alias name without '.js' at the end
                || (!name.endsWith(UBO_JS_SUFFIX) && s.names.includes(`${name}${UBO_JS_SUFFIX}`))
            );
    });
};

const scriptletObjects = getScriptletsObjList();

/**
 * Checks whether the scriptlet `name` is valid by checking the scriptlet list object.
 *
 * @param name Scriptlet name.
 * @returns True if scriptlet name is valid.
 */
const isValidScriptletNameNotCached = (name: string): boolean => {
    if (!name) {
        return false;
    }
    return !!getScriptletByName(name, scriptletObjects);
};

/**
 * Cache for better performance of scriptlet name validation.
 */
const scriptletNameValidationCache = new Map();

/**
 * Checks whether the `name` is valid scriptlet name.
 * Uses cache for better performance.
 *
 * @param name Scriptlet name.
 * @returns True if scriptlet name is a valid one or an empty string,
 * otherwise false.
 */
const isValidScriptletName = (name: string | null): boolean => {
    // empty name is used for allowlist scriptlets. e.g.
    // - '#@%#//scriptlet()'
    if (name === '') {
        return true;
    }
    if (!name) {
        return false;
    }
    // if there is no cached validation value
    if (!scriptletNameValidationCache.has(name)) {
        // we should calculate it first
        const isValid = isValidScriptletNameNotCached(name);
        // and save it to the cache then
        scriptletNameValidationCache.set(name, isValid);
        return isValid;
    }
    // otherwise return cached validation result
    return scriptletNameValidationCache.get(name);
};

/* ************************************************************************
 *
 * Redirects
 *
 ************************************************************************** */

/**
 * Redirect resource object, used for extracting redirect resources from the rule.
 */
type RedirectResource = {
    /**
     * Redirect modifier name, see {@link POSSIBLE_REDIRECT_MODIFIERS}.
     */
    modifier: string;

    /**
     * Redirect resource name. It can be empty for exception rules.
     */
    resource?: string;

    /**
     * Flag indicating that the rule is an exception rule.
     */
    exceptionRule: boolean;
};

/**
 * List of modifiers that can be used for redirects.
 */
const POSSIBLE_REDIRECT_MODIFIERS = new Set<string>([
    'redirect',
    'redirect-rule',
    'rewrite',
]);

/**
 * Extracts redirect resources from the `rule`.
 *
 * @param rule Rule text
 * @returns Array of redirect resources
 */
const getRedirectResourcesFromRule = (rule: string): RedirectResource[] => {
    const result: RedirectResource[] = [];

    try {
        const ruleNode = getRuleNode(rule);

        if (ruleNode.category !== RuleCategory.Network) {
            return result;
        }

        if (ruleNode.type !== NetworkRuleType.NetworkRule) {
            return result;
        }

        const ruleModifiers = ruleNode.modifiers;

        if (!ruleModifiers) {
            return result;
        }

        for (const el of ruleModifiers.children) {
            // Ignore exception modifiers
            if (el.exception) {
                continue;
            }

            if (POSSIBLE_REDIRECT_MODIFIERS.has(el.name.value)) {
                result.push({
                    modifier: el.name.value,
                    resource: el.value?.value,
                    exceptionRule: ruleNode.exception,
                });
            }
        }

        return result;
    } catch (e) {
        return result;
    }
};

/**
 * Checks if the `rule` is AdGuard redirect rule.
 * Discards comments and JS rules and checks if the `rule` has 'redirect' modifier.
 *
 * @param rule - rule text
 * @returns true if given rule is adg redirect
 */
const isAdgRedirectRule = (rule: string): boolean => {
    const resources = getRedirectResourcesFromRule(rule);

    if (!resources.length || resources.length > 1) {
        return false;
    }

    const [resource] = resources;

    return modifiersCompatibilityTable.exists(resource.modifier, GenericPlatform.AdgAny);
};

/**
 * Checks if the specified redirect resource is compatible with AdGuard
 *
 * @param redirectName - Redirect resource name to check
 * @returns - true if the redirect resource is compatible with AdGuard
 */
export const isRedirectResourceCompatibleWithAdg = (redirectName: string): boolean => {
    return redirectsCompatibilityTable.exists(redirectName, GenericPlatform.AdgAny);
};

/**
 * Checks if the `rule` is **valid** AdGuard redirect resource rule
 *
 * @param rule - rule text
 * @returns true if given rule is valid adg redirect
 */
const isValidAdgRedirectRule = (rule: string): boolean => {
    const resources = getRedirectResourcesFromRule(rule);

    if (!resources.length || resources.length > 1) {
        return false;
    }

    const [resource] = resources;

    if (!resource.resource) {
        return resource.exceptionRule;
    }

    return (
        modifiersCompatibilityTable.exists(resource.modifier, GenericPlatform.AdgAny)
        && isRedirectResourceCompatibleWithAdg(resource.resource)
    );
};

/**
 * Checks if the redirect resource from the `rule` is compatible with the specified platform (`from`)
 * and has a compatible pair for the target platform (`to`)
 *
 * @param rule - rule text
 * @param from - platform to convert from
 * @param to - platform to convert to
 * @returns true if the rule is compatible with the specified platform
 */
const checkCompatibility = (
    rule: string,
    from: SpecificPlatform | GenericPlatform,
    to: SpecificPlatform | GenericPlatform,
): boolean => {
    const resources = getRedirectResourcesFromRule(rule);

    if (!resources.length || resources.length > 1) {
        return false;
    }

    const [resource] = resources;

    if (!resource.resource) {
        return resource.exceptionRule;
    }

    // Redirect should exist for the source platform
    if (!redirectsCompatibilityTable.exists(resource.resource, from)) {
        return false;
    }

    // Redirect should have a compatible pair for the target platform (maybe in a different name)
    return !!redirectsCompatibilityTable.getFirst(resource.resource, to);
};

/**
 * Checks if the AdGuard redirect `rule` has Ubo analog. Needed for Adg->Ubo conversion
 *
 * @param rule - AdGuard rule text
 * @returns - true if the rule can be converted to Ubo
 */
const isAdgRedirectCompatibleWithUbo = (rule: string): boolean => {
    return checkCompatibility(rule, GenericPlatform.AdgAny, GenericPlatform.UboAny);
};

/**
 * Checks if the Ubo redirect `rule` has AdGuard analog. Needed for Ubo->Adg conversion
 *
 * @param rule - Ubo rule text
 * @returns - true if the rule can be converted to AdGuard
 */
const isUboRedirectCompatibleWithAdg = (rule: string): boolean => {
    return checkCompatibility(rule, GenericPlatform.UboAny, GenericPlatform.AdgAny);
};

/**
 * Checks if the Abp redirect `rule` has AdGuard analog. Needed for Abp->Adg conversion
 *
 * @param rule - Abp rule text
 * @returns - true if the rule can be converted to AdGuard
 */
const isAbpRedirectCompatibleWithAdg = (rule: string): boolean => {
    return checkCompatibility(rule, GenericPlatform.AbpAny, GenericPlatform.AdgAny);
};

const validator = {
    isAdgScriptletRule,
    isUboScriptletRule,
    isAbpSnippetRule,
    getScriptletByName,
    isValidScriptletName,
    isAdgRedirectRule,
    isValidAdgRedirectRule,
    isRedirectResourceCompatibleWithAdg,
    isAdgRedirectCompatibleWithUbo,
    isUboRedirectCompatibleWithAdg,
    isAbpRedirectCompatibleWithAdg,
};

export default validator;
