import { Wurfl, WurflNames } from '../redirects/wurfl';

/**
 * @scriptlet wurfl
 *
 * @description
 * Mocks WURFL.js Lite of ScientiaMobile, i.e. `wurfl.io/wurfl.js`, see the `wurfl` redirect resource.
 *
 * Should be used together with a rule which blocks the script, e.g. if redirects are not supported.
 * Unlike the redirect resource, it cannot fire the `load` event of the blocked script,
 * so pages which wait for it, e.g. which add the script and wait for its `load` event
 * before they show the page, need the redirect resource.
 *
 * ### Examples
 *
 * ```adblock
 * ||wurfl.io/wurfl.js$script,domain=example.org
 * example.org#%#//scriptlet('wurfl')
 * ```
 *
 * @added unknown.
 */
export { Wurfl, WurflNames };
