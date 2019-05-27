/* eslint-disable no-eval, no-extra-bind */
import { createHitFunction, stringToFunc } from '../helpers';

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    const hit = createHitFunction(source);
    window.eval = function evalWrapper(s) {
        hit(`AdGuard has prevented eval:\n${s}`);
    }.bind();
}

noeval.names = [
    'noeval.js',
    'silent-noeval.js',
    'noeval',
];

noeval.injections = [stringToFunc, createHitFunction];
