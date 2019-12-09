/* eslint-disable no-eval, no-extra-bind, func-names */

import { toRegExp, hit } from '../helpers';

/**
 * @scriptlet prevent-eval-if
 *
 * @description
 * Prevents page to use eval matching payload.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-
 *
 * **Parameters**
 * - `search` string or regexp matching stringified eval payload
 *
 * **Examples**
 * ```
 * !
 * ```
 *
 * @param {string|RegExp} [search] string or regexp matching stringified eval payload
 */
export function preventEvalIf(source, search) {
    search = search ? toRegExp(search) : toRegExp('/.?/');

    const nativeEval = window.eval;
    window.eval = function (payload) {
        if (!search.test(payload.toString())) {
            return nativeEval.call(window, payload);
        }
        hit(source, payload);
        return undefined;
    }.bind(window);
}

preventEvalIf.names = [
    'prevent-eval-if',
    'noeval-if.js',
    'ubo-noeval-if.js',
];

preventEvalIf.injections = [toRegExp, hit];
