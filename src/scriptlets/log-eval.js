/* eslint-disable no-console, no-eval */
import { createLogFunction } from '../helpers';

/**
 * Logs all eval() and Function() calls
 *
 * @param {Source} source
 */
export function logEval(source) {
    const log = createLogFunction(source);

    const nativeConsole = console.log.bind(console);

    // wrap eval function
    const nativeEval = window.eval;
    function evalWrapper(str) {
        log();
        nativeConsole(`eval("${str}")`);
        return nativeEval(str);
    }
    window.eval = evalWrapper;

    // wrap new Function
    const nativeFunction = window.Function;

    function FunctionWrapper(...args) {
        log();
        nativeConsole(`new Function(${args.join(', ')})`);
        return nativeFunction.apply(this, [...args]);
    }

    FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
    FunctionWrapper.prototype.constructor = FunctionWrapper;

    window.Function = FunctionWrapper;
}

logEval.names = [
    'log-eval',
];

logEval.injections = [createLogFunction];
