import {
    AdblockSyntax,
    AnyRule,
    CosmeticRuleType,
    GenericPlatform,
    modifiersCompatibilityTable,
    NetworkRuleType,
    QuoteUtils,
    redirectsCompatibilityTable,
    RuleCategory,
    RuleConverter,
    ScriptletInjectionRule,
    type SpecificPlatform,
} from '@adguard/agtree';

// FIXME try to get rid of this by moving names of the scriptlets separately from the scriptlets
import * as scriptletsNamesList from '../scriptlets/scriptlets-names-list';
import { getRuleNode } from '../helpers/rule-helpers';
import { Scriptlet } from '../../types/types';

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
export const isAdgScriptletRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Adg);

/**
 * Checks if the `rule` is uBO scriptlet rule
 *
 * @param rule rule text
 * @returns true if given rule is ubo rule
 */
export const isUboScriptletRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Ubo);

/**
 * Checks if the `rule` is AdBlock Plus snippet
 *
 * @param rule rule text
 * @returns true if given rule is abp rule
 */
export const isAbpSnippetRule = (rule: string): boolean => isScriptletRuleForSyntax(rule, AdblockSyntax.Abp);

// we use it for avoiding redundant search
let scriptletsNamesContainer: Set<string>;
/**
 * Returns array of scriptlet objects.
 * Needed for scriptlet name validation which will check aliases names.
 *
 * @returns Array of all scriptlet objects.
 */
const getScriptletsNames = (): Set<string> => {
    if (scriptletsNamesContainer) {
        return scriptletsNamesContainer;
    }

    scriptletsNamesContainer = new Set<string>();

    const names = Object.values(scriptletsNamesList).flat();

    scriptletsNamesContainer = new Set<string>(names);

    return scriptletsNamesContainer;
};

/**
 * Finds scriptlet by the `name`.
 *
 * @param name Scriptlet name.
 */
const hasScriptlet = (
    name: string,
): boolean => {
    const scriptletsNames = getScriptletsNames();
    return scriptletsNames.has(name)
        || (!name.endsWith(UBO_JS_SUFFIX) && scriptletsNames.has(`${name}${UBO_JS_SUFFIX}`));
};

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
    return hasScriptlet(name);
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
export const isValidScriptletName = (name: string | null): boolean => {
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

/**
 * Checks if an array of rules is an array of scriptlet rules
 *
 * @param rules Array of rules
 * @returns True if all rules are scriptlet rules
 */
const isArrayOfScriptletRules = (rules: AnyRule[]): rules is ScriptletInjectionRule[] => {
    return rules.every(
        (rule) => {
            return rule.category === RuleCategory.Cosmetic && rule.type === CosmeticRuleType.ScriptletInjectionRule;
        },
    );
};

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
export const isValidScriptletRule = (rule: string | ScriptletInjectionRule): boolean => {
    let ruleNodes: AnyRule[];

    try {
        ruleNodes = RuleConverter.convertToAdg(getRuleNode(rule)).result;
    } catch (e) {
        return false;
    }

    if (!isArrayOfScriptletRules(ruleNodes)) {
        return false;
    }

    // checking if each of parsed scriptlets is valid
    // if at least one of them is not valid - whole `ruleText` is not valid too
    const isValid = ruleNodes.every((ruleNode) => {
        const name = ruleNode.body.children[0]?.children[0]?.value;

        if (!name) {
            return ruleNode.exception;
        }

        const unquotedName = QuoteUtils.removeQuotes(name);

        if (!unquotedName) {
            return false;
        }

        return isValidScriptletName(unquotedName);
    });

    return isValid;
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
