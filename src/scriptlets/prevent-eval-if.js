/* eslint-disable no-eval, no-extra-bind, func-names */

import { toRegExp, hit } from '../helpers/index';

/**
 * @scriptlet prevent-eval-if
 *
 * @description
 * Prevents page to use eval matching payload.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-ifjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-eval-if'[, search])
 * ```
 *
 * - `search` — optional, string or regular expression matching the stringified eval payload;
 *   defaults to match all stringified eval payloads;
 *   invalid regular expression will cause exit and rule will not work
 *
 * ### Examples
 *
 * ```adblock
 * ! Prevents eval if it matches 'test'
 * example.org#%#//scriptlet('prevent-eval-if', 'test')
 * ```
 *
 * @added v1.0.4.
 */
export function preventEvalIf(source, search) {
    const searchRegexp = toRegExp(search);

    const nativeEval = window.eval;
    window.eval = function (payload) {
        if (!searchRegexp.test(payload.toString())) {
            return nativeEval.call(window, payload);
        }
        hit(source, payload);
        return undefined;
    }.bind(window);
}

preventEvalIf.names = [
    'prevent-eval-if',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'noeval-if.js',
    'ubo-noeval-if.js',
    'ubo-noeval-if',
];

preventEvalIf.injections = [toRegExp, hit];
