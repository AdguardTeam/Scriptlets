/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers';

/**
 * @redirect fingerprintjs
 *
 * @description
 * Mocks FingerprintJS.
 * https://github.com/fingerprintjs
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/commit/33a18c3a1eb101470c43979a41d8adef3e21208d
 *
 * **Example**
 * ```
 * ||the-japan-news.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs
 * ```
 */
export function Fingerprintjs(source) {
    let browserId = '';
    for (let i = 0; i < 8; i += 1) {
        browserId += (Math.random() * 0x10000 + 0x1000).toString(16).slice(-4);
    }

    const Fingerprint = function () {};

    Fingerprint.get = function (options, callback) {
        if (!callback) {
            callback = options;
        }
        setTimeout(() => {
            if (callback) {
                callback(browserId, []);
            }
        }, 1);
    };

    Fingerprint.prototype = {
        get: Fingerprint.get,
    };

    window.Fingerprint2 = Fingerprint;

    hit(source);
}

Fingerprintjs.names = [
    'fingerprintjs',
    'ubo-fingerprint2.js',
    'fingerprintjs.js',
];

Fingerprintjs.injections = [hit, noopFunc];
