import {
    hit, noopFunc, noopNull, noopArray,
} from '../helpers';

/**
 * @redirect google-analytics
 *
 * @description
 * Mocks Google Analytics API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_analytics.js
 *
 * **Example**
 * ```
 * ||google-analytics.com/analytics.js$script,redirect=google-analytics
 * ```
 */
export function GoogleAnalytics(source) {
    // eslint-disable-next-line func-names
    const Tracker = function () { }; // constructor
    const proto = Tracker.prototype;
    proto.get = noopFunc;
    proto.set = noopFunc;
    proto.send = noopFunc;

    const googleAnalyticsName = window.GoogleAnalyticsObject || 'ga';
    // a -- fake arg for 'ga.length < 1' antiadblock checking
    // eslint-disable-next-line no-unused-vars
    function ga(a) {
        const len = arguments.length;
        if (len === 0) {
            return;
        }
        // eslint-disable-next-line prefer-rest-params
        const lastArg = arguments[len - 1];

        let replacer;
        if (lastArg instanceof Object
            && lastArg !== null
            && typeof lastArg.hitCallback === 'function') {
            replacer = lastArg.hitCallback;
        } else if (typeof lastArg === 'function') {
            // https://github.com/AdguardTeam/Scriptlets/issues/98
            replacer = () => {
                lastArg(ga.create());
            };
        }

        try {
            setTimeout(replacer, 1);
            // eslint-disable-next-line no-empty
        } catch (ex) { }
    }

    ga.create = () => new Tracker();
    ga.getByName = noopNull;
    ga.getAll = noopArray;
    ga.remove = noopFunc;
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
    noopFunc,
    noopNull,
    noopArray,
];
