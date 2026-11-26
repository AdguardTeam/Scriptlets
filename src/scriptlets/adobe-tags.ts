import { AdobeTags, AdobeTagsNames } from '../redirects/adobe-tags';

/**
 * @scriptlet adobe-tags
 *
 * @description
 * Mocks the library of Adobe Tags (formerly Adobe Launch), i.e. the `_satellite` global, and the Adobe libraries
 * which such a library usually contains or loads, see the `adobe-tags` redirect resource.
 *
 * Should be used together with a rule which blocks the library, e.g. if redirects are not supported,
 * so that the prehiding snippet of Adobe Target or of the Adobe Web SDK does not hide the page until its timeout,
 * and page code which uses `_satellite` without a check, e.g. `_satellite.track('event')`, does not throw.
 *
 * The scriptlet defines `_satellite` and `adobe.target`, and sets `__satelliteLoaded`, as the library does,
 * so a library of Adobe Tags or at.js which is not blocked does not run either,
 * i.e. Adobe Tags and Adobe Target are disabled on the site.
 * Functions which the library of a site defines in its custom code, e.g. `digitalView()` of BBVA, are not defined,
 * see the redirect resource.
 * As the `adobe-visitor` scriptlet, `Visitor.getInstance()` called by the page sets the `AMCV_<orgId>` cookie
 * with a dummy id, by default only if the page approves the ECID category of `adobe.optIn` with the first decision
 * of the visitor. The opt-in configuration of that call is applied to `adobe.optIn`, e.g. `doesOptInApply`
 * or `preOptInApprovals`, and the decision is stored in the `adobeujs-optin` cookie if it enables it,
 * i.e. `isOptInStorageEnabled`, see the redirect resource.
 *
 * ### Examples
 *
 * ```adblock
 * ||assets.adobedtm.com^$script,domain=example.org
 * example.org#%#//scriptlet('adobe-tags')
 * ```
 *
 * @added unknown.
 */
export { AdobeTags, AdobeTagsNames };
