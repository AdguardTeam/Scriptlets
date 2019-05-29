/* eslint-disable no-console, no-eval */
import { hit } from '../helpers';

/**
 * Logs all eval() and Function() calls
 *
 * @param {Source} source
 */
export function logEval(source) {
    const log = console.log.bind(console);
    // wrap eval function
    const nativeEval = window.eval;
    function evalWrapper(str) {
        hit(source);
        log(`eval("${str}")`);
        return nativeEval(str);
    }
    window.eval = evalWrapper;

    // wrap new Function
    const nativeFunction = window.Function;

    function FunctionWrapper(...args) {
        hit(source);
        log(`new Function(${args.join(', ')})`);
        return nativeFunction.apply(this, [...args]);
    }

    FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
    FunctionWrapper.prototype.constructor = FunctionWrapper;

    window.Function = FunctionWrapper;
}

logEval.names = [
    'hit-eval',
];

logEval.injections = [hit];
