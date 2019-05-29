/* eslint-disable no-eval, no-extra-bind */
import { hit, log } from '../helpers';

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    window.eval = function evalWrapper(s) {
        hit(source);
        log(source, `AdGuard has prevented eval:\n${s}`);
    }.bind();
}

noeval.names = [
    'noeval.js',
    'silent-noeval.js',
    'noeval',
];

noeval.injections = [hit, log];
