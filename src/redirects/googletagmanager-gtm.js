import { hit, noopFunc } from '../helpers';

/**
 * @redirect googletagmanager-gtm
 *
 * @description
 * Mocks Google Tag Manager API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagmanager_gtm.js
 *
 * **Example**
 * ```
 * ||googletagmanager.com/gtm.js$script,redirect=googletagmanager-gtm
 * ```
 */
export function GoogleTagManagerGtm(source) {
    window.ga = window.ga || noopFunc;
    const { dataLayer } = window;
    if (dataLayer instanceof Object === false) {
        return;
    }

    if (dataLayer.hide instanceof Object && typeof dataLayer.hide.end === 'function') {
        dataLayer.hide.end();
    }

    if (typeof dataLayer.push === 'function') {
        dataLayer.push = (data) => {
            if (data instanceof Object && typeof data.eventCallback === 'function') {
                setTimeout(data.eventCallback, 1);
            }
        };
    }

    hit(source);
}

GoogleTagManagerGtm.names = [
    'googletagmanager-gtm',
    'ubo-googletagmanager_gtm.js',
    'googletagmanager_gtm.js',
];

GoogleTagManagerGtm.injections = [hit, noopFunc];
