import { AdobeTarget, AdobeTargetNames } from '../redirects/adobe-target';

/**
 * @scriptlet adobe-target
 *
 * @description
 * Mocks at.js, the library of Adobe Target, see the `adobe-target` redirect resource.
 *
 * Should be used if at.js is not a separate file which can be redirected, and a blocked library contains
 * or loads it, e.g. the Adobe Tags library `assets.adobedtm.com/.../launch-<id>.min.js`, or Tealium iQ.
 * The prehiding snippet of Adobe Target, which runs after the scriptlet, hides the page then until its timeout,
 * 3 seconds by default; the scriptlet removes its style, `at-body-style`, and the one of the Adobe Web SDK,
 * `alloy-prehiding`, as soon as they are added.
 * See the prehiding snippet: https://experienceleague.adobe.com/en/docs/target-dev/developer/client-side/at-js-implementation/at-js/manage-flicker-with-atjs
 *
 * The scriptlet defines `adobe.target`, so a real at.js which is not blocked does not run either,
 * i.e. Adobe Target is disabled on the site.
 *
 * ### Examples
 *
 * ```adblock
 * ||assets.adobedtm.com^$script,domain=example.org
 * example.org#%#//scriptlet('adobe-target')
 * ```
 *
 * @added unknown.
 */
export { AdobeTarget, AdobeTargetNames };
