import { getWurflDevice, hit, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect wurfl
 *
 * @description
 * Mocks WURFL.js Lite of ScientiaMobile, i.e. `wurfl.io/wurfl.js`, which defines the `WURFL` object
 * with the device of the visitor, detected by the service from the request.
 * See the API: https://docs.scientiamobile.com/documentation/wurfl-js/wurflDotjs-lite-getting-started-guide
 *
 * Should be used if a rule blocks WURFL.js and the page breaks without it, as page code usually reads
 * `WURFL.is_mobile` or `WURFL.form_factor` without a check, or waits for the `load` event of the script.
 *
 * `WURFL` has the properties of WURFL.js Lite, detected locally from the User-Agent, `navigator.maxTouchPoints`
 * and `navigator.userAgentData.mobile`, without the device database of the service:
 * - `form_factor` — `Desktop`, `Smartphone`, `Tablet`, `Smart-TV` or `Robot`,
 * - `is_mobile` — `true` for a smartphone or a tablet,
 * - `complete_device_name` — the name of a desktop browser, e.g. `Google Chrome`, or of an Apple device,
 *   e.g. `Apple iPhone`, as named by the service, and an empty string for other devices.
 *
 * As by WURFL.js, `WURFLPromises.init` and `WURFLPromises.complete` are resolved with `{ WURFL }`,
 * `window.__wurfljs_das_finalize(WURFL)` is called if the page has defined it, and the events
 * `WurflJSInitComplete` and `WurflJSDetectionComplete` are dispatched on `document` with `{ WURFL }`
 * as their `detail`, at once, or at `DOMContentLoaded` if the document is still being loaded, so that
 * listeners added by the page after the scriptlet has run receive them.
 * `navigator.userAgentData` is not added where the browser does not have it, as WURFL.js does.
 * If `WURFL` is already on the page, e.g. bundled in its code, nothing is changed.
 * No requests are sent, and no cookies or storage items are set.
 *
 * ### Examples
 *
 * ```adblock
 * ||wurfl.io/wurfl.js$script,redirect=wurfl
 * ```
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

export function Wurfl(source: Source) {
    const w = window as unknown as AnyRecord;
    const doc = w.document;

    // WURFL.js, e.g. bundled in the code of the page, or the mock
    if (w.WURFL && typeof w.WURFL === 'object') {
        return;
    }

    const nav = w.navigator || {};
    const uaData = nav.userAgentData;
    const WURFL = getWurflDevice(
        nav.userAgent,
        nav.maxTouchPoints,
        uaData && typeof uaData === 'object' ? uaData.mobile : undefined,
    );
    w.WURFL = WURFL;

    // eslint-disable-next-line no-underscore-dangle
    runProtected(w.__wurfljs_das_finalize, [WURFL]);

    if (typeof w.Promise === 'function') {
        w.WURFLPromises = {
            init: w.Promise.resolve({ WURFL }),
            complete: w.Promise.resolve({ WURFL }),
        };
    }

    const dispatchEvents = () => {
        ['WurflJSInitComplete', 'WurflJSDetectionComplete'].forEach((type) => {
            try {
                doc.dispatchEvent(new w.CustomEvent(type, { bubbles: true, detail: { WURFL } }));
            } catch (e) {
                // `CustomEvent` is not supported
            }
        });
    };
    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', dispatchEvents, { once: true });
    } else {
        dispatchEvents();
    }

    hit(source);
}

export const WurflNames = [
    'wurfl',
];

// eslint-disable-next-line prefer-destructuring
Wurfl.primaryName = WurflNames[0];

Wurfl.injections = [
    getWurflDevice,
    hit,
    runProtected,
];
