import { Chartbeat, ChartbeatNames } from '../redirects/chartbeat';

/**
 * @scriptlet chartbeat
 *
 * @description
 * Mocks `chartbeat.js` and `chartbeat_mab.js` of Chartbeat, see the `chartbeat` redirect resource.
 *
 * Should be used together with a rule which blocks the scripts, e.g. if redirects are not supported.
 * It is run before the page, so the styles of the flicker control which hide the page are removed
 * as soon as the page adds them.
 *
 * ### Examples
 *
 * ```adblock
 * ||static.chartbeat.com/js/chartbeat$script,domain=example.org
 * example.org#%#//scriptlet('chartbeat')
 * ```
 *
 * @added unknown.
 */
export { Chartbeat, ChartbeatNames };
