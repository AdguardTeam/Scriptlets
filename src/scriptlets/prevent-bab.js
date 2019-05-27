/* eslint-disable consistent-return, no-eval */

import { createHitFunction, stringToFunc } from '../helpers';

/**
 * Prevents BlockAdblock
 *
 * @param {Source} source
 */
export function preventBab(source) {
    const hit = createHitFunction(source.hit, source.ruleText);

    const nativeSetTimeout = window.setTimeout;
    const babRegex = /\.bab_elementid.$/;

    window.setTimeout = (callback, ...args) => {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
            return nativeSetTimeout.call(this, callback, ...args);
        }
        hit();
    };

    const signatures = [
        ['blockadblock'],
        ['babasbm'],
        [/getItem\('babn'\)/],
        ['getElementById', 'String.fromCharCode', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'charAt', 'DOMContentLoaded', 'AdBlock', 'addEventListener', 'doScroll', 'fromCharCode', '<<2|r>>4', 'sessionStorage', 'clientWidth', 'localStorage', 'Math', 'random'],
    ];
    const check = (str) => {
        for (let i = 0; i < signatures.length; i += 1) {
            const tokens = signatures[i];
            let match = 0;
            for (let j = 0; j < tokens.length; j += 1) {
                const token = tokens[j];
                const found = token instanceof RegExp ? token.test(str) : str.includes(token);
                if (found) {
                    match += 1;
                }
            }
            if (match / tokens.length >= 0.8) {
                return true;
            }
        }
        return false;
    };

    const nativeEval = window.eval;
    window.eval = (str) => {
        if (!check(str)) {
            return nativeEval(str);
        }
        hit();
        const bodyEl = document.body;
        if (bodyEl) {
            bodyEl.style.removeProperty('visibility');
        }
        const el = document.getElementById('babasbmsgx');
        if (el) {
            el.parentNode.removeChild(el);
        }
    };
}

preventBab.names = [
    'prevent-bab',
    'ubo-bab-defuser.js',
];

preventBab.injections = [stringToFunc, createHitFunction];
