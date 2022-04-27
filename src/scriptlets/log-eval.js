/* eslint-disable no-console, no-eval */
import { hit } from '../helpers/index';

/**
 * @scriptlet log-eval
 *
 * @description
 * Logs all `eval()` or `new Function()` calls to the console.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('log-eval')
 * ```
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
    'log-eval',
];

logEval.injections = [hit];
