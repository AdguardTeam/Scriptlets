import { hit } from '../helpers/hit';
import { noop, noopNull } from '../helpers/noop';

/**
 * Mocks Google Analytics API
 *
 * Related UBO scriptlet:
 https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_analytics.js
 */
export function GoogleAnalytics(source) {
    // eslint-disable-next-line func-names
    const Tracker = function () { }; // constructor
    const proto = Tracker.prototype;
    proto.get = noop;
    proto.set = noop;
    proto.send = noop;

    const googleAnalyticsName = window.GoogleAnalyticsObject || 'ga';
    function ga() {
        const len = arguments.length;
        if (len === 0) {
            return;
        }
        // eslint-disable-next-line prefer-rest-params
        const lastArg = arguments[len - 1];
        if (typeof lastArg !== 'object'
            || lastArg === null
            || typeof lastArg.hitCallback !== 'function'
        ) {
            return;
        }

        try {
            lastArg.hitCallback();
            // eslint-disable-next-line no-empty
        } catch (ex) { }
    }

    ga.create = () => new Tracker();
    ga.getByName = noopNull;
    ga.getAll = () => [];
    ga.remove = noop;
    ga.loaded = true;
    window[googleAnalyticsName] = ga;

    const { dataLayer } = window;
    if (dataLayer instanceof Object
        && dataLayer.hide instanceof Object
        && typeof dataLayer.hide.end === 'function'
    ) {
        dataLayer.hide.end();
    }

    hit(source);
}

GoogleAnalytics.names = [
    'google-analytics',
    'ubo-google-analytics_analytics.js',
    'google-analytics_analytics.js',
];

GoogleAnalytics.injections = [
    hit,
    noop,
    noopNull,
];
