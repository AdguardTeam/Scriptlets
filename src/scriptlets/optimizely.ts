import { Optimizely, OptimizelyNames } from '../redirects/optimizely';

/**
 * @scriptlet optimizely
 *
 * @description
 * Mocks the Optimizely Web Experimentation snippet.
 *
 * Should be used together with a rule which blocks the snippet, e.g. if redirects are not supported.
 * The identity of the project, e.g. `optimizely.get('data').projectId`, is not known then and is `null`.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/optimizely.js
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.optimizely.com/js/*.js$script
 * example.org#%#//scriptlet('optimizely')
 * ```
 *
 * @added unknown.
 */
export { Optimizely, OptimizelyNames };
