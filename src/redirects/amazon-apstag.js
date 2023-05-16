import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect amazon-apstag
 *
 * @description
 * Mocks Amazon's apstag.js
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/f842ab6d3c1cf0394f95d27092bf59627262da40/src/web_accessible_resources/amazon_apstag.js
 *
 * **Example**
 * ```
 * ||amazon-adsystem.com/aax2/apstag.js$script,redirect=amazon-apstag
 * ```
 *
 * @added v1.2.3.
 */
export function AmazonApstag(source) {
    const apstagWrapper = {
        fetchBids(a, b) {
            if (typeof b === 'function') {
                b([]);
            }
        },
        init: noopFunc,
        setDisplayBids: noopFunc,
        targetingKeys: noopFunc,
    };

    window.apstag = apstagWrapper;

    hit(source);
}

AmazonApstag.names = [
    'amazon-apstag',
    'ubo-amazon_apstag.js',
    'amazon_apstag.js',
];

AmazonApstag.injections = [hit, noopFunc];
