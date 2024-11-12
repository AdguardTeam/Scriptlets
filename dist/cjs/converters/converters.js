"use strict";

var agtree = require("@adguard/agtree");

var converter = require("@adguard/agtree/converter");

var ruleHelpers = require("../helpers/rule-helpers.js");

var convertScriptletTo = function convertScriptletTo(rule, method) {
    var ruleNode = ruleHelpers.getRuleNode(rule);
    if (ruleNode.category !== agtree.RuleCategory.Cosmetic || ruleNode.type !== agtree.CosmeticRuleType.ScriptletInjectionRule) {
        return [ ruleHelpers.getRuleText(ruleNode) ];
    }
    var conversionResult = method(ruleNode);
    if (!conversionResult.isConverted) {
        return [ ruleHelpers.getRuleText(ruleNode) ];
    }
    return conversionResult.result.map(ruleHelpers.getRuleText);
};

var convertUboScriptletToAdg = function convertUboScriptletToAdg(rule) {
    return convertScriptletTo(rule, converter.RuleConverter.convertToAdg);
};

var convertAbpSnippetToAdg = function convertAbpSnippetToAdg(rule) {
    return convertScriptletTo(rule, converter.RuleConverter.convertToAdg);
};

var convertScriptletToAdg = function convertScriptletToAdg(rule) {
    try {
        return convertScriptletTo(rule, converter.RuleConverter.convertToAdg);
    } catch (e) {
        return [];
    }
};

var convertAdgScriptletToUbo = function convertAdgScriptletToUbo(rule) {
    try {
        return convertScriptletTo(rule, converter.RuleConverter.convertToUbo)[0];
    } catch (e) {
        return undefined;
    }
};

var convertAdgRedirectToUbo = function convertAdgRedirectToUbo(rule) {
    var node = ruleHelpers.getRuleNode(rule);
    if (node.category !== agtree.RuleCategory.Network) {
        throw new Error("Rule is not a network rule");
    }
    var conversionResult = converter.RuleConverter.convertToUbo(node);
    return ruleHelpers.getRuleText(conversionResult.result[0]);
};

exports.convertAbpSnippetToAdg = convertAbpSnippetToAdg;

exports.convertAdgRedirectToUbo = convertAdgRedirectToUbo;

exports.convertAdgScriptletToUbo = convertAdgScriptletToUbo;

exports.convertScriptletToAdg = convertScriptletToAdg;

exports.convertUboScriptletToAdg = convertUboScriptletToAdg;
