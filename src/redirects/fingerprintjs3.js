/* eslint-disable func-names */
import {
    hit,
    noopStr,
} from '../helpers/index';

/**
 * @redirect fingerprintjs3
 *
 * @description
 * Mocks FingerprintJS v3
 * https://github.com/fingerprintjs
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/fingerprint3.js
 *
 * ### Examples
 *
 * ```adblock
 * ||example.com/js/ufe/isomorphic/thirdparty/fp.min.js$script,redirect=fingerprintjs3
 * ```
 *
 * @added v1.6.2.
 */
export function Fingerprintjs3(source) {
    const visitorId = (() => {
        let id = '';
        for (let i = 0; i < 8; i += 1) {
            id += (Math.random() * 0x10000 + 0x1000).toString(16).slice(-4);
        }
        return id;
    })();

    const FingerprintJS = function () { };
    FingerprintJS.prototype = {
        load() {
            return Promise.resolve(new FingerprintJS());
        },
        get() {
            return Promise.resolve({
                visitorId,
            });
        },
        hashComponents: noopStr,
    };

    window.FingerprintJS = new FingerprintJS();

    hit(source);
}

Fingerprintjs3.names = [
    'fingerprintjs3',
    // redirect aliases are needed for conversion:
    // prefixed for us
    'ubo-fingerprint3.js',
    // original ubo name
    'fingerprint3.js',
];

Fingerprintjs3.injections = [hit, noopStr];
