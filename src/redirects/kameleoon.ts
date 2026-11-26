/* eslint-disable func-names */
import {
    hit,
    noopArray,
    noopFunc,
    noopNull,
    queryKameleoonSelector,
    runProtected,
} from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect kameleoon
 *
 * @description
 * Mocks the Kameleoon Web Experimentation engine, i.e. `<siteCode>.kameleoon.io/engine.js`.
 *
 * It answers the `window.Kameleoon.API` for a project without experiments, so that page code
 * which uses it without a check, e.g. `Kameleoon.API.Goals.processConversion()`, does not throw,
 * and shows the page hidden by the anti-flicker snippet of Kameleoon at once, instead of after its timeout.
 * Commands queued in `window.kameleoonQueue` are run, and the ones pushed later are run at once.
 * The callbacks of `Kameleoon.API.Core.runWhenConditionTrue()`, `runWhenElementPresent()`
 * and `runWhenShadowRootElementPresent()` are called, as page code may depend on them.
 * Their selectors and the ones of `Kameleoon.API.Utils.querySelectorAll()` may contain `:eq(<index>)`
 * and `:contains("<text>")`, which are handled as by the engine.
 * No experiments or personalizations are applied, no data is sent and no cookies or storage items are set.
 *
 * Limitation: `Kameleoon.API.Utils.createHash(value, useSha256)` ignores `useSha256`, so with it
 * the result differs from the one of the engine, which then hashes the SHA-256 of the value.
 * No page has been found which calls it with `useSha256`.
 *
 * ### Examples
 *
 * ```adblock
 * ||kameleoon.io/engine.js$script,redirect=kameleoon
 * ||kameleoon.eu/engine.js$script,redirect=kameleoon
 * ||kameleoon.eu/kameleoon.js$script,redirect=kameleoon
 * ```
 *
 * @added unknown.
 */

type KameleoonWindow = typeof window & {
    Kameleoon?: unknown;
    kameleoonQueue?: unknown;
    kameleoonDisplayPage?: unknown;
    kameleoonDisplayPageTimeOut?: unknown;
    kameleoonStartLoadTime?: unknown;
    kameleoonEndLoadTime?: unknown;
};

interface QueueCommand {
    level?: unknown;
    command?: unknown;
}

