"use strict";

function passSourceAndProps(source, code) {
    var redirect = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var sourceString = JSON.stringify(source);
    var argsString = source.args ? `[${source.args.map((function(arg) {
        return JSON.stringify(arg);
    }))}]` : undefined;
    var params = argsString ? `${sourceString}, ${argsString}` : sourceString;
    if (redirect) {
        return `(function(source, args){\n${code}\n})(${params});`;
    }
    return `(${code})(${params});`;
}

function wrapInNonameFunc(code) {
    return `function(source, args){\n${code}\n}`;
}

exports.passSourceAndProps = passSourceAndProps;

exports.wrapInNonameFunc = wrapInNonameFunc;
