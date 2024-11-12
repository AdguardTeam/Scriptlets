"use strict";

var scriptletsFunc = require("../tmp/scriptlets-func.js");

var injector = require("../helpers/injector.js");

function getScriptletCode(source) {
    var scriptletFunction = scriptletsFunc.getScriptletFunction(source.name);
    if (typeof scriptletFunction !== "function") {
        throw new Error(`Error: cannot invoke scriptlet with name: '${source.name}'`);
    }
    var scriptletFunctionString = scriptletFunction.toString();
    var result = source.engine === "corelibs" || source.engine === "test" ? injector.wrapInNonameFunc(scriptletFunctionString) : injector.passSourceAndProps(source, scriptletFunctionString);
    return result;
}

var scriptlets = {
    invoke: getScriptletCode,
    getScriptletFunction: scriptletsFunc.getScriptletFunction
};

exports.scriptlets = scriptlets;
