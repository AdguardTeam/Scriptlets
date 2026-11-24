import {
    getCxenseSearchRequest,
    getCxenseWidgetItems,
    getThrownValueMessage,
    hit,
    logMessage,
    noopFunc,
    runProtected,
    type CxenseWidgetItem,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect cxense
 *
 * @description
 * Mocks `cx.js` and `cx.cce.js` of Cxense (Piano DMP and Content Compass), e.g. `cdn.cxense.com/cx.js`.
 *
 * It answers the `window.cX` API for a page which cannot use Cxense, so that page code which uses it
 * without a check, e.g. `cX.getUserSegmentIds()`, does not throw, and code which waits for the script
 * to be loaded proceeds. Commands queued in `cX.callQueue` and `cX.CCE.callQueue` are processed,
 * and the ones pushed later are processed at once, except `invoke` callbacks, which are not run,
 * as no Cxense code is loaded. Segments are empty: the callbacks of `cX.getUserSegmentIds()`
 * and `cX.getSegments()` are called with an empty array. Utilities which only compute their results,
 * e.g. `cX.parseUrlArgs()` or `cX.createDelegate()`, return them as the library. Other methods do nothing.
 *
 * The Cxense site search keeps working: `cX.jsonpRequest()` sends the request of the page
 * only if it is a search request to `api.cxense.com/document/search`, which contains
 * the query of the page, and calls the callback with its response, as the real one.
 * It is sent with `fetch()` as a JSON request without cookies and without a referrer,
 * so that no code of the response is run.
 *
 * Widgets, e.g. recommended articles, are shown as a plain list of links, with images if the items
 * have them, instead of the widget of the site: its template is code of the response, which is not run,
 * so the design of the site, and its own logic, e.g. labels, are not kept. A widget is the one which the page
 * requests with `cX.CCE.run()`, `cX.CCE.runMulti()`, `cX.CCE.displayWidget()` or `cX.insertWidget()`
 * for its `targetElementId`, or the one of an empty element named after it, i.e. with the id `cx_<widget id>`
 * or `cxense-<widget id>`, which is in the page when the resource runs, or is added until 10 seconds after
 * the page is loaded. As the library, `cX.insertWidget()` with a template, i.e. `renderTemplateUrl`,
 * shows the widget at the end of its `appendToElementId`, or before its `insertBeforeElementId`
 * or `targetElementId`, e.g. a hidden element of the snippet; a widget already shown in such an element,
 * as an empty one named after it, is moved there. An empty element is one without child elements,
 * so its text, e.g. `Loading`, is replaced, unless the page changes the content or the id of the element
 * before the items are received, or requests another widget for the element itself.
 * Its items are requested once, by the id of the widget only:
 *
 * ```text
 * https://api.cxense.com/public/widget/data?json=%7B%22widgetId%22%3A%22<widget id>%22%7D
 * ```
 *
 * It is a `fetch()` request without cookies and without a referrer, i.e. with neither an id of the visitor
 * nor the URL of the page, so the items are not related to the page or to the visitor. Only items which
 * link to the same site and have a title are shown; items placed by hand, i.e. with a `slot`,
 * as sponsored ones, are skipped, and nothing is changed if no item is left. The same site is the host
 * of the page, without `www.`, and its subdomains. Images are requested only from the same site,
 * or from a host from which the page already shows images, with `fetch()` as well, without cookies
 * and a referrer, and without following redirects, so an image of another origin is shown only if its host
 * allows cross-origin requests, and the link has only its title otherwise. Callbacks of the page
 * are not called. If the request is blocked, e.g. by `||cxense.com^$third-party`, nothing is shown,
 * so it should be allowed where widgets are needed, see the examples.
 *
 * Both `cx.js` and `cx.cce.js` should be redirected: the real `cx.cce.js` runs the commands
 * of `cX.CCE.callQueue` with `invoke`, so the widgets requested by them are not shown with it.
 *
 * The search and widget requests, and the ones of the images of the widgets, are the only ones:
 * no other data is sent, no script is loaded, and no cookies or storage items are set.
 * On a site which needs the widgets as they are, the scripts should not be redirected.
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.cxense.com/cx.js$script,redirect=cxense,domain=example.org
 * ||scdn.cxense.com/cx.js$script,redirect=cxense,domain=example.org
 * ||cdn.cxense.com/cx.cce.js$script,redirect=cxense,domain=example.org
 * ```
 *
 * The widget request of the resource, which is sent with `fetch()`, is allowed by the exception rule
 * `@@||api.cxense.com/public/widget/data?json=$xmlhttprequest,domain=example.org`, while the one
 * of the library, a script with an id of the visitor and the URL of the page, stays blocked.
 *
 * @added unknown.
 */

type AnyRecord = Record<string, any>;

/**
 * Where a widget is shown for its element: instead of its content, after its content,
 * or before the element, as for `targetElementId`, `appendToElementId` and `insertBeforeElementId`
 * of `cX.insertWidget()`.
 */
type WidgetPlace = 'into' | 'append' | 'before';

/**
 * Widget which is requested for an element.
 */
type WidgetRecord = {
    /**
     * Id of the widget.
     */
    widgetId: string;

    /**
     * Where the widget is shown for the element.
     */
    place: WidgetPlace;

    /**
     * Whether the page requests the widget, i.e. the element is not only an empty element named after it.
     */
    isRequested: boolean;

    /**
     * Element whose shadow tree has the list of links, once the items are received; it and the next ones
     * are kept only while the widget may be moved, i.e. it is found in an empty element named after it.
     */
    host: Element | null;

    /**
     * Element which is added to the page: the host, or a list item with it.
     */
    node: Element | null;

    /**
     * Content of the element which the widget has replaced, to restore it if the widget is moved.
     */
    replaced: Node[];

    /**
     * Child nodes of the element as the resource has seen them last, i.e. when the widget was found
     * in the empty element, or the widget itself once it is shown there, to tell whether the page
     * has changed the element since.
     */
    seen: Node[];

    /**
     * Values of the child nodes as the resource has seen them, e.g. the text of a text node,
     * which the page may change without replacing the node.
     */
    seenValues: (string | null)[];
};

export function Cxense(source: Source) {
    const w = window as unknown as AnyRecord;
    const doc = w.document;
    const hasOwn = (obj: unknown, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
    const isObject = (value: unknown): value is AnyRecord => !!value && typeof value === 'object';

    const existing = w.cX;
    const cX: AnyRecord = isObject(existing) || typeof existing === 'function' ? existing : {};
    let installed = false;
    // set only if `cX` is installed here: no widgets are shown by the resource for the real library
    let requestWidget: ((params: unknown, elementId?: unknown) => void) | null = null;
    let startWidgets: (() => void) | null = null;
    // the commands queued by the page are run when both `cX` and `cX.CCE` are installed: cx.cce.js defines
    // its methods and then loads cx.js, which runs the queue, so a queued command may call e.g. `cX.CCE.run()`
    const queuedCommands: (() => void)[] = [];

    /**
     * Takes the commands queued in the array, and makes its `push()` process commands at once,
     * returning the length, as the real library does, once the queued ones are run by `runQueued()`.
     * Commands pushed before that, or while the queued ones are run, e.g. by a callback of one of them,
     * are run after them, in the order in which they were pushed, as the library takes the commands
     * from the queue one by one. Only own methods of the given table are called, and `invoke` commands
     * are ignored, as no Cxense code is loaded.
     *
     * @param queue Existing queue, which is kept if it is an array.
     * @param methods Methods to call for the commands, e.g. `['setSiteId', '123']`.
     * @returns Queue and the function which runs the queued commands.
     */
    const setupQueue = (queue: unknown, methods: AnyRecord) => {
        const array: unknown[] = Array.isArray(queue) ? queue : [];
        const queued = array.splice(0, array.length);
        let isQueueRun = false;
        const processCommand = (command: unknown) => {
            if (!Array.isArray(command) || typeof command[0] !== 'string' || command[0] === 'invoke') {
                return;
            }
            const name = command[0];
            if (hasOwn(methods, name) && typeof methods[name] === 'function') {
                try {
                    // a spread call would need a Babel helper which is not in the built resources
                    // eslint-disable-next-line prefer-spread
                    methods[name].apply(methods, command.slice(1));
                } catch (e) {
                    // ignore invalid arguments of the page
                }
            }
        };
        Object.defineProperty(array, 'push', {
            configurable: true,
            writable: true,
            value(...commands: unknown[]) {
                commands.forEach((command) => {
                    if (isQueueRun) {
                        processCommand(command);
                    } else {
                        queued.push(command);
                    }
                });
                return array.length;
            },
        });
        const runQueued = () => {
            while (queued.length > 0) {
                processCommand(queued.shift());
            }
            isQueueRun = true;
        };
        return { array, runQueued };
    };

    if (typeof cX.getUserId !== 'function') {
        installed = true;
        const api: AnyRecord = {};
        // Methods of the real cx.js 3.6.0 which do nothing here; some are replaced below.
        const METHODS = [
            'initializePage', 'initCampaignReporting', 'requireConsent', 'isConsentRequired', 'setConsent',
            'allUserConsents', 'hasConsent', 'ignoreConsentCache', 'isConsentCacheIgnored', 'setupIabCmp',
            'setAllConsentsTo', 'setupTcfApi', 'requireTcf20', 'setRestrictionsToConsentClasses', 'getSiteId',
            'getAccountId', 'setSiteId', 'setAccountId', 'setGeoPosition', 'requireOnlyFirstPartyIds',
            'requireSecureCookies', 'makeUrlEndpoint', 'addExternalId', 'setCustomParameters',
            'clearCustomParameters', 'setRetargetingParameters', 'setUserProfileParameters',
            'startSessionAnnotation', 'stopSessionAnnotation', 'stopAllSessionAnnotations', 'isRecsDestination',
            'isCompatModeActive', 'setCompatMode', 'isSafari', 'isFirefox', 'isIE6Or7', 'isEdge', 'isTopWindow',
            'isArray', 'isObject', 'hasPostMessage', 'hasLocalStorage', 'hasHistory', 'hasSessionStorage',
            'hasPassiveEventListeners', 'isPageViewReported', 'sendPageViewEvent', 'sendActivityEvent',
            'sendARIEvent', 'getSessionId', 'getUserId', 'getCxenseUserId', 'clearIds', 'onClearIds',
            'getPageContext', 'getRandomString', 'getRandomId', 'setRandomId', 'getNowSeconds',
            'setEventAttributes', 'sendEvent', 'getUserSegmentIds', 'getSegments', 'getTimezoneOffset',
            'setCookie', 'getCookie', 'deleteCookie', 'getTopLevelDomain', 'renderTemplate', 'isTextNode',
            'getNodeValue', 'setNodeValue', 'loadScript', 'jsonpRequest', 'getAllText', 'createDelegate',
            'combineKeywordsIntoArray', 'combineArgs', 'trim', 'parseMargins', 'getHashFragment',
            'parseHashArgs', 'parseUrlArgs', 'sendSpaRecsClick', 'clickTracker', 'renderContainedImage',
            'addEventListener', 'removeEventListener', 'decodeUrlEncodedNameValuePairs', 'postMessageToParent',
            'calculateAdSpaceSize', 'insertWidget', 'insertAdSpace', 'insertMultipleAdSpaces', 'trackElement',
            'isAmpIFrame', 'trackAmpIFrame', 'getElementPosition', 'getWindowSize', 'getDocumentSize',
            'getScrollPos', 'reportActivity', 'requireActivityEvents', 'shouldPollActivity', 'setupPolling',
            'stopPolling', 'cint', 'prebid', 'sync', 'decrypt', 'invoke', 'getClientStorageVariable',
            'setClientStorageVariable', 'removeClientStorageVariable', 'startLocalStats', 'getLocalStats',
            'defaultAdRenderer',
        ];
        METHODS.forEach((name) => {
            api[name] = noopFunc;
        });

        let siteId = '';
        let accountId = '';
        let consentRequired = false;
        let consentVersion = 1;
        const consents: Record<string, boolean> = {};
        api.setSiteId = (id: unknown) => {
            siteId = String(id);
        };
        api.getSiteId = () => siteId;
        api.setAccountId = (id: unknown) => {
            accountId = String(id);
        };
        api.getAccountId = () => accountId;
        // as the library for a visitor without an id, e.g. without consent
        api.getUserId = () => null;
        api.getCxenseUserId = () => null;
        api.getSessionId = () => '';
        api.getRandomString = () => '';
        api.getRandomId = () => '';
        api.getPageContext = () => ({ pageViewRandom: '', userId: '', location: w.location.href });
        api.getLocalStats = () => ({ prevSessionStartTime: new Date(), currSessionStartTime: new Date() });

        // Utilities of the library, which only compute their results, so that code of the page
        // which uses a result, e.g. `cX.parseUrlArgs().id`, does not throw.
        /**
         * Returns the name-value pairs of a query string or a hash fragment, as the library:
         * the values of a name which is repeated are an array, and a pair which cannot be decoded is skipped.
         *
         * @param value Query string or hash fragment, e.g. `?a=1&b=2`.
         * @returns Object.
         */
        const decodePairs = (value: unknown): AnyRecord => {
            const result: AnyRecord = {};
            if (typeof value !== 'string') {
                return result;
            }
            value.replace(/\?/, '').replace(/#/, '').split('&').forEach((pair) => {
                const parts = pair.split('=');
                if (parts.length !== 2) {
                    return;
                }
                let key: string;
                let pairValue: string;
                try {
                    key = decodeURIComponent(parts[0]);
                    pairValue = decodeURIComponent(parts[1]);
                } catch (e) {
                    return;
                }
                if (!hasOwn(result, key)) {
                    result[key] = pairValue;
                } else {
                    if (!Array.isArray(result[key])) {
                        result[key] = [result[key]];
                    }
                    result[key].push(pairValue);
                }
            });
            return result;
        };
        const getHashFragment = (url?: unknown): string => {
            const value = typeof url === 'string' && url !== '' ? url : w.location.href;
            const index = value.indexOf('#');
            return index > -1 ? value.slice(index + 1) : '';
        };
        api.decodeUrlEncodedNameValuePairs = decodePairs;
        api.getHashFragment = getHashFragment;
        api.parseUrlArgs = (search?: unknown) => {
            return decodePairs(typeof search === 'string' && search !== '' ? search : w.location.search);
        };
        api.parseHashArgs = (url?: unknown) => decodePairs(getHashFragment(url));
        api.trim = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
        // the arguments of the call are followed by the bound ones, as in the library
        api.createDelegate = (thisArg: unknown, fn: unknown, ...bound: unknown[]) => {
            return function delegate(...args: unknown[]) {
                return typeof fn === 'function' ? fn.apply(thisArg, args.concat(bound)) : undefined;
            };
        };
        // `isObject()` of the library, i.e. not an array
        const isPlainObject = (value: unknown): value is AnyRecord => isObject(value) && !Array.isArray(value);
        // keys which the library does not copy, as they would change the prototype of the result
        const RESERVED_KEYS = ['__proto__', 'prototype', 'constructor'];
        /**
         * Copies the own properties of the object to the target, as the library: objects are merged
         * into new objects, arrays are appended to new arrays, so the object is not changed later.
         *
         * @param target Object to copy to.
         * @param object Object of the page.
         * @returns Target.
         */
        const merge = (target: AnyRecord, object: AnyRecord): AnyRecord => {
            Object.keys(object).forEach((key) => {
                if (RESERVED_KEYS.indexOf(key) !== -1) {
                    return;
                }
                const value = object[key];
                if (isPlainObject(value)) {
                    if (!isPlainObject(target[key])) {
                        target[key] = {};
                    }
                    merge(target[key], value);
                } else if (Array.isArray(value)) {
                    if (!Array.isArray(target[key])) {
                        target[key] = [];
                    }
                    value.forEach((item) => target[key].push(item));
                } else {
                    target[key] = value;
                }
            });
            return target;
        };
        api.combineArgs = (...objects: unknown[]) => {
            const result: AnyRecord = {};
            objects.forEach((object) => {
                if (isObject(object)) {
                    merge(result, object);
                }
            });
            return result;
        };
        api.combineKeywordsIntoArray = (...values: unknown[]) => {
            const result: string[] = [];
            const add = (value: unknown) => {
                if (typeof value === 'string' && result.indexOf(value) === -1) {
                    result.push(value);
                }
            };
            values.forEach((value) => (Array.isArray(value) ? value.forEach(add) : add(value)));
            return result;
        };
        // as the library: strings of the value and of the objects in it, but not of the arrays in it
        const getAllText = (value: unknown): string => {
            if (typeof value === 'string') {
                return value;
            }
            let text = '';
            if (isObject(value)) {
                Object.keys(value).forEach((key) => {
                    const item = value[key];
                    text += typeof item === 'string' || isPlainObject(item) ? getAllText(item) : '';
                });
            }
            return text;
        };
        api.getAllText = getAllText;
        api.isArray = (value: unknown) => Array.isArray(value);
        api.isObject = isPlainObject;
        api.isTopWindow = () => w.top === w.self;
        api.getNowSeconds = () => Math.round(Date.now() / 1000);
        api.getTimezoneOffset = () => new Date().getTimezoneOffset();
        api.getWindowSize = () => ({ width: w.innerWidth, height: w.innerHeight });
        api.getDocumentSize = () => {
            const root = doc.documentElement || {};
            const body = doc.body || {};
            return {
                width: Math.max(
                    root.clientWidth || 0,
                    body.scrollWidth || 0,
                    root.scrollWidth || 0,
                    body.offsetWidth || 0,
                    root.offsetWidth || 0,
                ),
                height: Math.max(
                    root.clientHeight || 0,
                    body.scrollHeight || 0,
                    root.scrollHeight || 0,
                    body.offsetHeight || 0,
                    root.offsetHeight || 0,
                ),
            };
        };
        api.getScrollPos = () => ({ left: w.scrollX, top: w.scrollY });
        api.getElementPosition = (element: unknown) => {
            const position = { left: 0, top: 0 };
            let current = element as HTMLElement | null;
            // as the library: offsets of the element and of its offset parents, if it has one
            if (current && current.offsetParent) {
                while (current) {
                    position.left += current.offsetLeft || 0;
                    position.top += current.offsetTop || 0;
                    current = current.offsetParent as HTMLElement | null;
                }
            }
            return position;
        };

        api.requireConsent = (value?: unknown) => {
            // as the library: required unless `false` is passed, a number is the version of the consent
            consentRequired = value !== false;
            consentVersion = typeof value === 'number' ? value : 1;
        };
        api.isConsentRequired = () => consentRequired;
        api.setConsent = (values: unknown) => {
            if (isObject(values)) {
                Object.keys(values).forEach((key) => {
                    consents[key] = !!values[key];
                });
            }
        };
        api.allUserConsents = () => {
            const copy: Record<string, boolean> = {};
            Object.keys(consents).forEach((key) => {
                copy[key] = consents[key];
            });
            return copy;
        };
        // as the library: only the consents which the page has set, whether the consent is required or not,
        // except for `geo` and `device`, which are consents of the version 2 only
        api.hasConsent = (purpose: unknown) => {
            const name = String(purpose);
            if (consentVersion !== 2 && (name === 'geo' || name === 'device')) {
                return true;
            }
            return consents[name] === true;
        };
        api.isPageViewReported = () => false;
        api.isRecsDestination = () => false;
        api.isCompatModeActive = () => false;

        /**
         * Returns a cookie of the page, as `cX.getCookie()`; no cookies are written.
         *
         * @param name Cookie name.
         * @returns Cookie value, or `null` if there is none.
         */
        api.getCookie = (name: unknown): string | null => {
            let cookies: string[] = [];
            try {
                cookies = doc.cookie ? doc.cookie.split('; ') : [];
            } catch (e) {
                // cookies may not be available, e.g. in a sandboxed frame
            }
            for (let i = 0; i < cookies.length; i += 1) {
                const index = cookies[i].indexOf('=');
                if (index !== -1 && cookies[i].slice(0, index) === String(name)) {
                    const value = cookies[i].slice(index + 1);
                    try {
                        return decodeURIComponent(value);
                    } catch (e) {
                        return value;
                    }
                }
            }
            return null;
        };

        /**
         * Returns the segments of the visitor, as `cX.getUserSegmentIds()` of the library
         * without the segment consent: the callback is called at once with the default value,
         * or an empty array, and an empty array is returned.
         *
         * @param options Options of the page, e.g. `{ persistedQueryId, callback, defaultValue }`.
         * @returns Empty array.
         */
        api.getUserSegmentIds = (options: unknown): unknown[] => {
            if (isObject(options)) {
                runProtected(options.callback, [Array.isArray(options.defaultValue) ? options.defaultValue : []]);
            }
            return [];
        };

        /**
         * Calls the callback with no segments, as `cX.getSegments()` after its request,
         * i.e. asynchronously. The callback is passed as the second argument, or in an object.
         *
         * @param query Persisted query id, or an object with it and the callback.
         * @param callback Callback of the page.
         */
        api.getSegments = (query: unknown, callback?: unknown) => {
            const onSegments = isObject(query) ? query.callback : callback;
            if (typeof onSegments === 'function') {
                w.setTimeout(() => runProtected(onSegments, [[]]), 0);
            }
        };

        let jsonpCounter = 0;
        /**
         * Answers a JSONP request as `cX.jsonpRequest()` of the library, but only of the Cxense site search,
         * which is sent with `fetch()` as a JSON request without cookies and a referrer, so that no code
         * of the response is run: the callback named in the URL, i.e. the one of this call
         * for `{{callback}}`, or a global function of the page, is called with the parsed response
         * wrapped as the JSONP one, `{ httpStatus, response }`.
         * Any other request behaves as a failed one: nothing is sent, and the callback is called only
         * with no arguments after `options.timeout` milliseconds, if it is set.
         *
         * @param url URL of the request, in which `{{callback}}` is replaced with the name of the callback.
         * @param callback Callback of the page, called with the response.
         * @param options Options of the page, e.g. `{ timeout }`.
         */
        api.jsonpRequest = (url: unknown, callback?: unknown, options?: unknown) => {
            const settings = isObject(options) ? options : {};
            jsonpCounter += 1;
            const name = `cXJsonpCB${jsonpCounter}`;
            const requestUrl = typeof url === 'string'
                ? url.replace(/\{\{callback\}\}/, encodeURIComponent(name))
                : '';
            let timeoutId: number | undefined;
            const onResponse = function onResponse(...args: unknown[]) {
                if (timeoutId !== undefined) {
                    w.clearTimeout(timeoutId);
                }
                w[name] = noopFunc;
                runProtected(callback, args);
            };
            w[name] = onResponse;
            // as the library, there is no timeout for a falsy value, e.g. `0`, with which the callback
            // would be called at once, without the response
            if (settings.timeout) {
                timeoutId = w.setTimeout(() => onResponse(), settings.timeout);
            }
            const request = getCxenseSearchRequest(requestUrl);
            if (!request || typeof w.fetch !== 'function') {
                return;
            }
            const { callbackName } = request;
            try {
                // a redirect is an error, so that the response is always of the search of Cxense
                w.fetch(request.url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
                    .then((response: Response) => response.text().then((text: string) => {
                        // as the JSONP response, which wraps the JSON one with the HTTP status of the request,
                        // e.g. `{ httpStatus: 400, response: { error: '...' } }`
                        const data = { httpStatus: response.status, response: JSON.parse(text) };
                        // the global function may be replaced meanwhile, e.g. with a no-op after a timeout
                        runProtected(w[callbackName], [data]);
                    }))
                    .catch(() => {
                        // as a failed request: the callback is called only after its timeout
                    });
            } catch (e) {
                // e.g. `fetch()` replaced by the page; as a failed request
            }
        };

        const WIDGET_ID_REGEXP = /^[0-9a-f]{40}$/;
        const WIDGET_CONTAINER_ID_REGEXP = /^(?:cx_|cxense-)([0-9a-f]{40})$/;
        const WIDGET_CONTAINER_SELECTOR = '[id^="cx_"], [id^="cxense-"]';
        const WIDGET_STYLE = ':host{display:block;margin:0;padding:0;font-size:14px;font-style:normal;'
            + 'font-weight:normal;line-height:1.4;letter-spacing:normal;text-align:start;text-indent:0;'
            + 'text-transform:none;white-space:normal;word-spacing:normal}'
            + 'ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));'
            + 'gap:12px 20px;margin:0;padding:0;list-style:none}'
            + 'li{margin:0;padding:0;min-width:0}'
            + 'a{display:flex;align-items:flex-start;gap:10px;color:inherit;text-decoration:none}'
            + 'a:hover span,a:focus-visible span{text-decoration:underline}'
            + 'img{flex:none;width:96px;height:64px;border-radius:4px;object-fit:cover;'
            + 'background:rgba(128,128,128,.15)}'
            + 'span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;'
            + 'overflow-wrap:anywhere}';
        // elements which cannot show a widget, or whose content is not a placeholder, e.g. the text
        // of a `textarea`; such an element may be named as a widget, e.g. a `script` of its snippet
        const NOT_WIDGET_CONTAINERS = [
            'SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'TITLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON',
            'IMG', 'IFRAME', 'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'BR', 'HR', 'META', 'LINK',
        ];
        const MAX_PAGE_IMAGES = 500;
        const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
        const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
        const IMAGE_ROOT_MARGIN = '200px';
        const MAX_PENDING_WIDGETS = 50;
        const WIDGET_SEARCH_DELAY_MS = 50;
        const WIDGET_WATCH_AFTER_LOAD_MS = 10000;
        // widgets requested for an element: each one is requested once, also if no item is shown
        const widgetsOfElements = new WeakMap<Element, WidgetRecord[]>();
        // elements for which an error of showing a widget is logged
        const failedElements = new WeakSet<Element>();
        // widgets which the page has requested for elements which are not in the page yet
        let pendingWidgets: { widgetId: string; targetId: string; place: WidgetPlace }[] = [];
        // while elements are watched, i.e. also when the commands queued by the page are processed
        let isWatchingWidgets = typeof w.fetch === 'function' && typeof w.MutationObserver === 'function';
        let widgetStyleSheet: unknown;
        // images of the links which are not near the viewport yet
        const imagesOfLinks = new WeakMap<Element, string>();
        let imageObserver: IntersectionObserver | null | undefined;
        // whether images of an origin can be requested, and the images which wait for the answer
        const imageHosts: Record<string, { state: string; waiting: { link: Element; url: string }[] }> = {};

        /**
         * Returns the hosts of the images of the page, from which images of widget items may be requested
         * as well. Images of the widgets are in shadow trees, so they are not counted.
         *
         * @returns Host names.
         */
        const getPageImageHosts = (): string[] => {
            const hosts: string[] = [];
            const images = doc.images;
            for (let i = 0; i < images.length && i < MAX_PAGE_IMAGES; i += 1) {
                try {
                    const { hostname } = new URL(images[i].currentSrc || images[i].src);
                    if (hostname !== '' && hosts.indexOf(hostname) === -1) {
                        hosts.push(hostname);
                    }
                } catch (e) {
                    // an image without a source
                }
            }
            return hosts;
        };

        /**
         * Requests the image of an item and shows it in its link, before the title. The image is requested
         * with `fetch()`, without cookies and a referrer, and a redirect is an error, as an `img` element
         * would follow it to any host, with the cookies of that host. So it is shown only if it is
         * of the origin of the page, or if its host allows cross-origin requests, and the link has
         * only its title otherwise. Only an image of a raster type and of a limited size is shown.
         *
         * @param link Link of the item.
         * @param url URL of the image, of an allowed host.
         * @param onResult Called with `false` if the request has failed, e.g. is not allowed by the host,
         * and with `true` if it is answered.
         */
        const requestImage = (link: Element, url: string, onResult: (isAnswered: boolean) => void) => {
            let isReported = false;
            const report = (isAnswered: boolean) => {
                if (!isReported) {
                    isReported = true;
                    onResult(isAnswered);
                }
            };
            try {
                w.fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
                    .then((response: Response) => {
                        report(true);
                        const length = Number(response.headers.get('content-length'));
                        return response.ok && !(length > MAX_IMAGE_BYTES) ? response.blob() : null;
                    })
                    .then((blob: Blob | null) => {
                        if (!blob
                            || blob.size === 0
                            || blob.size > MAX_IMAGE_BYTES
                            || IMAGE_TYPES.indexOf(blob.type.split(';')[0].trim().toLowerCase()) === -1) {
                            return;
                        }
                        const objectUrl = w.URL.createObjectURL(blob);
                        const image = doc.createElement('img');
                        image.alt = '';
                        image.decoding = 'async';
                        image.addEventListener('load', () => {
                            w.URL.revokeObjectURL(objectUrl);
                            link.insertBefore(image, link.firstChild);
                        });
                        // e.g. not an image, or `blob:` is not allowed by a Content Security Policy
                        image.addEventListener('error', () => w.URL.revokeObjectURL(objectUrl));
                        image.src = objectUrl;
                    })
                    .catch(() => report(false));
            } catch (e) {
                report(false);
            }
        };

        /**
         * Requests the image of an item, unless images of its host cannot be requested. One image
         * of a host of another origin is requested first, and the other ones only when it is answered,
         * as each request which the host does not allow is logged by the browser as an error.
         *
         * @param link Link of the item.
         * @param url URL of the image, of an allowed host.
         */
        const loadImage = (link: Element, url: string) => {
            let origin = '';
            try {
                origin = new URL(url).origin;
            } catch (e) {
                return;
            }
            if (origin === w.location.origin) {
                requestImage(link, url, noopFunc);
                return;
            }
            const host = hasOwn(imageHosts, origin) ? imageHosts[origin] : { state: 'new', waiting: [] };
            imageHosts[origin] = host;
            if (host.state === 'allowed') {
                requestImage(link, url, noopFunc);
            } else if (host.state === 'pending') {
                host.waiting.push({ link, url });
            } else if (host.state === 'new') {
                host.state = 'pending';
                requestImage(link, url, (isAnswered) => {
                    host.state = isAnswered ? 'allowed' : 'refused';
                    const waiting = host.waiting.splice(0, host.waiting.length);
                    if (isAnswered) {
                        waiting.forEach((image) => requestImage(image.link, image.url, noopFunc));
                    }
                });
            }
        };

        /**
         * Requests the image of an item when its link is near the viewport, as a lazy image,
         * or at once where it cannot be observed.
         *
         * @param link Link of the item.
         * @param url URL of the image, of an allowed host.
         */
        const showImageWhenVisible = (link: Element, url: string) => {
            if (imageObserver === undefined) {
                try {
                    imageObserver = new w.IntersectionObserver((entries: IntersectionObserverEntry[]) => {
                        entries.forEach((entry) => {
                            const imageUrl = imagesOfLinks.get(entry.target);
                            if (entry.isIntersecting && imageUrl !== undefined) {
                                imagesOfLinks.delete(entry.target);
                                (imageObserver as IntersectionObserver).unobserve(entry.target);
                                loadImage(entry.target, imageUrl);
                            }
                        });
                    }, { rootMargin: IMAGE_ROOT_MARGIN });
                } catch (e) {
                    imageObserver = null;
                }
            }
            if (imageObserver) {
                imagesOfLinks.set(link, url);
                imageObserver.observe(link);
            } else {
                loadImage(link, url);
            }
        };

        /**
         * Checks whether a widget can be shown in the element: an HTML element of the body, or the body,
         * which can contain a list and whose content is a placeholder, e.g. not a `script`
         * or an element of an SVG image, nor an element of the head or the root element.
         * An element which the page has removed, e.g. to add it again, can contain it as well,
         * so the widget is in it when it is back in the page.
         *
         * @param element Element.
         * @returns `true` if a widget can be shown in it.
         */
        const canContainWidget = (element: Element | null): element is Element => {
            return !!element
                && element.namespaceURI === 'http://www.w3.org/1999/xhtml'
                && NOT_WIDGET_CONTAINERS.indexOf(element.tagName.toUpperCase()) === -1
                && (!doc.contains(element) || (!!doc.body && doc.body.contains(element)));
        };

        /**
         * Returns the element in which the widget is shown for its element.
         *
         * @param target Element of the widget.
         * @param place Where the widget is shown for the element.
         * @returns Element, or `null` if the widget cannot be shown there.
         */
        const getWidgetContainer = (target: Element, place: WidgetPlace): Element | null => {
            const container = place === 'before' ? target.parentElement : target;
            return canContainWidget(container) ? container : null;
        };

        /**
         * Releases the elements of a widget which the page requests, as it is not moved anymore,
         * so that neither the widget nor the content which it has replaced is kept when they are removed.
         *
         * @param record Widget.
         */
        const releaseWidget = (record: WidgetRecord) => {
            record.host = null;
            record.node = null;
            record.replaced = [];
            record.seen = [];
            record.seenValues = [];
        };

        /**
         * Remembers the child nodes of the element, and their values, as the resource has seen them.
         *
         * @param record Widget.
         * @param nodes Child nodes of the element.
         */
        const setSeenContent = (record: WidgetRecord, nodes: ArrayLike<Node>) => {
            record.seen = Array.prototype.slice.call(nodes);
            record.seenValues = record.seen.map((node) => node.nodeValue);
        };

        /**
         * Checks whether the element has the child nodes which the resource has seen in it last,
         * i.e. the page has not changed its content since. The nodes are compared by identity,
         * so text which the page has set again is a change as well, and by their values,
         * e.g. the text of a text node which the page has changed in the node.
         *
         * @param target Element of the widget.
         * @param record Widget.
         * @returns `true` if the content is not changed.
         */
        const hasSeenContent = (target: Element, record: WidgetRecord): boolean => {
            const nodes = target.childNodes;
            if (nodes.length !== record.seen.length) {
                return false;
            }
            for (let i = 0; i < nodes.length; i += 1) {
                if (nodes[i] !== record.seen[i] || nodes[i].nodeValue !== record.seenValues[i]) {
                    return false;
                }
            }
            return true;
        };

        /**
         * Checks whether the element is still the empty element in which the widget was found:
         * it is named after the widget, and the page has not changed its content since.
         *
         * @param target Element of the widget.
         * @param record Widget.
         * @returns `true` if the widget may be shown in the element.
         */
        const isFoundElement = (target: Element, record: WidgetRecord): boolean => {
            const match = WIDGET_CONTAINER_ID_REGEXP.exec(target.id);
            return !!match && match[1] === record.widgetId && hasSeenContent(target, record);
        };

        /**
         * Places the widget for its element, at its place: instead of the content of the element,
         * after its content, or before the element. The content which it replaces is kept in the record,
         * so that it is restored if the widget is moved. A widget which the page has not requested,
         * i.e. which is found in an empty element named after it, is shown only if the page has changed
         * neither the content nor the name of the element since, so that e.g. a message of the page
         * is not replaced, and a widget is not shown in an element which is used for another one.
         *
         * @param target Element of the widget.
         * @param record Widget.
         */
        const placeWidget = (target: Element, record: WidgetRecord) => {
            const { host, place } = record;
            if (!host || (!record.isRequested && !isFoundElement(target, record))) {
                return;
            }
            // e.g. no parent of the element before which the widget is inserted
            const container = getWidgetContainer(target, place);
            if (!container) {
                return;
            }
            if (place === 'into') {
                while (target.firstChild) {
                    const child = target.removeChild(target.firstChild);
                    // only a widget found in an empty element may be moved later, with its content restored
                    if (!record.isRequested) {
                        record.replaced.push(child);
                    }
                }
            }
            let widget: Element = host;
            if (container.tagName === 'UL' || container.tagName === 'OL') {
                const wrapper = doc.createElement('li');
                wrapper.style.listStyle = 'none';
                wrapper.appendChild(host);
                widget = wrapper;
            }
            container.insertBefore(widget, place === 'before' ? target : null);
            record.node = widget;
            if (record.isRequested) {
                releaseWidget(record);
            } else {
                setSeenContent(record, [widget]);
            }
        };

        /**
         * Shows the widget which was found in an empty element named after it at the place which
         * the page requests, e.g. before a hidden element which the page names as the element before which
         * the widget is inserted. If it is shown in the element, it is moved, and the content which it has
         * replaced is restored, unless the page has changed the content of the element meanwhile.
         * If the widget is not received yet, it is shown at the new place when its items are received.
         *
         * @param target Element of the widget.
         * @param record Widget.
         * @param place New place.
         */
        const moveWidget = (target: Element, record: WidgetRecord, place: WidgetPlace) => {
            record.place = place;
            const { node, replaced } = record;
            // the content is restored only if the element has not been changed by the page meanwhile,
            // i.e. it has only the widget, as the resource has shown it
            const isUnchanged = !!node && hasSeenContent(target, record);
            record.node = null;
            record.replaced = [];
            record.seen = [];
            record.seenValues = [];
            // not shown yet: it is shown at the new place when its items are received
            if (!record.host) {
                return;
            }
            if (node && node.parentNode) {
                node.parentNode.removeChild(node);
            }
            if (isUnchanged) {
                replaced.forEach((child) => target.appendChild(child));
            }
            placeWidget(target, record);
        };

        /**
         * Creates the list of links of the items. The list is in a shadow tree, so that neither styles
         * of the page change it, nor its styles the page. Its style is a constructed style sheet, which
         * a Content Security Policy of the page does not block, or a `style` element where it is not supported.
         *
         * @param items Items to show.
         * @returns Element of the widget, whose shadow tree has the list.
         */
        const createWidget = (items: CxenseWidgetItem[]): Element => {
            const host = doc.createElement('div');
            const root = host.attachShadow({ mode: 'open' });
            if (widgetStyleSheet === undefined) {
                try {
                    widgetStyleSheet = new w.CSSStyleSheet();
                    (widgetStyleSheet as CSSStyleSheet).replaceSync(WIDGET_STYLE);
                } catch (e) {
                    widgetStyleSheet = null;
                }
            }
            let isStyled = false;
            if (widgetStyleSheet) {
                try {
                    root.adoptedStyleSheets = [widgetStyleSheet];
                    isStyled = true;
                } catch (e) {
                    // not supported
                }
            }
            if (!isStyled) {
                const style = doc.createElement('style');
                style.textContent = WIDGET_STYLE;
                root.appendChild(style);
            }
            const list = doc.createElement('ul');
            items.forEach((item) => {
                const listItem = doc.createElement('li');
                const link = doc.createElement('a');
                link.href = item.url;
                const title = doc.createElement('span');
                title.textContent = item.title;
                link.appendChild(title);
                listItem.appendChild(link);
                list.appendChild(listItem);
                if (item.image !== null) {
                    showImageWhenVisible(link, item.image);
                }
            });
            root.appendChild(list);
            return host;
        };

        /**
         * Requests the items of the widget by its id only, without cookies and without a referrer,
         * and shows them for the element. It is done once for the widget and the element.
         * Nothing is changed if the request fails, e.g. if it is blocked, or if no item is to be shown.
         * A widget which the page requests for an element in which it has been found as an empty element
         * named after the widget is moved to the place which the page requests, without a new request.
         * A widget whose items are received while it cannot be shown, e.g. while the element before which
         * it is inserted is out of the page, is shown when the page requests it again, also without
         * a new request.
         *
         * @param widgetId Id of the widget, 40 hexadecimal digits.
         * @param target Element of the widget.
         * @param place Where the widget is shown for the element.
         * @param isRequested Whether the page requests it, i.e. it is not only an empty element named after it.
         */
        const showWidget = (widgetId: string, target: Element, place: WidgetPlace, isRequested: boolean) => {
            const records = widgetsOfElements.get(target) || [];
            for (let i = 0; i < records.length; i += 1) {
                const shown = records[i];
                if (shown.widgetId === widgetId) {
                    if (!isRequested) {
                        // found again, e.g. the element is named after the widget again, while it has been
                        // received for another name; it is shown if the content is still the one seen
                        if (shown.host && !shown.node) {
                            placeWidget(target, shown);
                        }
                        return;
                    }
                    if (!shown.isRequested) {
                        // found in the empty element before the page has requested it
                        shown.isRequested = true;
                        if (shown.place === place && !!shown.node && shown.node.parentNode === target) {
                            // already where the page requests it, so it is not moved anymore
                            releaseWidget(shown);
                        } else {
                            // also if it is not shown, e.g. as the page has changed the element meanwhile
                            moveWidget(target, shown, place);
                        }
                    } else if (shown.host && !shown.node) {
                        // received while it could not be shown, e.g. while the element before which
                        // it is inserted was out of the page, so it is shown when the page requests it again
                        shown.place = place;
                        placeWidget(target, shown);
                    }
                    return;
                }
            }
            // also if the widget cannot be shown there, so that e.g. a hidden element before which
            // the page shows the widget is not taken for an empty element named after it
            const record: WidgetRecord = {
                widgetId,
                place,
                isRequested,
                host: null,
                node: null,
                replaced: [],
                seen: [],
                seenValues: [],
            };
            if (!isRequested) {
                setSeenContent(record, target.childNodes);
            }
            records.push(record);
            widgetsOfElements.set(target, records);
            if (!getWidgetContainer(target, place)) {
                return;
            }
            const onError = (e: unknown) => {
                logMessage(source, `Widget ${widgetId} is not shown: ${getThrownValueMessage(e)}`);
            };
            try {
                // the JSON is not built by `JSON.stringify()`, so that the URL is always the documented one
                const json = encodeURIComponent(`{"widgetId":"${widgetId}"}`);
                w.fetch(`https://api.cxense.com/public/widget/data?json=${json}`, {
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    redirect: 'error',
                })
                    .then((response: Response) => {
                        if (!response.ok) {
                            logMessage(source, `Widget ${widgetId} is not shown: status ${response.status}`);
                            return null;
                        }
                        return response.json();
                    })
                    .then((data: unknown) => {
                        if (data === null) {
                            return;
                        }
                        const items = getCxenseWidgetItems(data, w.location.href, getPageImageHosts());
                        if (items.length > 0) {
                            record.host = createWidget(items);
                            // at the place of the record, which may have been changed meanwhile
                            placeWidget(target, record);
                        }
                    })
                    .catch(onError);
            } catch (e) {
                onError(e);
            }
        };

        /**
         * Logs an error of showing the widget of an element once for the element.
         *
         * @param element Element of the widget.
         * @param e Thrown value.
         */
        const logElementError = (element: Element, e: unknown) => {
            if (!failedElements.has(element)) {
                failedElements.add(element);
                logMessage(source, `Widget of #${element.id} is not shown: ${getThrownValueMessage(e)}`);
            }
        };

        /**
         * Shows the widgets of the elements which are in the page: the ones which the page has requested
         * before their elements were added, and the ones of empty elements named after a widget,
         * i.e. without child elements, whose text, e.g. `Loading`, is replaced. Such a widget is requested
         * once for the element and the name, and not if the page requests a widget for the element itself,
         * e.g. another one than the element is named after.
         * An error for one element does not stop the others.
         */
        const findWidgets = () => {
            pendingWidgets = pendingWidgets.filter((pending) => {
                const target = doc.getElementById(pending.targetId);
                if (!target) {
                    return true;
                }
                try {
                    showWidget(pending.widgetId, target, pending.place, true);
                } catch (e) {
                    logElementError(target, e);
                }
                return false;
            });
            const containers = doc.querySelectorAll(WIDGET_CONTAINER_SELECTOR);
            for (let i = 0; i < containers.length; i += 1) {
                const container = containers[i];
                try {
                    const match = WIDGET_CONTAINER_ID_REGEXP.exec(container.id);
                    if (!match || container.firstElementChild || !canContainWidget(container)) {
                        continue;
                    }
                    const records = widgetsOfElements.get(container);
                    // not if the page requests a widget for the element itself;
                    // a widget which is already found in the element is not requested again
                    if (!records || !records.some((record) => record.isRequested)) {
                        showWidget(match[1], container, 'into', false);
                    }
                } catch (e) {
                    logElementError(container, e);
                }
            }
        };

        /**
         * Shows the widget which the page requests for an element, but without its callbacks
         * and render function. If the element is not in the page yet, the widget is shown
         * when it is added, while elements are watched.
         *
         * @param widgetId Id of the widget of the page.
         * @param targetId Id of the element of the page.
         * @param place Where the widget is shown for the element.
         */
        const requestWidgetFor = (widgetId: unknown, targetId: unknown, place: WidgetPlace) => {
            if (typeof widgetId !== 'string'
                || !WIDGET_ID_REGEXP.test(widgetId)
                || typeof targetId !== 'string'
                || targetId === '') {
                return;
            }
            const target = doc.getElementById(targetId);
            if (target) {
                showWidget(widgetId, target, place, true);
            } else if (isWatchingWidgets
                && pendingWidgets.length < MAX_PENDING_WIDGETS
                // e.g. requested again on each render of the page
                && !pendingWidgets.some((pending) => pending.widgetId === widgetId && pending.targetId === targetId)) {
                pendingWidgets.push({ widgetId, targetId, place });
            }
        };

        /**
         * Shows the widget which the page requests with `cX.CCE`, which shows it instead of the content
         * of its `targetElementId`, or of the given element.
         *
         * @param params Parameters of the page, e.g. `{ widgetId, targetElementId }`.
         * @param elementId Id of the element, if it is not in the parameters.
         */
        requestWidget = (params: unknown, elementId?: unknown) => {
            if (isObject(params)) {
                const targetId = typeof elementId === 'string' ? elementId : params.targetElementId;
                requestWidgetFor(params.widgetId, targetId, 'into');
            }
        };

        /**
         * Shows the widget which the page requests with `cX.insertWidget()`, at the place of the library.
         * The library shows a widget with a template, i.e. `renderTemplateUrl` or `useMappedRenderTemplate`,
         * in a frame which it adds to the page: after the content of `appendToElementId` if it is set,
         * or before `insertBeforeElementId` or `targetElementId`, e.g. a hidden element of the snippet
         * of the widget. Another widget is shown by a function of the page, e.g. of `cX.CCE`,
         * in `targetElementId`, so the list is shown instead of its content.
         *
         * @param params Parameters of the page, e.g. `{ widgetId, insertBeforeElementId, renderTemplateUrl }`.
         */
        api.insertWidget = (params: unknown) => {
            if (!isObject(params)) {
                return;
            }
            if (!params.renderTemplateUrl && !params.useMappedRenderTemplate) {
                requestWidgetFor(params.widgetId, params.targetElementId, 'into');
            } else if (params.appendToElementId) {
                requestWidgetFor(params.widgetId, params.appendToElementId, 'append');
            } else {
                requestWidgetFor(params.widgetId, params.insertBeforeElementId || params.targetElementId, 'before');
            }
        };

        /**
         * Watches for the elements of widgets which are added to the page,
         * until 10 seconds after the page is loaded.
         */
        const watchWidgets = () => {
            if (!isWatchingWidgets) {
                return;
            }
            let isSearchScheduled = false;
            const search = () => {
                isSearchScheduled = false;
                if (!isWatchingWidgets) {
                    return;
                }
                try {
                    findWidgets();
                } catch (e) {
                    logMessage(source, `Widgets cannot be searched: ${getThrownValueMessage(e)}`);
                }
            };
            // changes made by the widgets themselves find nothing more, as their elements are remembered;
            // an element may be named after another widget without other changes of the page
            const observer = new MutationObserver(() => {
                if (!isSearchScheduled) {
                    isSearchScheduled = true;
                    w.setTimeout(search, WIDGET_SEARCH_DELAY_MS);
                }
            });
            observer.observe(doc, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['id'],
            });
            const stopLater = () => {
                w.setTimeout(() => {
                    isWatchingWidgets = false;
                    pendingWidgets = [];
                    observer.disconnect();
                }, WIDGET_WATCH_AFTER_LOAD_MS);
            };
            if (doc.readyState === 'complete') {
                stopLater();
            } else {
                w.addEventListener('load', stopLater, { once: true });
            }
            search();
        };

        api.JSON = {
            stringify: (value: unknown, replacer?: unknown, space?: unknown) => JSON.stringify(
                value,
                replacer as any,
                space as any,
            ),
            parse: (text: string, reviver?: unknown) => JSON.parse(text, reviver as any),
        };
        /**
         * Calls the function for each item of an array or an array-like collection, e.g. a `NodeList`,
         * with the item, its index and the collection, as `cX.Array.forEach()`.
         *
         * @param collection Array or array-like collection; nothing is done for `null` or `undefined`.
         * @param fn Function of the page.
         * @param thisArg Value of `this` for the function.
         */
        const arrayForEach = (collection: any, fn: unknown, thisArg?: unknown) => {
            if (collection === null || collection === undefined || typeof fn !== 'function') {
                return;
            }
            for (let i = 0; i < collection.length; i += 1) {
                fn.call(thisArg, collection[i], i, collection);
            }
        };

        /**
         * Calls the function for each own property of an object with its value, its key and the object,
         * as `cX.Object.forEach()`.
         *
         * @param object Object; nothing is done for `null` or `undefined`.
         * @param fn Function of the page.
         * @param thisArg Value of `this` for the function.
         */
        const objectForEach = (object: any, fn: unknown, thisArg?: unknown) => {
            if (object === null || object === undefined || typeof fn !== 'function') {
                return;
            }
            for (const key in object) {
                if (hasOwn(object, key)) {
                    fn.call(thisArg, object[key], key, object);
                }
            }
        };

        /**
         * Returns the first truthy result of the function for the items, as `some()` of `cX.Array`
         * and `cX.Object`: the result itself, or the last result if none is truthy, `false` for no items.
         *
         * @param forEach Function which iterates the collection.
         * @param collection Collection.
         * @param fn Function of the page.
         * @param thisArg Value of `this` for the function.
         * @returns First truthy result.
         */
        const some = (forEach: typeof arrayForEach, collection: any, fn: unknown, thisArg?: unknown) => {
            let result: unknown = false;
            if (typeof fn !== 'function') {
                return result;
            }
            forEach(collection, (value: unknown, key: unknown) => {
                result = result || fn.call(thisArg, value, key, collection);
            });
            return result;
        };

        api.Array = {
            forEach: arrayForEach,
            some: (collection: unknown, fn: unknown, thisArg?: unknown) => some(arrayForEach, collection, fn, thisArg),
            // as the library, the array is returned, also if the item is not in it
            remove: (array: any, item: unknown) => {
                if (array && typeof array.indexOf === 'function' && typeof array.splice === 'function') {
                    const index = array.indexOf(item);
                    if (index > -1) {
                        array.splice(index, 1);
                    }
                }
                return array;
            },
        };
        api.Object = {
            forEach: objectForEach,
            some: (object: unknown, fn: unknown, thisArg?: unknown) => some(objectForEach, object, fn, thisArg),
            keys: (object: unknown) => {
                const keys: string[] = [];
                objectForEach(object, (value: unknown, key: string) => keys.push(key));
                return keys;
            },
        };
        api.library = { m_rnd: '', m_atfr: null };
        api.consent = {
            get: () => ({}),
            set: noopFunc,
            setByPreset: noopFunc,
            getByPurpose: () => ({}),
            setByPurpose: noopFunc,
            setAllPurposes: noopFunc,
        };
        api.loaded = true;

        const queue = setupQueue(cX.callQueue, api);
        Object.keys(api).forEach((key) => {
            cX[key] = api[key];
        });
        cX.callQueue = queue.array;
        w.cX = cX;
        queuedCommands.push(queue.runQueued);
        startWidgets = watchWidgets;
    }

    const existingCce = cX.CCE;
    if (!isObject(existingCce) || typeof existingCce.run !== 'function') {
        installed = true;
        const cce: AnyRecord = isObject(existingCce) ? existingCce : {};
        const cceApi: AnyRecord = {};
        // Public methods of the real cx.cce.js 2.0.67, which do nothing here, except the ones which
        // show a widget: no events are sent, and callbacks, e.g. of `sendConversionEvent()`, are not called.
        const CCE_METHODS = [
            'sendPageViewEvent', 'init', 'setVisibilityField', 'setSnapPoints', 'getTestGroup',
            'reportTestImpression', 'trackVisibility', 'instrumentClickLinks', 'sendFrequencyEvent',
            'updateRecsClickUrls', 'cXClickTracker', 'cXSendSpaRecsClick', 'clickTracker', 'getDivId',
            'processCxResult', 'displayResult', 'runCxVersion', 'displayWidget', 'runCtrlVersion', 'runTest',
            'render', 'run', 'runMulti', 'insertMaster', 'setTestGroup', 'invoke', 'sendConversionEvent',
        ];
        CCE_METHODS.forEach((name) => {
            cceApi[name] = noopFunc;
        });
        // as the library when no element of a test is found; the library would give the element an id
        cceApi.getDivId = () => null;
        const showRequestedWidget = requestWidget;
        if (showRequestedWidget) {
            // as the library: `run(widgetParams, context, callback)`,
            // `runMulti([{ widgetParams, widgetContext, widgetCallback }])`,
            // `displayWidget(divId, widgetParams, context, callback)`,
            // `runCxVersion(testId, divId, widgetParams, context, callback)`
            cceApi.run = (params: unknown) => showRequestedWidget(params);
            cceApi.runMulti = (widgets: unknown) => {
                if (Array.isArray(widgets)) {
                    widgets.forEach((widget) => {
                        if (isObject(widget)) {
                            showRequestedWidget(widget.widgetParams);
                        }
                    });
                }
            };
            cceApi.displayWidget = (divId: unknown, params: unknown) => showRequestedWidget(params, divId);
            cceApi.runCxVersion = (testId: unknown, divId: unknown, params: unknown) => {
                showRequestedWidget(params, divId);
            };
        }
        const cceQueue = setupQueue(cce.callQueue, cceApi);
        Object.keys(cceApi).forEach((key) => {
            cce[key] = cceApi[key];
        });
        cce.callQueue = cceQueue.array;
        cX.CCE = cce;
        w.cX = cX;
        queuedCommands.push(cceQueue.runQueued);
    }
    // the commands of `cX.callQueue` first, as the library runs the ones of `cX.CCE.callQueue` through it
    queuedCommands.forEach((runQueued) => runQueued());

    // after the queues are processed, so that widgets requested by the page are shown in their elements
    // before empty elements are searched for
    if (startWidgets) {
        startWidgets();
    }

    if (installed) {
        hit(source);
    }
}

export const CxenseNames = [
    'cxense',
];

// eslint-disable-next-line prefer-destructuring
Cxense.primaryName = CxenseNames[0];

Cxense.injections = [
    getCxenseSearchRequest,
    getCxenseWidgetItems,
    getThrownValueMessage,
    hit,
    logMessage,
    noopFunc,
    runProtected,
];
