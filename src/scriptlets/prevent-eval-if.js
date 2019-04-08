/* eslint-disable no-new-func, no-eval, no-extra-bind, func-names */

import { toRegExp } from '../helpers';

/**
 * Prevents page to use eval matching payload
 * @param {Source} source
 * @param {string|RegExp} [search] string or regexp matching stringified eval payload
 */
export function preventEvalIf(source, search) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    search = search ? toRegExp(search) : toRegExp('/.?/');

    const nativeEval = window.eval;
    window.eval = function (payload) {
        if (!search.test(payload.toString())) {
            return nativeEval.call(window, payload);
        }
        hit();
        return undefined;
    }.bind(window);
}

preventEvalIf.names = [
    'noeval-if.js',
    'prevent-eval-if',
];

preventEvalIf.injections = [toRegExp];
