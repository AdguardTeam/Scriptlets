/* eslint-disable func-names */
import { hit } from '../helpers/index';

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
 * ### Examples
 *
 * ```adblock
 * ||example.com/modules/js/lib/fgp/fingerprint2.js$script,redirect=fingerprintjs2
 * ```
 *
 * @added v1.5.0.
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
    // redirect aliases are needed for conversion:
    // prefixed for us
    'ubo-fingerprint2.js',
    // original ubo name
    'fingerprint2.js',
];

Fingerprintjs2.injections = [hit];
