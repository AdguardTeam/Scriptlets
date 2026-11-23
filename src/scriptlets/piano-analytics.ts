import { PianoAnalytics, PianoAnalyticsNames } from '../redirects/piano-analytics';

/**
 * @scriptlet piano-analytics
 *
 * @description
 * Mocks the JavaScript SDK of Piano Analytics, i.e. the `pa` global, see the `piano-analytics` redirect resource.
 *
 * Should be used together with a rule which blocks the SDK, e.g. if redirects are not supported.
 * Unlike the redirect resource, it cannot fire the `load` event of the blocked script,
 * so pages which wait for it need the redirect resource.
 *
 * ### Examples
 *
 * ```adblock
 * ||tag.aticdn.net/piano-analytics.js$script,domain=example.org
 * example.org#%#//scriptlet('piano-analytics')
 * ```
 *
 * @added unknown.
 */
export { PianoAnalytics, PianoAnalyticsNames };
