"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var posthtml_parser_1 = __importDefault(require("posthtml-parser"));
function insertNode(_a) {
    var node = _a.node, option = _a.option;
    var content = node.content || [];
    if (option.append) {
        content.push(posthtml_parser_1["default"](option.append));
    }
    if (option.prepend) {
        content.unshift(posthtml_parser_1["default"](option.prepend));
    }
    return __assign(__assign({}, node), { content: content });
}
exports.insertNode = insertNode;
