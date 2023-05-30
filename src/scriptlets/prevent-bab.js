/* eslint-disable consistent-return, no-eval */
import { hit } from '../helpers/index';

/**
 * @scriptlet prevent-bab
 *
 * @description
 * Prevents BlockAdblock script from detecting an ad blocker.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#bab-defuserjs-
 *
 * It also can be used as `$redirect` sometimes.
 * See [redirect description](../wiki/about-redirects.md#prevent-bab).
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('prevent-bab')
 * ```
 *
 * @added v1.0.4.
 */
export function preventBab(source) {
    const nativeSetTimeout = window.setTimeout;
    const babRegex = /\.bab_elementid.$/;

    const timeoutWrapper = (callback, ...args) => {
        if (typeof callback !== 'string' || !babRegex.test(callback)) {
            return nativeSetTimeout.apply(window, [callback, ...args]);
        }
        hit(source);
    };
    window.setTimeout = timeoutWrapper;

    const signatures = [
        ['blockadblock'],
        ['babasbm'],
        [/getItem\('babn'\)/],
        [
            'getElementById',
            'String.fromCharCode',
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            'charAt',
            'DOMContentLoaded',
            'AdBlock',
            'addEventListener',
            'doScroll',
            'fromCharCode',
            '<<2|r>>4',
            'sessionStorage',
            'clientWidth',
            'localStorage',
            'Math',
            'random',
        ],
    ];
    const check = (str) => {
        if (typeof str !== 'string') {
            return false;
        }
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

    const evalWrapper = (str) => {
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
    window.eval = evalWrapper.bind(window);
}

preventBab.names = [
    'prevent-bab',
    // there is no aliases for this scriptlet
];

preventBab.injections = [hit];
