import { noeval } from '../scriptlets/noeval';

/**
 * @redirect noeval
 *
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objects.
 *
 * Prevents page to use eval.
 * Notifies about attempts in the console
 *
 * Mostly it is used as `scriptlet`.
 * See [scriptlet description](../wiki/about-scriptlets.md#noeval).
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-silentjs-
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/index.js$script,redirect=noeval
 * ```
 *
 * @added v1.0.4.
 */
export { noeval };
