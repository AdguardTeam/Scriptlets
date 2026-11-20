import { Vwo, VwoNames } from '../redirects/vwo';

/**
 * @scriptlet vwo
 *
 * @description
 * Mocks the library of VWO (Visual Website Optimizer, Wingify).
 *
 * Should be used together with a rule which blocks the library, e.g. if redirects are not supported.
 * It prevents the asynchronous VWO SmartCode, which runs after the scriptlet, from hiding the page.
 *
 * ### Examples
 *
 * ```adblock
 * ||visualwebsiteoptimizer.com^$script,domain=example.org
 * example.org#%#//scriptlet('vwo')
 * ```
 *
 * @added unknown.
 */
export { Vwo, VwoNames };
