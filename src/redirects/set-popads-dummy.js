import { setPopadsDummy } from '../scriptlets/set-popads-dummy';

/**
 * @redirect set-popads-dummy
 *
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objectss
 *
 * **Example**
 * ```
 * ||popads.net^$script,redirect=set-popads-dummy,domain=example.org
 * ```
 */
export { setPopadsDummy };
