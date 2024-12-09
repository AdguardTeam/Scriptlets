import _defineProperty from "@babel/runtime/helpers/defineProperty";

import { RuleParser, defaultParserOptions } from "@adguard/agtree/parser";

import { RuleGenerator } from "@adguard/agtree/generator";

function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter((function(r) {
            return Object.getOwnPropertyDescriptor(e, r).enumerable;
        }))), t.push.apply(t, o);
    }
    return t;
}

function _objectSpread(e) {
    for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), !0).forEach((function(r) {
            _defineProperty(e, r, t[r]);
        })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach((function(r) {
            Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
        }));
    }
    return e;
}

var getRuleNode = function getRuleNode(rule) {
    return typeof rule === "string" ? RuleParser.parse(rule, _objectSpread(_objectSpread({}, defaultParserOptions), {}, {
        includeRaws: false,
        isLocIncluded: false
    })) : rule;
};

var getRuleText = function getRuleText(rule) {
    return typeof rule === "string" ? rule : RuleGenerator.generate(rule);
};

export { getRuleNode, getRuleText };
