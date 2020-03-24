/* eslint-disable no-eval, no-extra-bind */
import { hit } from '../helpers';

/**
 * @scriptlet noeval
 *
 * @description
 * Prevents page to use eval.
 * Notifies about attempts in the console
 *
 * It is mostly used for `$redirect` rules.
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
    'noeval.js',
    'silent-noeval.js',
    'ubo-noeval.js',
    'ubo-silent-noeval.js',
];

noeval.injections = [hit];
