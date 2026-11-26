import {
    hit,
    mockAdobeTarget,
    noopFunc,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect adobe-target
 *
 * @description
 * Mocks at.js, the library of Adobe Target, if it is a separate file, e.g. `example.org/js/at.js`.
 * Such a file is usually hosted by the site itself, so rules for it are site-specific.
 * See how at.js works: https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/at-js-implementation/at-js/how-atjs-works
 *
 * Should be used if a rule blocks the at.js file and the page breaks without it:
 * the prehiding snippet of Adobe Target hides the page, i.e. the `at-body-style` style, until its timeout,
 * 3 seconds by default, as only at.js removes it earlier, or page code calls `adobe.target` without a check.
 * See the prehiding snippet: https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/at-js-implementation/at-js/manage-flicker-with-atjs
 *
 * If at.js is not a separate file, e.g. it is in the Adobe Tags library `assets.adobedtm.com/.../launch-<id>.min.js`,
 * which also runs all other tags of the site, or a blocked tag manager loads it, e.g. Tealium iQ,
 * use the `adobe-target` scriptlet instead.
 * It is not needed if only the requests of Adobe Target are blocked, e.g. `||omtrdc.net^`,
 * as at.js shows the page itself when they fail. `at.js` of AT Internet (`tag.aticdn.net`) is another library,
 * see `ati-smarttag`.
 *
 * It answers the `window.adobe.target` API without offers, i.e. content which Adobe Target shows
 * instead of the default content of the page, so that page code which uses it without a check
 * does not throw, e.g. `adobe.target.getOffer()` calls its `success` callback with no offers,
 * and dispatches the at.js events of a page load without offers, e.g. `at-library-loaded`, once the document
 * is parsed if it is loading, e.g. for listeners which inline scripts add after the scriptlet has run,
 * otherwise in the next task, unless at.js which is not blocked has replaced `adobe.target` meanwhile,
 * as it dispatches its own events; calls which the page has made to the mock are completed in any case.
 * See the at.js API: https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/at-js-implementation/functions-overview/atjs-functions
 *
 * As at.js, `trackEvent()` with `selector` and `type` calls `success` after each such event of the selected elements.
 * With `preventDefault`, the event is cancelled and its default action is not resumed, as by at.js 1.7 and 2.x,
 * so a link or a form of a page made for at.js 1.1, which resumed it after `success`, does nothing.
 * `applyOffer()` shows the default content of the mbox, i.e. removes its `mboxDefault` class.
 * Extensions of at.js 1.x registered by `registerExtension()` are available in `adobe.target.ext`.
 * It removes the prehiding style of Adobe Target, and of the Adobe Web SDK, i.e. `alloy-prehiding`, at once.
 * As a scriptlet, it also removes these styles when they are added later, until the page has loaded.
 * No offers are applied, no data is sent and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/js/at.js$script,redirect=adobe-target
 * ||cdn.example.com/target/at.js$script,domain=example.org,redirect=adobe-target
 * ```
 *
 * @added unknown.
 */
export function AdobeTarget(source: Source) {
    if (mockAdobeTarget()) {
        hit(source);
    }
}

export const AdobeTargetNames = [
    'adobe-target',
];

// eslint-disable-next-line prefer-destructuring
AdobeTarget.primaryName = AdobeTargetNames[0];

AdobeTarget.injections = [
    hit,
    noopFunc,
    runProtected,
    mockAdobeTarget,
];
