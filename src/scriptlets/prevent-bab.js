/* eslint-disable consistent-return, no-eval */
import { hit } from '../helpers';

/**
 * @scriptlet prevent-bab
 *
 * @description
 * Prevents BlockAdblock script from detecting an ad blocker.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-bab")
 * ```
 */
export function preventBab(source) {
    const nativeSetTimeout = window.setTimeout;
    const babRegex = /\.bab_elementid.$/;

    window.setTimeout = (callback, ...args) => {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
            return nativeSetTimeout.call(this, callback, ...args);
        }
        hit(source);
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
                const found = token instanceof RegExp ? token.test(str) : str.indexOf(token) > -1;
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
        hit(source);
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
    'nobab.js',
    'ubo-nobab.js',
    'bab-defuser.js',
    'ubo-bab-defuser.js',
];

preventBab.injections = [hit];
