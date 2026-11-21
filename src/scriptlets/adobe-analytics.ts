import { AdobeAnalytics, AdobeAnalyticsNames } from '../redirects/adobe-analytics';

/**
 * @scriptlet adobe-analytics
 *
 * @description
 * Mocks AppMeasurement, the library of Adobe Analytics, see the `adobe-analytics` redirect resource.
 *
 * Should be used together with a rule which blocks the library, e.g. if redirects are not supported,
 * so that page code which uses it without a check, e.g. `s_gi(account)`, does not throw.
 * A library which is not blocked replaces the mock when it is loaded, so Adobe Analytics is not disabled by it.
 * If Adobe Tags loads the blocked library, the redirect resource should be used instead,
 * as Tags creates the tracker `s` only when the file of the library is loaded.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/js/lib/AppMeasurement.js$script
 * example.org#%#//scriptlet('adobe-analytics')
 * ```
 *
 * @added unknown.
 */
export { AdobeAnalytics, AdobeAnalyticsNames };
