/* eslint-disable no-eval, no-extra-bind */
import { hit } from '../helpers';

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    window.eval = function evalWrapper(s) {
        hit(source, `AdGuard has prevented eval:\n${s}`);
    }.bind();
}

noeval.names = [
    'noeval',
    'noeval.js',
    'ubo-noeval.js',
    'ubo-silent-noeval.js',
];

noeval.injections = [hit];
