import { getScriptletFunction } from "../tmp/scriptlets-func.mjs";

import { wrapInNonameFunc, passSourceAndProps } from "../helpers/injector.mjs";

function getScriptletCode(source) {
    var scriptletFunction = getScriptletFunction(source.name);
    if (typeof scriptletFunction !== "function") {
        throw new Error(`Error: cannot invoke scriptlet with name: '${source.name}'`);
    }
    var scriptletFunctionString = scriptletFunction.toString();
    var result = source.engine === "corelibs" || source.engine === "test" ? wrapInNonameFunc(scriptletFunctionString) : passSourceAndProps(source, scriptletFunctionString);
    return result;
}

var scriptlets = {
    invoke: getScriptletCode,
    getScriptletFunction: getScriptletFunction
};

export { scriptlets };
