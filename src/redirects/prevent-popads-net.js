import { preventPopadsNet } from '../scriptlets/prevent-popads-net';

/**
 * @redirect prevent-popads-net
 *
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objects.
 *
 * ### Examples
 *
 * ```adblock
 * ||popads.net/pop.js$script,redirect=prevent-popads-net
 * ```
 *
 * @added v1.0.4.
 */
export { preventPopadsNet };
