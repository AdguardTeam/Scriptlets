import { Optimizely, OptimizelyNames } from '../redirects/optimizely';

/**
 * @scriptlet optimizely
 *
 * @description
 * Mocks the Optimizely Web Experimentation snippet, and the API of Optimizely Classic,
 * see the `optimizely` redirect resource.
 *
 * Should be used together with a rule which blocks the snippet, e.g. if redirects are not supported.
 * The identity of the project, e.g. `optimizely.get('data').projectId`, is not known then and is `null`.
 * It stays `null` also if the `optimizely` redirect resource is used for the snippet as well, although
 * the redirect resource knows it from the URL of the snippet, as the object of the scriptlet is kept then.
 * As the scriptlet runs before the page code, the lifecycle events, e.g. `initialized`, are delivered
 * to the listeners which the page adds later while it is loading. If the page replaces `window.optimizely`,
 * e.g. by `window.optimizely = []` instead of `window.optimizely = window.optimizely || []`,
 * its commands are not run, so the redirect resource should be used for the snippet then.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/optimizely.js
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.optimizely.com/js/*.js$script,domain=example.org
 * example.org#%#//scriptlet('optimizely')
 * ```
 *
 * @added unknown.
 */
export { Optimizely, OptimizelyNames };
