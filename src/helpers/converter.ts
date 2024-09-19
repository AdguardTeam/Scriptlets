import {
    AnyRule,
    CosmeticRuleType,
    NetworkRule,
    QuoteUtils,
    RuleCategory,
    RuleConverter,
    ScriptletInjectionRule,
    GenericPlatform,
    redirectsCompatibilityTable,
} from '@adguard/agtree';

import validator from './validator';
import { getRuleNode, getRuleText } from './rule-helpers';

/**
 * Helper type to get methods of RuleConverter that are not excluded
 *
 * @template ExcludedMethods Methods to exclude
 */
type FilteredConversionMethods<ExcludedMethods extends keyof typeof RuleConverter = never> = {
    [K in keyof typeof RuleConverter]: typeof RuleConverter[K] extends (...args: any[]) => any ? K : never
}[Exclude<keyof typeof RuleConverter, ExcludedMethods>];

/**
 * Conversion method type
 */
type ConversionMethod = (typeof RuleConverter)[FilteredConversionMethods<'convertToAbp'>];

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
 * Helper function to convert a scriptlet rule to a specific syntax
 *
 * @param rule Scriptlet rule
 * @param method Method to convert the rule
 *
 * @throws If the rule is in string format and cannot be parsed
 */
const convertScriptletTo = (
    rule: string | ScriptletInjectionRule,
    method: ConversionMethod,
): string[] => {
    const ruleNode = getRuleNode(rule);

    if (
        ruleNode.category !== RuleCategory.Cosmetic
        || ruleNode.type !== CosmeticRuleType.ScriptletInjectionRule
    ) {
        return [getRuleText(ruleNode)];
    }

    const conversionResult = method(ruleNode);

    if (!conversionResult.isConverted) {
        return [getRuleText(ruleNode)];
    }

    return conversionResult.result.map(getRuleText);
};

/**
 * Converts string of UBO scriptlet rule to AdGuard scriptlet rule
 *
 * @param rule UBO scriptlet rule
 * @returns array with one AdGuard scriptlet rule
 *
 * @deprecated
 */
export const convertUboScriptletToAdg = (rule: string | ScriptletInjectionRule): string[] => {
    return convertScriptletTo(rule, RuleConverter.convertToAdg);
};

/**
 * Convert string of ABP snippet rule to AdGuard scriptlet rule
 *
 * @param rule ABP snippet rule
 * @returns array of AdGuard scriptlet rules, one or few items depends on Abp-rule
 */
export const convertAbpSnippetToAdg = (rule: string | ScriptletInjectionRule): string[] => {
    return convertScriptletTo(rule, RuleConverter.convertToAdg);
};

/**
 * Converts any scriptlet rule into AdGuard syntax rule.
 * Comments and non-scriptlet rules are returned without changes.
 *
 * @param rule Rule.
 *
 * @returns Array of AdGuard scriptlet rules: one array item for ADG and UBO or few items for ABP.
 * For the ADG `rule` validates its syntax, and returns an empty array if it is invalid.
 */
export const convertScriptletToAdg = (rule: string | ScriptletInjectionRule): string[] => {
    try {
        return convertScriptletTo(rule, RuleConverter.convertToAdg);
    } catch (e) {
        return [];
    }
};

/**
 * Converts AdGuard scriptlet rule to UBO syntax.
 *
 * @param rule AdGuard scriptlet rule
 * @returns UBO scriptlet rule
 * or undefined if `rule` is not valid AdGuard scriptlet rule.
 */
export const convertAdgScriptletToUbo = (rule: string | ScriptletInjectionRule): string | undefined => {
    try {
        return convertScriptletTo(rule, RuleConverter.convertToUbo)[0];
    } catch (e) {
        return undefined;
    }
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

        return validator.isValidScriptletName(unquotedName);
    });

    return isValid;
};

/**
 * Converts Ubo redirect rule to Adg one
 *
 * @param rule ubo redirect rule
 * @returns  converted adg rule
 */
export const convertUboRedirectToAdg = (rule: string | NetworkRule): string => {
    return RuleConverter.convertToAdg(getRuleNode(rule)).result.map(getRuleText)[0];
};

/**
 * Converts Abp redirect rule to Adg one
 *
 * @param rule abp redirect rule
 * @returns converted adg rule
 */
export const convertAbpRedirectToAdg = (rule: string): string => {
    const node = getRuleNode(rule);

    if (node.category !== RuleCategory.Network) {
        return rule;
    }

    const conversionResult = RuleConverter.convertToAdg(node);

    return getRuleText(conversionResult.result[0]);
};

/**
 * Converts redirect rule to AdGuard one
 *
 * @param {string} rule redirect rule
 * @returns converted adg rule
 */
export const convertRedirectToAdg = (rule: string): string | undefined => {
    const node = getRuleNode(rule);

    if (node.category !== RuleCategory.Network) {
        return;
    }

    // convert to ADG
    const conversionResult = RuleConverter.convertToAdg(node);

    // eslint-disable-next-line consistent-return
    return getRuleText(conversionResult.result[0]);
};

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
export const convertAdgRedirectToUbo = (rule: string): string => {
    const node = getRuleNode(rule);

    if (node.category !== RuleCategory.Network) {
        throw new Error('Rule is not a network rule');
    }

    // convert to UBO
    const conversionResult = RuleConverter.convertToUbo(node);

    return getRuleText(conversionResult.result[0]);
};

/**
 * Converts a redirect name to ADG compatible one, if possible
 *
 * @param name Redirect name to convert
 * @returns Converted ADG compatible redirect name or `undefined` if the redirect isn't supported
 */
export const convertRedirectNameToAdg = (name: string): string | undefined => {
    return redirectsCompatibilityTable.getFirst(
        name,
        GenericPlatform.AdgAny,
    )?.name;
};
