/* eslint-disable no-eval */
import { hit, logMessage } from '../helpers';

/**
 * @scriptlet log-eval
 *
 * @description
 * Logs all `eval()` or `new Function()` calls to the console.
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('log-eval')
 * ```
 *
 * @added v1.0.4.
 */
export function logEval(source) {
    // wrap eval function
    const nativeEval = window.eval;
    function evalWrapper(str) {
        hit(source);
        logMessage(source, `eval("${str}")`, true);
        return nativeEval(str);
    }
    window.eval = evalWrapper;

    // wrap new Function
    const nativeFunction = window.Function;

    function FunctionWrapper(...args) {
        hit(source);
        logMessage(source, `new Function(${args.join(', ')})`, true);
        return nativeFunction.apply(this, [...args]);
    }

    FunctionWrapper.prototype = Object.create(nativeFunction.prototype);
    FunctionWrapper.prototype.constructor = FunctionWrapper;

    window.Function = FunctionWrapper;
}

export const logEvalNames = [
    'log-eval',
];

// eslint-disable-next-line prefer-destructuring
logEval.primaryName = logEvalNames[0];

logEval.injections = [hit, logMessage];
