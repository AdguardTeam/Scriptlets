import {
    createAdobeVisitorInstance,
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
 * and `adobe.optIn` approves all categories, as when opt-in does not apply.
 * No visitor id is generated, no data is sent and no storage items are set, except a cookie with a dummy id,
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
 * So, as the library, `getInstance()` sets this cookie if the organization has none, though only a session one
 * with a dummy id, the same for every visitor, so it does not identify anyone, e.g.
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
    mockAdobeVisitor,
];
