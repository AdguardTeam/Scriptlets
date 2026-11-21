import {
    appMeasurementUnescape,
    createAdobeVisitorInstance,
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
 * Mocks the library of Adobe Tags (formerly Adobe Launch), e.g. `assets.adobedtm.com/<id>/<id>/launch-<id>.min.js`,
 * i.e. the `_satellite` global, and the Adobe libraries which such a library usually contains or loads:
 * at.js of Adobe Target, the Experience Cloud Identity Service (`VisitorAPI.js`)
 * and AppMeasurement of Adobe Analytics.
 * See the `_satellite` API: https://experienceleague.adobe.com/en/docs/experience-platform/collection/tags/overview
 *
 * Should be used if a rule blocks the library of Adobe Tags and the page breaks without it:
 * the prehiding snippet of Adobe Target or of the Adobe Web SDK in the page hides it until its timeout,
 * e.g. 3 seconds, as only the blocked library removes it earlier,
 * or page code calls `_satellite` or one of the other libraries without a check, so that the rest of it is not run.
 *
 * `_satellite` is defined as the library defines it without rules, data elements and extensions,
 * so `_satellite.track()` and `_satellite.pageBottom()` do nothing, `_satellite.getVar()` returns only the values
 * set by `_satellite.setVar()`, `_satellite.cookie.get()` reads the cookies of the page, but no cookies are written,
 * and the logger logs nothing. `_satellite.getVisitorId()` returns the first instance of the Visitor API
 * on the page, e.g. created by its code, otherwise an instance of the mock whose ids are empty strings,
 * without the `AMCV_<orgId>` cookie, as the organization of the site is not known.
 * The other libraries are mocked as by the `adobe-target`, `adobe-visitor` and `adobe-analytics` redirect resources,
 * each only if it is not on the page yet, so it removes the prehiding styles of Adobe Target and of the Web SDK,
 * i.e. `at-body-style` and `alloy-prehiding`, at once.
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
    // all of them are called, so that each library is mocked
    const isVisitorMocked = mockAdobeVisitor();
    const isAnalyticsMocked = mockAdobeAnalytics();
    const isTargetMocked = mockAdobeTarget();
    const isSatelliteMocked = mockAdobeSatellite();
    if (isVisitorMocked || isAnalyticsMocked || isTargetMocked || isSatelliteMocked) {
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
    mockAdobeVisitor,
    mockAdobeAnalytics,
    mockAdobeTarget,
    mockAdobeSatellite,
];
