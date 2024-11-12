"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var posthtml_match_helper_1 = __importDefault(require("posthtml-match-helper"));
var insertNode_1 = require("./insertNode");
function insertAt(options) {
    return function plugin(tree) {
        var opts = Array.isArray(options) ? options : [options];
        opts.forEach(function (option) {
            var matcher = posthtml_match_helper_1["default"](option.selector);
            var behavior = option.behavior || 'inside';
            if (behavior === 'inside') {
                tree.match(matcher, function (node) {
                    return insertNode_1.insertNode({ node: node, option: option, content: [node.content] });
                });
            }
            else {
                var siblingNode_1 = {};
                tree.match(matcher, function (node) {
                    siblingNode_1 = node;
                    return node;
                });
                var matchingNode_1 = siblingNode_1;
                tree.match({ content: [matcher] }, function (node) {
                    return insertNode_1.insertNode({ node: node, option: option, content: [matchingNode_1] });
                });
            }
        });
    };
}
exports.insertAt = insertAt;
