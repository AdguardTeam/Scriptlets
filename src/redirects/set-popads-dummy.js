import { setPopadsDummy } from '../scriptlets/set-popads-dummy';

/**
 * @redirect set-popads-dummy
 *
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objects.
 *
 * ### Examples
 *
 * ```adblock
 * ||popads.net^$script,redirect=set-popads-dummy,domain=example.org
 * ```
 *
 * @added v1.0.4.
 */
export { setPopadsDummy };
