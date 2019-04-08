/* eslint-disable no-new-func, no-eval, no-extra-bind, no-console, func-names */

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    window.eval = function (s) {
        hit();
        console.log(`AG: Document tried to eval... \n${s}`);
    }.bind(window);
}

noeval.names = [
    'noeval.js',
    'silent-noeval.js',
    'noeval',
];