export function KameleoonEngine(source: Source) {
    const w = window as KameleoonWindow;
    const doc = w.document;
    const existing = w.Kameleoon as { API?: unknown } | undefined;
    // The real engine, or this resource loaded before, is kept.
    if (existing && typeof existing === 'object' && existing.API && typeof existing.API === 'object') {
        return;
    }

    const POLLING_INTERVAL = 200;
    const SHADOW_POLLING_INTERVAL = 150;
    const loadTime = Date.now();

    /**
     * Returns the site code from the URL of the engine, e.g. `abc123` of `abc123.kameleoon.io/engine.js`.
     *
     * @returns Site code, or an empty string if it is not known, e.g. for a scriptlet.
     */
    const getSiteCode = (): string => {
        try {
            const el = doc.currentScript as HTMLScriptElement | null;
            const src = (el && el.src) || '';
            if (src === '') {
                return '';
            }
            const match = /^([a-z0-9]+)\.kameleoon\.(?:io|eu|com)$/i.exec(new URL(src, doc.baseURI).hostname);
            return match ? match[1] : '';
        } catch (e) {
            return '';
        }
    };

    // `document.currentScript` is the engine script only while it runs.
    const siteCode = getSiteCode();

    /**
     * Returns a random visitor code in the format of the engine: 16 lowercase letters and digits.
     * It is not stored, so it differs on each page load.
     *
     * @returns Visitor code, e.g. `gi3per9dvyf6gtik`.
     */
    const randomVisitorCode = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 16; i += 1) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    /**
     * Returns the elements matching the selector as an array, as `Utils.querySelectorAll()` of the engine,
     * also for `:eq()` and `:contains()`, or an empty array for an invalid selector.
     *
     * @param selector CSS selector.
     * @param root Root to query, document by default.
     * @returns Matching elements.
     */
    const queryAll = (selector: unknown, root?: unknown): Element[] => queryKameleoonSelector(selector, root);

    /**
     * Calls the callback once the condition is true: at once if it is true already,
     * otherwise when it becomes true, checked every `pollingInterval` ms, as `Core.runWhenConditionTrue()`.
     * A condition which throws is false.
     *
     * @param condition Page function returning whether to call the callback.
     * @param callback Page callback, called once without arguments.
     * @param pollingInterval Interval of the checks in ms, 200 by default.
     */
    const runWhenConditionTrue = (condition: unknown, callback: unknown, pollingInterval?: unknown) => {
        // nothing would be called, so the condition is not polled
        if (typeof condition !== 'function' || typeof callback !== 'function') {
            return;
        }
        const check = (): boolean => {
            try {
                return !!condition();
            } catch (e) {
                return false;
            }
        };
        if (check()) {
            runProtected(callback, []);
            return;
        }
        const interval = typeof pollingInterval === 'number' ? pollingInterval : POLLING_INTERVAL;
        const id = w.setInterval(() => {
            if (check()) {
                w.clearInterval(id);
                runProtected(callback, []);
            }
        }, interval);
    };

    /**
     * Calls the callback with the elements returned by `find()` once there are any,
     * and, if `isDynamic`, again with each batch of elements not passed before.
     *
     * @param find Returns the current elements.
     * @param callback Page callback.
     * @param pollingInterval Interval for polling; DOM changes are observed if it is not a number.
     * @param isDynamic Whether new elements are passed as well.
     * @param initial Elements already found by the caller, so that they are not queried again.
     */
    const watchElements = (
        find: () => Element[],
        callback: unknown,
        pollingInterval: unknown,
        isDynamic: unknown,
        initial?: Element[],
    ) => {
        const passed = new WeakSet<Element>();
        // whether the callback has been called, i.e. the next call is not the first one
        let isCalled = false;
        let stop: () => void = noopFunc;
        // Returns `true` if watching should stop.
        const process = (found?: Element[]): boolean => {
            const elements = (found || find()).filter((element) => !passed.has(element));
            if (elements.length === 0) {
                return false;
            }
            elements.forEach((element) => passed.add(element));
            isCalled = true;
            runProtected(callback, [elements]);
            return !isDynamic;
        };
        if (typeof pollingInterval === 'number') {
            if (process(initial)) {
                return;
            }
            const id = w.setInterval(() => {
                if (process()) {
                    stop();
                }
            }, pollingInterval);
            stop = () => w.clearInterval(id);
            return;
        }
        if (typeof w.MutationObserver !== 'function') {
            process(initial);
            return;
        }
        // As the engine, elements found at once are passed without an observer, if no more are expected.
        if (!isDynamic && process(initial)) {
            return;
        }
        const target = doc.documentElement || doc;
        // As the engine, changes of attributes and text are observed as well, e.g. a class added
        // to an existing element, or a text changed for `:contains()`.
        const options = {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        };
        // As the engine, the changes are observed while the callback is called for the first time, either with
        // the elements found at once or with the first ones found later, as the engine starts its observer before
        // it calls the callback then, so elements which the first callback adds itself are passed next, without
        // another change of the page. Later, the observer is disconnected while the callback is called
        // for a change, and connected again after it, as by the observer of the engine, so changes made
        // by the callback itself are not observed, and a callback which adds another matching element each time
        // does not run again and again. `disconnect()` drops the changes which are not delivered yet as well.
        const observer = new w.MutationObserver(() => {
            const isPaused = isCalled;
            if (isPaused) {
                observer.disconnect();
            }
            let isDone = false;
            try {
                isDone = process();
            } finally {
                if (isDone) {
                    observer.disconnect();
                } else if (isPaused) {
                    observer.observe(target, options);
                }
            }
        });
        observer.observe(target, options);
        if (isDynamic) {
            process(initial);
        }
    };

    /**
     * Calls the callback with the elements matching the selector once there are any,
     * as `Core.runWhenElementPresent()`.
     *
     * @param selector CSS selector; an invalid one is ignored.
     * @param callback Page callback, called with the array of matching elements.
     * @param pollingInterval Interval for polling in ms; DOM changes are observed if it is not a number.
     * @param isDynamicElement Whether elements which match later are passed as well.
     */
    const runWhenElementPresent = (
        selector: unknown,
        callback: unknown,
        pollingInterval?: unknown,
        isDynamicElement?: unknown,
    ) => {
        // nothing would be called, so nothing is watched
        if (typeof callback !== 'function') {
            return;
        }
        // as the engine, the selector is queried once, and an invalid one is not watched
        let hasError = false;
        const initial = queryKameleoonSelector(selector, undefined, () => {
            hasError = true;
        });
        if (hasError) {
            return;
        }
        watchElements(() => queryAll(selector), callback, pollingInterval, isDynamicElement, initial);
    };

    /**
     * Calls the callback with the elements matching the selector in the open shadow roots of the elements
     * matching the parent selector, as `Core.runWhenShadowRootElementPresent()`.
     * The shadow roots are polled, as their changes are not observed by an observer of the document.
     *
     * @param parentSelector CSS selector of the shadow hosts.
     * @param shadowRootElementSelector CSS selector of the elements in their shadow roots.
     * @param callback Page callback, called with the array of matching elements.
     * @param isDynamicElement Whether elements which match later are passed as well.
     */
    const runWhenShadowRootElementPresent = (
        parentSelector: unknown,
        shadowRootElementSelector: unknown,
        callback: unknown,
        isDynamicElement?: unknown,
    ) => {
        // nothing would be called, so nothing is watched
        if (typeof callback !== 'function') {
            return;
        }
        // as the engine, which watches the shadow hosts by `runWhenElementPresent()`, the hosts are queried once
        // when the callback is registered, and an invalid selector of them is not watched
        let hasError = false;
        const initialHosts = queryKameleoonSelector(parentSelector, undefined, () => {
            hasError = true;
        });
        if (hasError) {
            return;
        }
        const findIn = (hosts: Element[]): Element[] => {
            let elements: Element[] = [];
            hosts.forEach((host) => {
                if (host.shadowRoot) {
                    elements = elements.concat(queryAll(shadowRootElementSelector, host.shadowRoot));
                }
            });
            return elements;
        };
        // Changes inside shadow roots are not observed by an observer of the document.
        watchElements(
            () => findIn(queryAll(parentSelector)),
            callback,
            SHADOW_POLLING_INTERVAL,
            isDynamicElement,
            findIn(initialHosts),
        );
    };

    /**
     * Returns the hash of a string as `Utils.createHash()` of the engine, i.e. Java `String.hashCode()`.
     *
     * The second argument of the engine method, `useSha256`, is not supported: the engine then hashes
     * the hexadecimal SHA-256 of the UTF-8 value instead, e.g. `-902865482` instead of `96354` for `abc`,
     * which would need a synchronous SHA-256 implementation here. No page calling `createHash()`
     * at all has been found (live sites using Kameleoon and public code, 2026-11-20).
     *
     * @param value Value to hash, converted to a string.
     * @returns 32-bit integer hash, e.g. `96354` for `abc`; the same with `useSha256`.
     */
    const createHash = (value: unknown): number => {
        const str = String(value);
        let hash = 0;
        for (let i = 0; i < str.length; i += 1) {
            // eslint-disable-next-line no-bitwise
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return hash;
    };

    /**
     * Returns the parameters of the query and of the hash, as `parseParameters()` of the engine:
     * `?` in the hash separates parameters too, e.g. `#route?tab=details`, a parameter without a value is `null`,
     * and a parameter of the hash overrides the one of the query.
     *
     * @returns Parameters by name.
     */
    const getURLParameters = (): Record<string, string | null> => {
        const params: Record<string, string | null> = {};
        const hash = w.location.hash.substring(1).replace(/\?/g, '&');
        const search = w.location.search.substring(1);
        const parts = (search ? search.split('&') : []).concat(hash ? hash.split('&') : []);
        parts.forEach((part) => {
            const pair = part.split('=');
            try {
                params[decodeURIComponent(pair[0])] = pair[1] ? decodeURIComponent(pair[1]) : null;
            } catch (e) {
                params[unescape(pair[0])] = pair[1] ? unescape(pair[1]) : null;
            }
        });
        return params;
    };

    // As the engine, clicks are listened to by `touchend` on touch devices,
    // and a touch which has moved, i.e. scrolled, is not a click.
    let clickEvent: string | null = null;
    /**
     * Returns the event of universal click listeners: `touchend` on touch devices, otherwise `mousedown`,
     * detected by `ontouchend` of the root element, as the engine does.
     * The root element does not exist yet if the scriptlet runs at document start,
     * so the window is checked until then, and the result is kept once the root element exists.
     *
     * @returns Event name.
     */
    const getClickEvent = (): string => {
        if (clickEvent !== null) {
            return clickEvent;
        }
        const root = doc.documentElement;
        const eventName = 'ontouchend' in (root || w) ? 'touchend' : 'mousedown';
        if (root) {
            clickEvent = eventName;
        }
        return eventName;
    };
    let touchMoved: boolean | undefined;
    let touchListenersAdded = false;
    /**
     * Starts tracking whether the current touch has moved, on the first universal click listener
     * of a touch device, as the engine tracks it.
     */
    const addTouchListeners = () => {
        if (touchListenersAdded || getClickEvent() !== 'touchend') {
            return;
        }
        touchListenersAdded = true;
        doc.addEventListener('touchmove', () => {
            touchMoved = true;
        });
        doc.addEventListener('touchstart', () => {
            touchMoved = false;
        });
    };

    const currentVisit = {
        acquisitionChannel: '',
        activatedExperiments: [],
        activatedPersonalizations: [],
        activatedSegments: {},
        clicks: 0,
        conversions: {},
        currentProduct: null,
        customData: {},
        device: {
            browser: '',
            browserVersion: '',
            type: '',
        },
        duration: 0,
        geolocation: {
            city: '',
            country: '',
            latitude: null,
            longitude: null,
            postalCode: '',
            region: '',
        },
        index: 0,
        landingPageURL: '',
        lastEventDate: loadTime,
        locale: '',
        pageURLsVisited: {},
        pageViews: 1,
        products: [],
        startDate: loadTime,
        weather: {
            cloudiness: null,
            conditionCode: null,
            conditionDescription: '',
            humidity: null,
            pressure: null,
            sunrise: null,
            sunset: null,
            temperature: null,
            windSpeed: null,
        },
    };

    /**
     * Calls the callback with the data of keys as `Data.retrieveDataFromRemoteSource()` of the engine
     * when its request fails, i.e. with an empty object, as no request is sent here, and returns as the engine:
     * - for a key, a promise resolved with the result of the callback, i.e. not with the data,
     * - for an empty array of keys, the result of the callback, which is called at once,
     * - for other keys, nothing, as the callback is called later.
     *
     * @param key Key, or an array of keys.
     * @param callback Page callback.
     * @returns Promise, result of the callback, or `undefined`.
     */
    const retrieveDataFromRemoteSource = (key: unknown, callback?: unknown): unknown => {
        const call = (): unknown => {
            if (typeof callback !== 'function') {
                return undefined;
            }
            let result;
            // errors of the page callback are caught, but its result is kept
            runProtected(() => {
                result = callback({});
            }, []);
            return result;
        };
        if (!Array.isArray(key)) {
            return Promise.resolve().then(call);
        }
        if (key.length === 0) {
            return call();
        }
        Promise.resolve().then(call);
        return undefined;
    };

    const triggered: unknown[] = [];

    const getters = {
        getAll: noopArray,
        getActive: noopArray,
        getActivatedInVisit: noopArray,
        getById: noopNull,
        getByName: noopNull,
        getTriggeredInVisit: noopArray,
    };

    const api: Record<string, Record<string, unknown>> = {
        Core: {
            disableLegalConsent: noopFunc,
            enableDynamicRefresh: noopFunc,
            enableLegalConsent: noopFunc,
            enableSinglePageSupport: noopFunc,
            getConfiguration: () => ({
                generationTime: loadTime,
                goals: {},
                singlePageSupport: false,
                siteCode,
            }),
            load: noopFunc,
            processRedirect: noopFunc,
            runWhenConditionTrue,
            runWhenElementPresent,
            runWhenShadowRootElementPresent,
        },
        CurrentVisit: currentVisit,
        Data: {
            performRemoteSynchronization: noopFunc,
            readLocalData: noopNull,
            resetCustomData: noopFunc,
            retrieveDataFromRemoteSource,
            setCustomData: noopFunc,
            writeLocalData: noopFunc,
        },
        Events: {
            trigger: (name: unknown) => {
                triggered.push(name);
            },
            triggered,
        },
        Experiments: {
            assignVariation: noopFunc,
            block: noopFunc,
            getActivatedInVisit: getters.getActivatedInVisit,
            getActive: getters.getActive,
            getAll: getters.getAll,
            getById: getters.getById,
            getByName: getters.getByName,
            getTriggeredInVisit: getters.getTriggeredInVisit,
            trigger: noopFunc,
            triggerExperiment: noopFunc,
        },
        Goals: {
            cancelConversion: noopFunc,
            processConversion: noopFunc,
            processConversions: noopFunc,
        },
        Personalizations: {
            block: noopFunc,
            disable: noopFunc,
            getActivatedInVisit: getters.getActivatedInVisit,
            getActive: getters.getActive,
            getAll: getters.getAll,
            getById: getters.getById,
            getByName: getters.getByName,
            getTriggeredInVisit: getters.getTriggeredInVisit,
            trigger: noopFunc,
        },
        Products: {
            obtainFullSearchProducts: noopFunc,
            obtainInstantSearchProducts: noopFunc,
            obtainProductData: noopFunc,
            obtainProductInteractions: noopFunc,
            obtainRecommendedCollections: noopFunc,
            obtainRecommendedProducts: noopFunc,
            trackAddToCart: noopFunc,
            trackAddToWishList: noopFunc,
            trackCategoryView: noopFunc,
            trackProductView: noopFunc,
            trackSearchQuery: noopFunc,
            trackTransaction: noopFunc,
        },
        Segments: {
            getAll: getters.getAll,
            getById: getters.getById,
            getByName: getters.getByName,
            reevaluate: noopFunc,
            trigger: noopFunc,
        },
        Tracking: {
            processOmniture: noopFunc,
        },
        Triggers: {
            getAll: getters.getAll,
            getById: getters.getById,
            getByName: getters.getByName,
            reevaluate: noopFunc,
            trigger: noopFunc,
        },
        Utils: {
            addEventListener: (element: unknown, eventName: unknown, listener: unknown, options?: unknown) => {
                try {
                    (element as EventTarget).addEventListener(
                        eventName as string,
                        listener as EventListener,
                        options as AddEventListenerOptions,
                    );
                } catch (e) {
                    // ignore invalid arguments
                }
            },
            addUniversalClickListener: (element: unknown, listener: unknown) => {
                try {
                    const eventName = getClickEvent();
                    (element as EventTarget).addEventListener(eventName, (event) => {
                        if (touchMoved) {
                            return;
                        }
                        const target = event.target as Element | null;
                        // a tap on a disabled control is not a click
                        if (eventName === 'touchend' && target && typeof target.closest === 'function'
                            && target.closest('[disabled]')) {
                            return;
                        }
                        runProtected(listener, [event]);
                    });
                    addTouchListeners();
                } catch (e) {
                    // ignore invalid arguments
                }
            },
            clearInterval: (id: number) => w.clearInterval(id),
            clearTimeout: (id: number) => w.clearTimeout(id),
            createHash,
            getURLParameters,
            performRequest: noopFunc,
            querySelectorAll: queryAll,
            setInterval: (callback: unknown, delay?: unknown) => {
                return w.setInterval(callback as TimerHandler, typeof delay === 'number' ? delay : POLLING_INTERVAL);
            },
            setTimeout: (callback: unknown, delay?: unknown) => {
                return w.setTimeout(callback as TimerHandler, typeof delay === 'number' ? delay : POLLING_INTERVAL);
            },
        },
        Variations: {
            execute: noopFunc,
        },
        Visitor: {
            code: randomVisitorCode(),
            currentVisit,
            customData: {},
            experimentLegalConsent: false,
            firstVisitStartDate: loadTime,
            getCustomDataVisitor: () => ({}),
            numberOfVisits: 1,
            personalizationLegalConsent: false,
            personalizationsActive: false,
            previousVisit: null,
            productRecommendationLegalConsent: false,
            setVisitorCode: noopFunc,
            timeStartedEldestVisit: loadTime,
            visits: [currentVisit],
        },
    };

    // As the engine, whether the current touch has moved, `undefined` until a touch starts.
    Object.defineProperty(api.Utils, 'touchMoveEvent', {
        enumerable: true,
        get: () => touchMoved,
    });
    // A getter, as in the engine, since the root element may not exist yet.
    Object.defineProperty(api.Utils, 'mouseDownEvent', {
        enumerable: true,
        get: getClickEvent,
    });

    w.Kameleoon = {
        API: api,
        // Called by the snippet of the iframe variant.
        Analyst: { load: noopFunc },
        Gatherer: {},
        Internals: {},
        Loader: {},
        Targeting: {},
        Tracking: {},
        // Called by the snippet of the iframe variant with data of the iframe, which is not evaluated here.
        Utils: { runProtectedScript: noopFunc },
    };

    // Anti-flicker snippet: show the page at once, as the engine does when it is loaded.
    const displayPage = w.kameleoonDisplayPage;
    if (typeof displayPage === 'function') {
        if (typeof w.kameleoonDisplayPageTimeOut === 'number') {
            w.clearTimeout(w.kameleoonDisplayPageTimeOut);
        }
        runProtected(displayPage, [true]);
    } else if (w.kameleoonDisplayPageTimeOut === undefined) {
        // An anti-flicker snippet which runs later, e.g. after the scriptlet, does not hide the page then.
        w.kameleoonDisplayPageTimeOut = true;
    }
    const loadingStyle = doc.getElementById('kameleoonLoadingStyleSheet');
    if (loadingStyle && loadingStyle.parentNode) {
        loadingStyle.parentNode.removeChild(loadingStyle);
    }

    /**
     * Runs a command of `kameleoonQueue`: a function, an object with `command`,
     * or an array with the path of an API method, e.g. `['Events.trigger', 'name']`.
     *
     * @param item Queued command.
     */
    const runCommand = (item: unknown) => {
        if (typeof item === 'function') {
            runProtected(item, []);
            return;
        }
        if (Array.isArray(item)) {
            if (typeof item[0] !== 'string') {
                return;
            }
            const path = item[0].replace(/^Kameleoon\.API\./, '').split('.');
            if (path.length !== 2) {
                return;
            }
            const namespace = Object.prototype.hasOwnProperty.call(api, path[0]) ? api[path[0]] : undefined;
            const method = namespace && Object.prototype.hasOwnProperty.call(namespace, path[1])
                ? namespace[path[1]]
                : undefined;
            if (typeof method === 'function') {
                try {
                    method.apply(namespace, item.slice(1));
                } catch (e) {
                    // ignore errors of the command
                }
            }
            return;
        }
        if (item && typeof item === 'object') {
            runProtected((item as QueueCommand).command, []);
        }
    };

    const queue: unknown[] = Array.isArray(w.kameleoonQueue) ? w.kameleoonQueue : [];
    const queued = queue.splice(0, queue.length);
    // As the engine, the queue stays an array with an own `push()` which runs commands at once.
    // It is replaced before the queued commands run, so the ones which they push run as well.
    Object.defineProperty(queue, 'push', {
        configurable: true,
        writable: true,
        value(...items: unknown[]) {
            items.forEach(runCommand);
        },
    });
    w.kameleoonQueue = queue;
    /**
     * Checks whether a queued command is an object with the `IMMEDIATE` level, which the engine runs first.
     *
     * @param item Queued command.
     * @returns `true` for an `IMMEDIATE` command.
     */
    const isImmediate = (item: unknown) => !!item && typeof item === 'object' && !Array.isArray(item)
        && (item as QueueCommand).level === 'IMMEDIATE';
    queued.filter(isImmediate).forEach(runCommand);
    queued.filter((item) => !isImmediate(item)).forEach(runCommand);
    // as the engine, the load time of `Kameleoon::Loaded` is measured until here, also if it is dispatched later;
    // the start time is set by the snippet of the page, so it is not known yet if the scriptlet runs before it
    const endLoadTime = Date.now();
    w.kameleoonEndLoadTime = endLoadTime;
    const startLoadTime = w.kameleoonStartLoadTime;
    const engineLoadTime = typeof startLoadTime === 'number' && startLoadTime <= endLoadTime
        ? endLoadTime - startLoadTime
        : 0;

    hit(source);

    const dispatchEvents = () => {
        const time = Date.now();
        try {
            w.dispatchEvent(new CustomEvent('Kameleoon::Loaded', {
                detail: {
                    timeout: false,
                    loadTime: engineLoadTime,
                    time,
                },
            }));
            w.dispatchEvent(new CustomEvent('Kameleoon::Started', {
                detail: { newVisitorCode: true, time },
            }));
        } catch (e) {
            // ignore errors of page listeners
        }
    };
    // As the engine, which is loaded asynchronously, after the page has added its listeners;
    // the scriptlet runs before the scripts of the page, so the events are dispatched once it is parsed.
    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', dispatchEvents, { once: true });
    } else {
        w.setTimeout(dispatchEvents, 0);
    }
}

export const KameleoonEngineNames = [
    'kameleoon',
];

// eslint-disable-next-line prefer-destructuring
KameleoonEngine.primaryName = KameleoonEngineNames[0];

KameleoonEngine.injections = [
    hit,
    noopArray,
    noopFunc,
    noopNull,
    queryKameleoonSelector,
    runProtected,
];
