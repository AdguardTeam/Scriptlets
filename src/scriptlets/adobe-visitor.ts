import { AdobeVisitor, AdobeVisitorNames } from '../redirects/adobe-visitor';

/**
 * @scriptlet adobe-visitor
 *
 * @description
 * Mocks the Experience Cloud Identity Service of Adobe, `VisitorAPI.js`,
 * see the `adobe-visitor` redirect resource.
 *
 * Should be used together with a rule which blocks the library, e.g. if redirects are not supported,
 * so that code which uses it without a check, e.g. `Visitor.getInstance(orgId)`, does not throw.
 * As the library, `getInstance()` sets the `AMCV_<orgId>` cookie, though with a dummy id, as some sites read
 * the id from it directly and do not work without it, e.g. the video player of `play.history.com`,
 * see the redirect resource.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/js/VisitorAPI.js$script
 * example.org#%#//scriptlet('adobe-visitor')
 * ```
 *
 * @added unknown.
 */
export { AdobeVisitor, AdobeVisitorNames };
