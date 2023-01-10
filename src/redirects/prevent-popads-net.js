import { preventPopadsNet } from '../scriptlets/prevent-popads-net';

/**
 * @redirect prevent-popads-net
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objects.
 *
 * **Example**
 * ```
 * ||popads.net/pop.js$script,redirect=prevent-popads-net
 * ```
 */
export { preventPopadsNet };
