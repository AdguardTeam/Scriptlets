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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-eval-if'[, search])
 * ```
 *
 * - `search` - optional, string or regexp for matching stringified eval payload.
 * If 'search is not specified — all stringified eval payload will be matched
 *
 * **Examples**
 * ```
 * ! Prevents eval if it matches 'test'
 * example.org#%#//scriptlet('prevent-eval-if', 'test')
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
