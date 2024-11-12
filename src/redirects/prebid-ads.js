/* eslint-disable func-names */
import { hit } from '../helpers';

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

export const prebidAdsNames = [
    'prebid-ads',
    'ubo-prebid-ads.js',
    'prebid-ads.js',
];

// eslint-disable-next-line prefer-destructuring
prebidAds.primaryName = prebidAdsNames[0];

prebidAds.injections = [hit];
