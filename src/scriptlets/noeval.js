/* eslint-disable no-eval, no-extra-bind, no-console, func-names */
import { stringToFunc } from '../helpers';

/**
 * Prevents page to use eval.
 * Notifies about attempts in the console
 * @param {Source} source
 */
export function noeval(source) {
    const hit = stringToFunc(source.hit);

    window.eval = function (s) {
        hit(`AdGuard has prevented eval:\n${s}`);
    }.bind(window);
}

noeval.names = [
    'noeval.js',
    'silent-noeval.js',
    'noeval',
];

noeval.injections = [stringToFunc];
