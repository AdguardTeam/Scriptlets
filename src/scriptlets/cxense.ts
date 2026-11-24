import { Cxense, CxenseNames } from '../redirects/cxense';

/**
 * @scriptlet cxense
 *
 * @description
 * Mocks `cx.js` and `cx.cce.js` of Cxense (Piano), see the `cxense` redirect resource.
 *
 * Should be used together with a rule which blocks the scripts, e.g. if redirects are not supported.
 * Unlike the redirect resource, it cannot fire the `load` event of the blocked script,
 * so pages which wait for it need the redirect resource.
 *
 * Widgets are shown as a plain list of links, as by the redirect resource, if their request is allowed.
 *
 * ### Examples
 *
 * ```adblock
 * ||cxense.com/cx.$script,domain=example.org
 * example.org#%#//scriptlet('cxense')
 * ```
 *
 * The widget request of the scriptlet is allowed by the exception rule
 * `@@||api.cxense.com/public/widget/data?json=$xmlhttprequest,domain=example.org`.
 *
 * @added unknown.
 */
export { Cxense, CxenseNames };
