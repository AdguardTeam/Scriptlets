import { hit, noopFunc, runProtected } from '../helpers';
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
 * It answers the `window.adobe.target` API without offers, so that page code which uses it without a check
 * does not throw, e.g. `adobe.target.getOffer()` calls its `success` callback with no offers,
 * and dispatches the at.js events of a page load without offers, e.g. `at-library-loaded`.
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

type AdobeWindow = typeof window & {
    adobe?: unknown;
};

interface MboxRequest {
    name?: unknown;
}

interface DeliveryRequest {
    execute?: {
        pageLoad?: unknown;
        mboxes?: unknown;
    };
    prefetch?: {
        mboxes?: unknown;
        views?: unknown;
    };
}

interface OfferOptions {
    mbox?: unknown;
    success?: unknown;
    error?: unknown;
    request?: unknown;
    selector?: unknown;
    type?: unknown;
    preventDefault?: unknown;
}

interface ExtensionOptions {
    name?: unknown;
    modules?: unknown;
    register?: unknown;
}

export function AdobeTarget(source: Source) {
    const w = window as AdobeWindow;
    const doc = w.document;
    const existing = w.adobe as { target?: { getOffer?: unknown } } | undefined;
    // The real at.js, or this resource loaded before, is kept.
    if (existing && existing.target && typeof existing.target.getOffer === 'function') {
        return;
    }

    const NativePromise = w.Promise;
    const PREHIDING_IDS = ['at-body-style', 'alloy-prehiding'];

    /**
     * Returns a random session id in the format of at.js: 32 hexadecimal characters.
     *
     * @returns Session id.
     */
    const randomSessionId = (): string => {
        let id = '';
        for (let i = 0; i < 32; i += 1) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
        return id;
    };
    const sessionId = randomSessionId();

    /**
     * Removes the prehiding styles of Adobe Target and of the Web SDK, if they are in the document.
     */
    const removePrehiding = () => {
        PREHIDING_IDS.forEach((id) => {
            const style = doc.getElementById(id);
            if (style && style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });
    };

    /**
     * Dispatches an at.js event on the document, as at.js does: a `CustomEvent` which does not bubble,
     * with the event type and the tracking session in its detail.
     *
     * @param type Event type, e.g. `at-library-loaded`.
     * @param extra Additional properties of the detail, e.g. `mbox`.
     */
    const dispatch = (type: string, extra?: Record<string, unknown>) => {
        const detail: Record<string, unknown> = { type, tracking: { sessionId } };
        if (extra) {
            Object.keys(extra).forEach((key) => {
                detail[key] = extra[key];
            });
        }
        try {
            doc.dispatchEvent(new CustomEvent(type, { detail }));
        } catch (e) {
            // ignore
        }
    };

    /**
     * Dispatches the events of a request without offers, as at.js does.
     *
     * @param mbox Name of the mbox of the request, if any.
     */
    const dispatchRequestWithoutOffers = (mbox?: unknown) => {
        const extra: Record<string, unknown> = mbox === undefined ? {} : { mbox };
        dispatch('at-request-start', extra);
        dispatch('at-request-succeeded', Object.assign({ redirect: false }, extra));
        dispatch('at-content-rendering-no-offers', extra);
    };

    /**
     * Checks whether a selector option of at.js selects elements, as at.js does:
     * a non-blank string or an element.
     *
     * @param selector Selector option, e.g. of `trackEvent()`.
     * @returns True if the option is a selector.
     */
    const isSelector = (selector: unknown): boolean => (typeof selector === 'string' && selector.trim() !== '')
        || (!!selector && typeof selector === 'object' && (selector as Node).nodeType === Node.ELEMENT_NODE);

    /**
     * Returns the elements selected by a selector option of at.js, i.e. a CSS selector or an element.
     *
     * @param selector Selector option, e.g. of `applyOffer()`.
     * @returns Selected elements, none for an invalid selector.
     */
    const getElements = (selector: unknown): Element[] => {
        if (!isSelector(selector)) {
            return [];
        }
        if (typeof selector !== 'string') {
            return [selector as Element];
        }
        try {
            return Array.prototype.slice.call(doc.querySelectorAll(selector));
        } catch (e) {
            return [];
        }
    };

    /**
     * Calls the success callback of the page asynchronously, as at.js does after the request.
     *
     * @param success Success callback of the page, if any.
     */
    const callSuccess = (success: unknown) => {
        if (typeof success === 'function') {
            w.setTimeout(() => runProtected(success, []), 0);
        }
    };

    // modules which at.js 1.x passes to extensions
    const extensionModules: Record<string, unknown> = {
        logger: { log: noopFunc, error: noopFunc },
        settings: {
            clientCode: '',
            serverDomain: '',
            timeout: 3000,
            globalMboxName: 'target-global-mbox',
            globalMboxAutoCreate: false,
        },
    };

    /**
     * Checks whether an object has an own property, so that e.g. `constructor` is not taken
     * from its prototype.
     *
     * @param object Object to check.
     * @param key Property name.
     * @returns True if the object has the own property.
     */
    const hasOwn = (object: object, key: string): boolean => Object.prototype.hasOwnProperty.call(object, key);

    /**
     * Returns the response of `getOffers()` without offers for the request of the page,
     * in the format of at.js, e.g. `{ execute: { mboxes: [{ name }] }, meta: { ... } }`.
     *
     * @param request Delivery request of the page.
     * @returns Response without offers.
     */
    const createDeliveryResponse = (request: unknown): Record<string, unknown> => {
        const response: Record<string, unknown> = {};
        const req = (request && typeof request === 'object' ? request : {}) as DeliveryRequest;
        const toMboxes = (mboxes: unknown) => (Array.isArray(mboxes)
            ? mboxes.map((mbox: MboxRequest) => ({ name: mbox && mbox.name }))
            : []);
        if (req.execute && typeof req.execute === 'object') {
            const execute: Record<string, unknown> = {};
            if (req.execute.pageLoad) {
                execute.pageLoad = {};
            }
            if (req.execute.mboxes) {
                execute.mboxes = toMboxes(req.execute.mboxes);
            }
            response.execute = execute;
        }
        if (req.prefetch && typeof req.prefetch === 'object') {
            const prefetch: Record<string, unknown> = {};
            if (req.prefetch.mboxes) {
                prefetch.mboxes = toMboxes(req.prefetch.mboxes);
            }
            if (req.prefetch.views) {
                prefetch.views = [];
            }
            response.prefetch = prefetch;
        }
        response.meta = { decisioningMethod: 'server-side' };
        return response;
    };

    const target = {
        VERSION: '2.11.8',
        event: {
            LIBRARY_LOADED: 'at-library-loaded',
            REQUEST_START: 'at-request-start',
            REQUEST_SUCCEEDED: 'at-request-succeeded',
            REQUEST_FAILED: 'at-request-failed',
            CONTENT_RENDERING_START: 'at-content-rendering-start',
            CONTENT_RENDERING_SUCCEEDED: 'at-content-rendering-succeeded',
            CONTENT_RENDERING_FAILED: 'at-content-rendering-failed',
            CONTENT_RENDERING_NO_OFFERS: 'at-content-rendering-no-offers',
            CONTENT_RENDERING_REDIRECT: 'at-content-rendering-redirect',
            ARTIFACT_DOWNLOAD_SUCCEEDED: 'artifactDownloadSucceeded',
            ARTIFACT_DOWNLOAD_FAILED: 'artifactDownloadFailed',
            GEO_LOCATION_UPDATED: 'geoLocationUpdated',
        },
        init: noopFunc,
        // As at.js for an mbox without offers: the success callback is called with no actions.
        getOffer: (options: unknown) => {
            const opts = (options && typeof options === 'object' ? options : {}) as OfferOptions;
            w.setTimeout(() => {
                dispatchRequestWithoutOffers(opts.mbox);
                runProtected(opts.success, [[]]);
            }, 0);
        },
        getOffers: (options: unknown) => {
            const opts = (options && typeof options === 'object' ? options : {}) as OfferOptions;
            return NativePromise.resolve(createDeliveryResponse(opts.request));
        },
        // As at.js 1.x without an offer: the default content of the mbox is shown.
        applyOffer: (options: unknown) => {
            const opts = (options && typeof options === 'object' ? options : {}) as OfferOptions;
            getElements(opts.selector).forEach((element) => {
                if (element.classList.contains('mboxDefault')) {
                    element.classList.remove('mboxDefault');
                }
            });
            dispatch('at-content-rendering-no-offers', opts.mbox === undefined ? {} : { mbox: opts.mbox });
        },
        applyOffers: () => NativePromise.resolve(undefined),
        triggerView: noopFunc,
        // The real one calls `success` after the notification has been sent,
        // with `type` and `selector` after each event of this type on the selected elements.
        trackEvent: (options: unknown) => {
            const opts = (options && typeof options === 'object' ? options : {}) as OfferOptions;
            const { type } = opts;
            if (typeof type !== 'string' || type.trim() === '' || !isSelector(opts.selector)) {
                callSuccess(opts.success);
                return;
            }
            getElements(opts.selector).forEach((element) => {
                element.addEventListener(type, (event) => {
                    // As the listener of at.js 1.7 and 2.x, which returns false: the action is not resumed,
                    // the page does it in `success` if needed.
                    if (opts.preventDefault) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    callSuccess(opts.success);
                });
            });
        },
        sendNotifications: noopFunc,
        // As at.js 1.x: the value returned by `register` is available as `adobe.target.ext.<name>`.
        registerExtension: (options: unknown) => {
            const opts = (options && typeof options === 'object' ? options : {}) as ExtensionOptions;
            const { name, register } = opts;
            if (typeof name !== 'string' || typeof register !== 'function') {
                return;
            }
            const path = name.split('.');
            if (!path.every((part) => /^[a-zA-Z]+$/.test(part))) {
                return;
            }
            const modules = Array.isArray(opts.modules)
                ? opts.modules.map((module) => (typeof module === 'string' && hasOwn(extensionModules, module)
                    ? extensionModules[module]
                    : undefined))
                : [];
            let value: unknown;
            // not `runProtected()`, as the returned value is needed
            try {
                // a spread call would need a Babel helper which is not in the built resources
                // eslint-disable-next-line prefer-spread
                value = register.apply(null, modules);
            } catch (e) {
                // ignore errors of the extension
            }
            const t = target as Record<string, unknown>;
            if (!t.ext || typeof t.ext !== 'object') {
                t.ext = {};
            }
            let namespace = t.ext as Record<string, unknown>;
            for (let i = 0; i < path.length - 1; i += 1) {
                const part = path[i];
                const next = hasOwn(namespace, part) ? namespace[part] : undefined;
                // a primitive cannot hold the extension
                if (!next || (typeof next !== 'object' && typeof next !== 'function')) {
                    namespace[part] = {};
                }
                namespace = namespace[part] as Record<string, unknown>;
            }
            namespace[path[path.length - 1]] = value;
        },
    };

    const adobe = existing && typeof existing === 'object' ? existing : {};
    (adobe as Record<string, unknown>).target = target;
    w.adobe = adobe;

    ['mboxCreate', 'mboxDefine', 'mboxUpdate'].forEach((name) => {
        if ((w as unknown as Record<string, unknown>)[name] === undefined) {
            (w as unknown as Record<string, unknown>)[name] = noopFunc;
        }
    });

    // Prehiding snippets which run after the scriptlet add their style later, so it is removed then too.
    removePrehiding();
    if (doc.readyState !== 'complete' && typeof w.MutationObserver === 'function') {
        const observer = new w.MutationObserver(removePrehiding);
        observer.observe(doc, { childList: true, subtree: true });
        w.addEventListener('load', () => {
            observer.disconnect();
            removePrehiding();
        }, { once: true });
    }

    hit(source);

    // as at.js on a page load without offers
    w.setTimeout(() => {
        dispatch('at-library-loaded');
        dispatchRequestWithoutOffers();
    }, 0);
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
];
