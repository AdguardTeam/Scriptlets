/* eslint-disable func-names */
import { hit } from '../helpers';

/**
 * @redirect constant-detection-stubs
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
export function constantDetectionStubs(source) {
    window.canRunAds = true;
    window.isAdBlockActive = false;

    hit(source);
}

constantDetectionStubs.names = [
    'constant-detection-stubs',
    'ubo-prebid-ads.js',
    'prebid-ads.js',
];

constantDetectionStubs.injections = [hit];
