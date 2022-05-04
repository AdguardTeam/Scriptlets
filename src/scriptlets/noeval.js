/* eslint-disable no-eval, no-extra-bind */
import { hit } from '../helpers/index';

/**
 * @scriptlet noeval
 *
 * @description
 * Prevents page to use eval.
 * Notifies about attempts in the console
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noevaljs-
 *
 * It also can be used as `$redirect` rules sometimes.
 * See [redirect description](../wiki/about-redirects.md#noeval).
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('noeval')
 * ```
 */
export function noeval(source) {
    window.eval = function evalWrapper(s) {
        hit(source, `AdGuard has prevented eval:\n${s}`);
    }.bind();
}

noeval.names = [
    'noeval',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'noeval.js',
    'silent-noeval.js',
    'ubo-noeval.js',
    'ubo-silent-noeval.js',
    'ubo-noeval',
    'ubo-silent-noeval',
];

noeval.injections = [hit];
