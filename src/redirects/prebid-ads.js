/* eslint-disable func-names */
import { hit } from '../helpers';

/**
 * @redirect prebid-ads
 *
 * @description
 * Sets predefined constants on a page.
 *
 * - `canRunAds` : `true`
 * - `isAdBlockActive` : `false`
 *
 * **Example**
 * ```
 * ||gapt.hit.gemius.pl/gplayer.js$script,redirect=gemius
 * ```
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
