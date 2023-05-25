/* eslint-disable consistent-return, no-eval */
import { hit } from '../helpers/index';

/**
 * @redirect prevent-bab2
 *
 * @description
 * Prevents BlockAdblock script from detecting an ad blocker.
 *
 * Related UBO redirect:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/nobab2.js
 *
 * See [redirect description](../wiki/about-redirects.md#prevent-bab2).
 *
 * ### Examples
 *
 * ```adblock
 * /blockadblock.$script,redirect=prevent-bab2
 * ```
 *
 * @added v1.5.0.
 */
export function preventBab2(source) {
    const script = document.currentScript;
    if (script === null) {
        return;
    }

    const url = script.src;
    if (typeof url !== 'string') {
        return;
    }

    const domainsStr = [
        'adclixx\\.net',
        'adnetasia\\.com',
        'adtrackers\\.net',
        'bannertrack\\.net',
    ].join('|');
    const matchStr = `^https?://[\\w-]+\\.(${domainsStr})/.`;
    const domainsRegex = new RegExp(matchStr);
    if (domainsRegex.test(url) === false) {
        return;
    }

    window.nH7eXzOsG = 858;
    hit(source);
}

preventBab2.names = [
    'prevent-bab2',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nobab2.js',
];

preventBab2.injections = [hit];
