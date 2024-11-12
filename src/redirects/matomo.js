/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers';

/**
 * @redirect matomo
 *
 * @description
 * Mocks the piwik.js file of Matomo (formerly Piwik).
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/piwik.js$script,redirect=matomo
 * ```
 *
 * @added v1.5.0.
 */

export function Matomo(source) {
    const Tracker = function () {};
    Tracker.prototype.setDoNotTrack = noopFunc;
    Tracker.prototype.setDomains = noopFunc;
    Tracker.prototype.setCustomDimension = noopFunc;
    Tracker.prototype.trackPageView = noopFunc;
    const AsyncTracker = function () {};
    AsyncTracker.prototype.addListener = noopFunc;

    const matomoWrapper = {
        getTracker: Tracker,
        getAsyncTracker: AsyncTracker,
    };

    window.Piwik = matomoWrapper;

    hit(source);
}

export const MatomoNames = ['matomo'];

// eslint-disable-next-line prefer-destructuring
Matomo.primaryName = MatomoNames[0];

Matomo.injections = [hit, noopFunc];
