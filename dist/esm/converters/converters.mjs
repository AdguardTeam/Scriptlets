import { RuleCategory, CosmeticRuleType } from "@adguard/agtree";

import { RuleConverter } from "@adguard/agtree/converter";

import { getRuleNode, getRuleText } from "../helpers/rule-helpers.mjs";

var convertScriptletTo = function convertScriptletTo(rule, method) {
    var ruleNode = getRuleNode(rule);
    if (ruleNode.category !== RuleCategory.Cosmetic || ruleNode.type !== CosmeticRuleType.ScriptletInjectionRule) {
        return [ getRuleText(ruleNode) ];
    }
    var conversionResult = method(ruleNode);
    if (!conversionResult.isConverted) {
        return [ getRuleText(ruleNode) ];
    }
    return conversionResult.result.map(getRuleText);
};

var convertUboScriptletToAdg = function convertUboScriptletToAdg(rule) {
    return convertScriptletTo(rule, RuleConverter.convertToAdg);
};

var convertAbpSnippetToAdg = function convertAbpSnippetToAdg(rule) {
    return convertScriptletTo(rule, RuleConverter.convertToAdg);
};

var convertScriptletToAdg = function convertScriptletToAdg(rule) {
    try {
        return convertScriptletTo(rule, RuleConverter.convertToAdg);
    } catch (e) {
        return [];
    }
};

var convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
    try {
        return convertScriptletTo(rule, RuleConverter.convertToUbo)[0];
    } catch (e) {
        return undefined;
    }
};

var convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
    var node = getRuleNode(rule);
    if (node.category !== RuleCategory.Network) {
        throw new Error("Rule is not a network rule");
    }
    var conversionResult = RuleConverter.convertToUbo(node);
    return getRuleText(conversionResult.result[0]);
};

export { convertAbpSnippetToAdg, convertAdgRedirectToUbo, convertAdgScriptletToUbo, convertScriptletToAdg, convertUboScriptletToAdg };
