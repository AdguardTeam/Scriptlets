import { noeval } from '../scriptlets/noeval';

/**
 * @redirect noeval.js
 *
 * @description
 * Redirects request to the source which sets static properties to PopAds and popns objects
 *
 * Prevents page to use eval.
 * Notifies about attempts in the console
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noevaljs-
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#noeval-silentjs-
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=noeval.js
 * ```
 */
export { noeval };
