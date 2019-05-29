/* eslint-disable no-eval, no-extra-bind */
import { createLogFunction } from '../helpers';

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    const log = createLogFunction(source);
    window.eval = function evalWrapper(s) {
        log(`AdGuard has prevented eval:\n${s}`);
    }.bind();
}

noeval.names = [
    'noeval.js',
    'silent-noeval.js',
    'noeval',
];

noeval.injections = [createLogFunction];
