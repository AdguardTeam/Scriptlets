/* eslint-disable func-names */
import { hit } from '../helpers';

/**
 * @redirect fingerprintjs2
 *
 * @description
 * Mocks FingerprintJS v2
 * https://github.com/fingerprintjs
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint2.js
 *
 * **Example**
 * ```
 * ||the-japan-news.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs2
 * ```
 */
export function Fingerprintjs2(source) {
    let browserId = '';
    for (let i = 0; i < 8; i += 1) {
        browserId += (Math.random() * 0x10000 + 0x1000).toString(16).slice(-4);
    }

    const Fingerprint2 = function () { };

    Fingerprint2.get = function (options, callback) {
        if (!callback) {
            callback = options;
        }
        setTimeout(() => {
            if (callback) {
                callback(browserId, []);
            }
        }, 1);
    };

    Fingerprint2.prototype = {
        get: Fingerprint2.get,
    };

    window.Fingerprint2 = Fingerprint2;

    hit(source);
}

Fingerprintjs2.names = [
    'fingerprintjs2',
    // Aliases are needed for matching the related scriptlet converted into our syntax
    // These are used by UBO rules syntax
    // https://github.com/gorhill/uBlock/wiki/Resources-Library#general-purpose-scriptlets
    'fingerprint2',
    'fingerprint2.js',
    // Prefix 'ubo-' is required to run converted rules
    'ubo-fingerprint2',
    'ubo-fingerprint2.js',

];

Fingerprintjs2.injections = [hit];
