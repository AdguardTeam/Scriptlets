import { KameleoonEngine, KameleoonEngineNames } from '../redirects/kameleoon';

/**
 * @scriptlet kameleoon
 *
 * @description
 * Mocks the Kameleoon Web Experimentation engine.
 *
 * Should be used together with a rule which blocks the engine, e.g. if redirects are not supported.
 * It prevents the anti-flicker snippet of Kameleoon, which runs after the scriptlet, from hiding the page.
 * The site code, i.e. `Kameleoon.API.Core.getConfiguration().siteCode`, is not known then and is empty.
 *
 * ### Examples
 *
 * ```adblock
 * ||kameleoon.io^$script,domain=example.org
 * example.org#%#//scriptlet('kameleoon')
 * ```
 *
 * @added unknown.
 */
export { KameleoonEngine, KameleoonEngineNames };
