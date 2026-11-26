import {
    createAdobeVisitorInstance,
    getAdobeOptInCookieDomain,
    hit,
    mockAdobeVisitor,
    noopFunc,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect adobe-visitor
 *
 * @description
 * Mocks the Experience Cloud Identity Service of Adobe, `VisitorAPI.js`, i.e. the `Visitor` global.
 * See its API: https://experienceleague.adobe.com/en/docs/id-service/using/id-service-api/methods/get-set
 *
 * Should be used if a rule blocks the library and code which uses it without a check throws,
 * e.g. the Adobe Analytics configuration of a site, `s.visitor = Visitor.getInstance(orgId)`,
 * so that the rest of it is not run. The library is usually a file hosted by the site itself;
 * the Experience Cloud ID extension of Adobe Tags contains it in the Tags library instead.
 *
 * `Visitor.getInstance()` returns an instance whose ids are empty strings, also in the callbacks, e.g. of
 * `getMarketingCloudVisitorID()` or `getVisitorValues()`, `appendVisitorIDsTo()` returns the URL unchanged,
 * and `adobe.optIn`, created by the first `getInstance()` call, follows its configuration, as the library:
 * with `doesOptInApply`, only the categories of `preOptInApprovals` and of `previousPermissions`, i.e. of the saved
 * decision of the visitor, and with `isOptInStorageEnabled` of the decision which the library has stored
 * in the `adobeujs-optin` cookie, e.g. on another page of the site, are approved until the page approves
 * the other ones, e.g. by its consent manager, otherwise all categories are approved.
 * With `isOptInStorageEnabled`, the decision of the visitor is stored in this cookie as by the library, on the same
 * domain, e.g. `example.org` on `www.example.org`, so that a decision made on a page where the library is blocked,
 * e.g. a revoked approval, holds on the next pages, also where the library is not blocked, which would read
 * an older one otherwise. It has the permissions, and other fields of the permissions of the configuration
 * or of the stored value, if any, which the library keeps as well. As the library, the domain is found
 * by a test cookie, `TEST_AMCV_COOKIE_WRITE_<random>`, which is removed at once.
 * No visitor id is generated, no data is sent and no other storage items are set, except a cookie with a dummy id,
 * see below.
 *
 * ### Why a cookie is set
 *
 * The library gives each visitor an id, the Experience Cloud ID (`MCMID`), and stores it in the `AMCV_<orgId>`
 * cookie. Some sites do not get the id from `Visitor`, but read it from this cookie directly, and do not work
 * without it, even if `Visitor` is mocked. E.g. the video player of `play.history.com` reads the id from the
 * `AMCV_08AC467352782D0D0A490D45@AdobeOrg` cookie and sends it to the API of the site as the device id;
 * if there is no cookie, the video is not requested and no player is shown,
 * see https://github.com/easylist/easylist/issues/24131.
 * Other sites of A+E Networks, e.g. `play.aetv.com`, `play.mylifetime.com` and `play.fyi.tv`,
 * use the same player and organization.
 *
 * So `getInstance()` sets this cookie for a new instance if the organization has none, when the library
 * writes the id, i.e. only while the ECID category is approved by `adobe.optIn`: at once if it is approved,
 * i.e. if opt-in does not apply, or if the category is pre-approved or approved by the saved decision
 * of the visitor; otherwise, if opt-in applies to the instance, when the page approves it with its first decision,
 * e.g. by `adobe.optIn.approve('ecid')`. It is not set in IAB context, i.e. if opt-in applies to the instance
 * with `isIabContext`, as the consent of the IAB platform is not known, nor, as by the library,
 * with `useLocalStorage` or `cookieLifetime: 'NONE'`.
 * It is only a session cookie with a dummy id, the same for every visitor, so it does not identify anyone, e.g.
 * `AMCV_08AC467352782D0D0A490D45@AdobeOrg=MCMID|00000000000000000000000000000000000000`.
 * A cookie which already exists, e.g. set by the library before, is not changed.
 * Its name is not encoded, unlike the one of the library, e.g. `AMCV_08AC467352782D0D0A490D45%40AdobeOrg`,
 * so that a library which is not blocked, e.g. on another page of the site, ignores it and does not take
 * the dummy id over as the id of the visitor, which it would send to Adobe then.
 * A site whose code looks for the encoded name may need a cookie set by a rule instead,
 * e.g. with `trusted-set-cookie`, but a library which is not blocked takes over its id.
 *
 * ### Examples
 *
 * ```adblock
 * /VisitorAPI.js$script,domain=example.org,redirect=adobe-visitor
 * ```
 *
 * @added unknown.
 */
export function AdobeVisitor(source: Source) {
    if (mockAdobeVisitor()) {
        hit(source);
    }
}

export const AdobeVisitorNames = [
    'adobe-visitor',
];

// eslint-disable-next-line prefer-destructuring
AdobeVisitor.primaryName = AdobeVisitorNames[0];

AdobeVisitor.injections = [
    hit,
    noopFunc,
    runProtected,
    createAdobeVisitorInstance,
    getAdobeOptInCookieDomain,
    mockAdobeVisitor,
];
