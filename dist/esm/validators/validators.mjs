import { RuleConverter, QuoteUtils, redirectsCompatibilityTable, GenericPlatform, modifiersCompatibilityTable, RuleCategory, CosmeticRuleType, AdblockSyntax, NetworkRuleType } from "@adguard/agtree";

import * as scriptletsNamesList from "../scriptlets/scriptlets-names-list.mjs";

import { getRuleNode } from "../helpers/rule-helpers.mjs";

function _createForOfIteratorHelper(r, e) {
    var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (!t) {
        if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e) {
            t && (r = t);
            var _n = 0, F = function F() {};
            return {
                s: F,
                n: function n() {
                    return _n >= r.length ? {
                        done: !0
                    } : {
                        done: !1,
                        value: r[_n++]
                    };
                },
                e: function e(r) {
                    throw r;
                },
                f: F
            };
        }
        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    var o, a = !0, u = !1;
    return {
        s: function s() {
            t = t.call(r);
        },
        n: function n() {
            var r = t.next();
            return a = r.done, r;
        },
        e: function e(r) {
            u = !0, o = r;
        },
        f: function f() {
            try {
                a || null == t.return || t.return();
            } finally {
                if (u) throw o;
            }
        }
    };
}

function _unsupportedIterableToArray(r, a) {
    if (r) {
        if ("string" == typeof r) return _arrayLikeToArray(r, a);
        var t = {}.toString.call(r).slice(8, -1);
        return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
    }
}

function _arrayLikeToArray(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
}

var UBO_JS_SUFFIX = ".js";

var isScriptletRuleForSyntax = function isScriptletRuleForSyntax(rule, syntax) {
    try {
        var ruleNode = getRuleNode(rule);
        return ruleNode.category === RuleCategory.Cosmetic && ruleNode.type === CosmeticRuleType.ScriptletInjectionRule && ruleNode.syntax === syntax;
    } catch (e) {
        return false;
    }
};

var isAdgScriptletRule = function isAdgScriptletRule(rule) {
    return isScriptletRuleForSyntax(rule, AdblockSyntax.Adg);
};

var isUboScriptletRule = function isUboScriptletRule(rule) {
    return isScriptletRuleForSyntax(rule, AdblockSyntax.Ubo);
};

var isAbpSnippetRule = function isAbpSnippetRule(rule) {
    return isScriptletRuleForSyntax(rule, AdblockSyntax.Abp);
};

var scriptletsNamesContainer;

var getScriptletsNames = function getScriptletsNames() {
    if (scriptletsNamesContainer) {
        return scriptletsNamesContainer;
    }
    scriptletsNamesContainer = new Set;
    var names = Object.values(scriptletsNamesList).flat();
    scriptletsNamesContainer = new Set(names);
    return scriptletsNamesContainer;
};

var hasScriptlet = function hasScriptlet(name) {
    var scriptletsNames = getScriptletsNames();
    return scriptletsNames.has(name) || !name.endsWith(UBO_JS_SUFFIX) && scriptletsNames.has(`${name}${UBO_JS_SUFFIX}`);
};

var isValidScriptletNameNotCached = function isValidScriptletNameNotCached(name) {
    if (!name) {
        return false;
    }
    return hasScriptlet(name);
};

var scriptletNameValidationCache = new Map;

var isValidScriptletName = function isValidScriptletName(name) {
    if (name === "") {
        return true;
    }
    if (!name) {
        return false;
    }
    if (!scriptletNameValidationCache.has(name)) {
        var isValid = isValidScriptletNameNotCached(name);
        scriptletNameValidationCache.set(name, isValid);
        return isValid;
    }
    return scriptletNameValidationCache.get(name);
};

var isArrayOfScriptletRules = function isArrayOfScriptletRules(rules) {
    return rules.every((function(rule) {
        return rule.category === RuleCategory.Cosmetic && rule.type === CosmeticRuleType.ScriptletInjectionRule;
    }));
};

var isValidScriptletRule = function isValidScriptletRule(rule) {
    var ruleNodes;
    try {
        ruleNodes = RuleConverter.convertToAdg(getRuleNode(rule)).result;
    } catch (e) {
        return false;
    }
    if (!isArrayOfScriptletRules(ruleNodes)) {
        return false;
    }
    var isValid = ruleNodes.every((function(ruleNode) {
        var _ruleNode$body$childr;
        var name = (_ruleNode$body$childr = ruleNode.body.children[0]) === null || _ruleNode$body$childr === void 0 || (_ruleNode$body$childr = _ruleNode$body$childr.children[0]) === null || _ruleNode$body$childr === void 0 ? void 0 : _ruleNode$body$childr.value;
        if (!name) {
            return ruleNode.exception;
        }
        var unquotedName = QuoteUtils.removeQuotes(name);
        if (!unquotedName) {
            return false;
        }
        return isValidScriptletName(unquotedName);
    }));
    return isValid;
};

var POSSIBLE_REDIRECT_MODIFIERS = new Set([ "redirect", "redirect-rule", "rewrite" ]);

var getRedirectResourcesFromRule = function getRedirectResourcesFromRule(rule) {
    var result = [];
    try {
        var ruleNode = getRuleNode(rule);
        if (ruleNode.category !== RuleCategory.Network) {
            return result;
        }
        if (ruleNode.type !== NetworkRuleType.NetworkRule) {
            return result;
        }
        var ruleModifiers = ruleNode.modifiers;
        if (!ruleModifiers) {
            return result;
        }
        var _iterator = _createForOfIteratorHelper(ruleModifiers.children), _step;
        try {
            for (_iterator.s(); !(_step = _iterator.n()).done; ) {
                var el = _step.value;
                if (el.exception) {
                    continue;
                }
                if (POSSIBLE_REDIRECT_MODIFIERS.has(el.name.value)) {
                    var _el$value;
                    result.push({
                        modifier: el.name.value,
                        resource: (_el$value = el.value) === null || _el$value === void 0 ? void 0 : _el$value.value,
                        exceptionRule: ruleNode.exception
                    });
                }
            }
        } catch (err) {
            _iterator.e(err);
        } finally {
            _iterator.f();
        }
        return result;
    } catch (e) {
        return result;
    }
};

var isRedirectResourceCompatibleWithAdg = function isRedirectResourceCompatibleWithAdg(redirectName) {
    return redirectsCompatibilityTable.exists(redirectName, GenericPlatform.AdgAny);
};

var isValidAdgRedirectRule = function isValidAdgRedirectRule(rule) {
    var resources = getRedirectResourcesFromRule(rule);
    if (!resources.length || resources.length > 1) {
        return false;
    }
    var [resource] = resources;
    if (!resource.resource) {
        return resource.exceptionRule;
    }
    return modifiersCompatibilityTable.exists(resource.modifier, GenericPlatform.AdgAny) && isRedirectResourceCompatibleWithAdg(resource.resource);
};

export { isAbpSnippetRule, isAdgScriptletRule, isRedirectResourceCompatibleWithAdg, isUboScriptletRule, isValidAdgRedirectRule, isValidScriptletName, isValidScriptletRule };
