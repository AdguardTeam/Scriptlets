/* eslint-disable func-names */
import { hit } from '../helpers/index';

/**
 * @redirect prebid-ads
 *
 * @description
 * Sets predefined constants on a page:
 *
 * - `canRunAds`: `true`
 * - `isAdBlockActive`: `false`
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/assets/js/prebid-ads.js$script,redirect=prebid-ads
 * ```
 *
 * @added v1.6.2.
 */
export function prebidAds(source) {
    window.canRunAds = true;
    window.isAdBlockActive = false;

    hit(source);
}

prebidAds.names = [
    'prebid-ads',
    'ubo-prebid-ads.js',
    'prebid-ads.js',
];

prebidAds.injections = [hit];
