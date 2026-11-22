import { SensorsAnalytics, SensorsAnalyticsNames } from '../redirects/sensors-analytics';

/**
 * @scriptlet sensors-analytics
 *
 * @description
 * Mocks the JavaScript SDK of Sensors Analytics (Sensors Data), see the `sensors-analytics` redirect resource.
 *
 * Should be used together with a rule which blocks the SDK, e.g. if redirects are not supported.
 * It should not be used on a page which loads the SDK with the snippet of the SDK, i.e. which sets
 * `sensorsDataAnalytic201505` to the name of its global, e.g. `sensors`: the scriptlet is run before it,
 * and the snippet does nothing if the SDK is already defined, so its global, e.g. `sensors`, is not defined.
 * Such a page usually works without the SDK, as the snippet queues the calls, or the redirect resource
 * can be used there.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/js/sensorsdata.min.js$script,domain=example.org
 * example.org#%#//scriptlet('sensors-analytics')
 * ```
 *
 * @added unknown.
 */
export { SensorsAnalytics, SensorsAnalyticsNames };
