import {
    appMeasurementUnescape,
    createAdobeVisitorInstance,
    getAdobeOptInCookieDomain,
    getAppMeasurementQueryParam,
    hit,
    mockAdobeAnalytics,
    mockAdobeSatellite,
    mockAdobeTarget,
    mockAdobeVisitor,
    noopFunc,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect adobe-tags
 *
 * @description
 * Mocks the library of Adobe Tags (formerly Adobe Launch), i.e. the `_satellite` global.
 * The library is e.g. `assets.adobedtm.com/<id>/<id>/launch-<id>.min.js`. The Adobe libraries which such a library
 * usually contains or loads are mocked as well: at.js of Adobe Target, the Experience Cloud Identity Service
 * (`VisitorAPI.js`) and AppMeasurement of Adobe Analytics.
 * See the `_satellite` API: https://experienceleague.adobe.com/en/docs/experience-platform/collection/tags/overview
 *
 * Should be used if a rule blocks the library of Adobe Tags and the page breaks without it:
 * the prehiding snippet of Adobe Target or of the Adobe Web SDK in the page hides it until its timeout,
 * e.g. 3 seconds, as only the blocked library removes it earlier,
 * or page code calls `_satellite` or one of the other libraries without a check, so that the rest of it is not run.
 *
 * `_satellite` is defined as the library defines it without rules, data elements and extensions,
 * so `_satellite.track()` and `_satellite.pageBottom()` do nothing, `_satellite.getVar()` returns only the values
 * set by `_satellite.setVar()`, `_satellite.cookie.get()` reads the cookies of the page, but writes none,
 * and the logger logs nothing. `_satellite.getVisitorId()` returns the first instance of the Visitor API
 * on the page, e.g. created by its code, otherwise an instance of the mock whose ids are empty strings,
 * without the `AMCV_<orgId>` cookie, as the organization of the site is not known.
 * The other libraries are mocked as by the `adobe-target`, `adobe-visitor` and `adobe-analytics` redirect resources,
 * each only if it is not on the page yet, so it removes the prehiding styles of Adobe Target and of the Web SDK,
 * i.e. `at-body-style` and `alloy-prehiding`, at once. As by the library, whose Experience Cloud ID extension
 * calls `Visitor.getInstance()` when it is loaded, `adobe.optIn` is created at once with the mock of the Visitor API,
 * e.g. for the consent manager of the page, which calls `adobe.optIn.approve()`. As the opt-in configuration
 * of the site is not known, opt-in applies and no category is approved until the page approves it, so that
 * the page is not told that the visitor has consented, also on sites which do not use opt-in, where the library
 * approves all categories. As by the library, a callback of `adobe.optIn.fetchPermissions()` is called then
 * once the page has completed the decision of the visitor.
 * As by the `adobe-visitor` resource, `Visitor.getInstance()` called by the page sets the `AMCV_<orgId>` cookie
 * with a dummy id once the ECID category is approved, i.e. by default only if the page approves it with the first
 * decision of the visitor, as opt-in applies.
 * The opt-in configuration which the page passes to `Visitor.getInstance()` itself is applied to `adobe.optIn`
 * by its first such call, as by the library when it creates the opt-in service, whatever the page has changed
 * before: `doesOptInApply`, e.g. all categories are approved if it is `false`, `preOptInApprovals`,
 * `previousPermissions` and, with `isOptInStorageEnabled`, the decision of the visitor in the `adobeujs-optin`
 * cookie, in which it is stored then as well, as by the `adobe-visitor` resource.
 * Limitation: `adobe.optIn` is not created at once if the mock of the Visitor API is already on the page,
 * e.g. as the `adobe-visitor` resource has run before, as it cannot be told from a Visitor API of the page;
 * it is then created by the first `Visitor.getInstance()` call, as by the `adobe-visitor` resource.
 * The Adobe Web SDK (`alloy`) is not mocked.
 *
 * No rules and no custom code of the site are run, so the other tags which the library loads are not loaded,
 * and no data is sent.
 *
 * The library of a site may also define functions of the site in its custom code, which page code then calls,
 * and which the mock cannot know, e.g. `digitalView()` and `digitalLink()` of the Tags libraries of BBVA:
 * the login page of `online.bbva.com.ar` stays blank without `digitalView()`, also with the mock.
 * Such functions may be defined by another rule, e.g.
 * `online.bbva.com.ar#%#//scriptlet('set-constant', 'digitalView', 'noopFunc')`,
 * otherwise the library has to be unblocked on the site.
 *
 * ### Examples
 *
 * 1. Replaces the library of Adobe Tags on `example.org`, e.g. `assets.adobedtm.com/<id>/<id>/launch-<id>.min.js`
 *    or `assets.adobedtm.com/launch-<id>.min.js`, but not other files of Adobe Tags,
 *    e.g. custom code of the site, `…-source.min.js`, which only the library loads:
 *
 *     ```adblock
 *     ||assets.adobedtm.com^*launch-$script,domain=example.org,redirect=adobe-tags
 *     ```
 *
 * 1. Replaces the library of one property of Adobe Tags, wherever it is loaded:
 *
 *     ```adblock
 *     ||assets.adobedtm.com/0123456789ab/cdef01234567/launch-0123456789ab.min.js$script,redirect=adobe-tags
 *     ```
 *
 * 1. Replaces all scripts of Adobe Tags on `example.org`, e.g. instead of a rule which blocks them:
 *
 *     ```adblock
 *     ||assets.adobedtm.com^$script,domain=example.org,redirect=adobe-tags
 *     ```
 *
 * @added unknown.
 */
export function AdobeTags(source: Source) {
    // all of them are called, so that each library is mocked, also if another one fails, e.g. for a global
    // of the page which cannot be changed
    const mocks = [
        () => mockAdobeVisitor(true),
        mockAdobeAnalytics,
        mockAdobeTarget,
        mockAdobeSatellite,
    ];
    let isMocked = false;
    for (let i = 0; i < mocks.length; i += 1) {
        try {
            if (mocks[i]()) {
                isMocked = true;
            }
        } catch (e) {
            // continue with the other libraries
        }
    }
    if (isMocked) {
        hit(source);
    }
}

export const AdobeTagsNames = [
    'adobe-tags',
];

// eslint-disable-next-line prefer-destructuring
AdobeTags.primaryName = AdobeTagsNames[0];

AdobeTags.injections = [
    hit,
    noopFunc,
    runProtected,
    appMeasurementUnescape,
    getAppMeasurementQueryParam,
    createAdobeVisitorInstance,
    getAdobeOptInCookieDomain,
    mockAdobeVisitor,
    mockAdobeAnalytics,
    mockAdobeTarget,
    mockAdobeSatellite,
];
