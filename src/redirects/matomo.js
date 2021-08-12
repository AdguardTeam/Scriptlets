/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers';

/**
 * @redirect matomo
 *
 * @description
 * Mocks the piwik.js file of Matomo (formerly Piwik).
 *
 * **Example**
 * ```
 * ||example.org/piwik.js$script,redirect=matomo
 * ```
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
        getTracker() {
            return new Tracker();
        },
        getAsyncTracker() {
            return new AsyncTracker();
        },
    };

    window.Piwik = matomoWrapper;

    hit(source);
}

Matomo.names = ['matomo'];

Matomo.injections = [hit, noopFunc];
