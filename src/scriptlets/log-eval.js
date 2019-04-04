/* eslint-disable no-new-func, no-console, no-eval */

/**
 * Logs all eval() and Function() calls
 *
 * @param {Source} source
 */
// TODO add tests, and description
export function logEval(source) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    const log = console.log.bind(console);

    // wrap eval function
    const nativeEval = window.eval;
    function evalWrapper(str) {
        hit();
        log(`eval("${str}"`);
        return nativeEval(str);
    }
    window.eval = evalWrapper;

    // TODO wrap Function()
}

logEval.names = [
    'log-eval',
];
