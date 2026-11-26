import {
    appMeasurementUnescape,
    getAppMeasurementQueryParam,
    hit,
    mockAdobeAnalytics,
    noopFunc,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect adobe-analytics
 *
 * @description
 * Mocks AppMeasurement, the library of Adobe Analytics, e.g. `AppMeasurement.min.js`.
 * Its ActivityMap module, `AppMeasurement_Module_ActivityMap.min.js`, is mocked as well.
 * See the AppMeasurement documentation: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/functions/s-gi
 *
 * Should be used if a rule blocks the library and page code which uses it without a check throws,
 * e.g. `s_gi(account)` or `new AppMeasurement(account)`, so that the rest of that code, e.g. a login form
 * or a video player setup, is not run.
 * The library is a separate file, e.g. a file of the Adobe Analytics extension of Adobe Tags,
 * `assets.adobedtm.com/extensions/<id>/AppMeasurement.min.js`, or a file hosted by the site itself.
 * It does not replace a file with custom library code of the extension, `…-libraryCode_source.min.js`,
 * as such a file also creates the tracker `s` with the settings of the site.
 *
 * It answers the API of AppMeasurement up to version 2.27 without sending data:
 * `s_gi()` and `AppMeasurement.getInstance()` return the instance of the report suite,
 * e.g. the one which Adobe Tags then makes the global `s`, and its methods, e.g. `t()` and `tl()`, track nothing;
 * a done action of `tl()` is still run,
 * e.g. the link is followed, as by the library, and `callbackWhenReadyToTrack()` calls its callback.
 * `Util.getQueryParam()` and `cookieRead()` return the same values as the library,
 * but no cookies are written, and the callbacks of `registerPreTrackCallback()`
 * and `registerPostTrackCallback()` are never called, as no data is sent.
 *
 * ### Examples
 *
 * ```adblock
 * /AppMeasurement.min.js$script,domain=example.org,redirect=adobe-analytics
 * /AppMeasurement_Module_ActivityMap.min.js$script,domain=example.org,redirect=adobe-analytics
 * ||example.org/js/lib/AppMeasurement.js$script,redirect=adobe-analytics
 * ```
 *
 * @added unknown.
 */
export function AdobeAnalytics(source: Source) {
    if (mockAdobeAnalytics()) {
        hit(source);
    }
}

export const AdobeAnalyticsNames = [
    'adobe-analytics',
];

// eslint-disable-next-line prefer-destructuring
AdobeAnalytics.primaryName = AdobeAnalyticsNames[0];

AdobeAnalytics.injections = [
    hit,
    noopFunc,
    runProtected,
    appMeasurementUnescape,
    getAppMeasurementQueryParam,
    mockAdobeAnalytics,
];
