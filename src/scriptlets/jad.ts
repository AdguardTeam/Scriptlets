import { Jad, JadNames } from '../redirects/jad';

/**
 * @scriptlet jad
 *
 * @description
 * Mocks JAD, the ad library of Webedia, see the `jad` redirect resource.
 *
 * Should be used together with a rule which blocks the library, e.g. if redirects are not supported.
 * It is run before the page, so the commands which the page pushes to `jad.cmd` are run at once.
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.lib.getjad.io/library/$script,domain=example.org
 * example.org#%#//scriptlet('jad')
 * ```
 *
 * @added unknown.
 */
export { Jad, JadNames };
