/* eslint-disable func-names */
import { hit, noopFunc, runProtected } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect optimizely
 *
 * @description
 * Mocks the Optimizely Web Experimentation snippet, and the API of Optimizely Classic, which the same URL
 * still serves for projects last saved before the migration to Web Experimentation.
 *
 * It answers the `window.optimizely` API for a project without experiments, so that
 * the page code which uses it without a check, e.g. `optimizely.get('state')`, does not throw,
 * and the code which waits for the client to be initialized, e.g. anti-flicker snippets, proceeds.
 * Commands queued in the `window.optimizely` array before the redirect is loaded are applied.
 * As by the real client, the lifecycle events, e.g. `initialized`, are emitted at once, so an anti-flicker
 * snippet which waits for them shows the page at once. Unlike by the real client, a listener which the page
 * adds later while it is loading gets the ones which have been emitted, as the scriptlet runs before
 * the page adds its listeners, and a listener of `initialized`, `originsSynced` or `activated` gets it
 * at any time.
 * The API of Classic is on the same object, e.g. `optimizely.trackEvent()` or `optimizely.data.state`.
 * Its `optimizely.$` is jQuery of the page, if the page has one, as jQuery which a Classic snippet may bundle
 * is not included.
 * No experiments or variations are applied, no data is sent and no cookies or storage items are set,
 * and the custom JavaScript of the project is not run.
 * A client which is already loaded, of Web Experimentation or of Classic, is kept, e.g. if the redirect
 * is applied to another snippet of the page after the real one.
 *
 * The rule should match only the snippet, e.g. `cdn.optimizely.com/js/<projectId>.js`,
 * its Performance Edge variant `cdn.optimizely.com/public/<accountId>/<projectId>/..._edge_helper.js`,
 * or a custom snippet `cdn.optimizely.com/public/<accountId>/s/<name>.js`, also served from `cdn-pci.optimizely.com`,
 * and not other files under `/public/`, e.g. the datafile `/public/<id>.json/tag.js` of Optimizely Full Stack.
 *
 * Based on the uBO redirect resource `optimizely.js`
 * (https://github.com/gorhill/uBlock/commit/e68e05cde0 and https://github.com/gorhill/uBlock/commit/ec0d053416,
 * originally from https://github.com/ryanbr/consent-rr, GPL-3.0-or-later).
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/optimizely.js
 *
 * ### Examples
 *
 * ```adblock
 * ||cdn.optimizely.com/js/*.js$script,redirect=optimizely
 * ||cdn.optimizely.com/public/*_edge_helper.js$script,redirect=optimizely
 * ||cdn-pci.optimizely.com/public/1234567890/s/$script,redirect=optimizely,domain=example.org
 * ```
 *
 * @added unknown.
 */

type Callback = (...args: unknown[]) => unknown;

type OptimizelyWindow = typeof window & {
    optimizely?: unknown;
    $?: unknown;
    jQuery?: unknown;
};

interface ProjectIdentity {
    accountId: string | null;
    projectId: string | null;
    revision: string | null;
}

interface ObserverEntry {
    selector: string;
    callback: Callback;
    once: boolean;
    seen: WeakSet<Element>;
    // time of `observeSelector()`, and a copy of its options, as the page has set them, e.g. `timeout`
    // and `onTimeout`, which is called as a method of this copy, as by the real client
    start: number;
    options: Record<string, unknown>;
    // number of elements passed to the callback
    matched: number;
}

interface PollGroup {
    id: number;
    callbacks: Map<object, Callback>;
}

interface OptimizelyEvent {
    type?: unknown;
    name?: unknown;
    data?: unknown;
}

interface ListenerSpec {
    filter?: OptimizelyEvent | null;
    handler?: unknown;
    token?: unknown;
}

interface ListenerEntry {
    filter?: OptimizelyEvent | null;
    handler: unknown;
    token: unknown;
    // whether `this` of the handler is an object, as for `event_emitter.on()` in the real client,
    // and not `undefined`, as for `addListener`
    hasReceiver: boolean;
}

interface BehaviorDescriptor {
    count?: unknown;
    pick?: {
        name?: unknown;
        modifier?: unknown;
    };
    filters?: Array<{ modifier?: unknown } | null>;
    reduce?: unknown;
}

type CommandTable = Record<string, Callback>;

export function Optimizely(source: Source) {
    const w = window as OptimizelyWindow;
    const doc = w.document;
    const existing = w.optimizely;
    // A loaded client is kept: the real one of Web Experimentation, or this redirect loaded before, which have
    // `get()`, or the real one of Classic, which has no `get()`, but `push()`, `trackEvent()` and `data`,
    // unlike the array which queues the commands before a client is loaded. Each property is read once,
    // and an object whose property cannot be read, e.g. a getter of a placeholder of the page which throws,
    // is replaced, as any other object which is not a loaded client.
    let isLoadedClient = false;
    if (existing && !Array.isArray(existing)) {
        try {
            const client = existing as {
                get?: unknown;
                push?: unknown;
                trackEvent?: unknown;
                data?: unknown;
            };
            if (typeof client.get === 'function') {
                isLoadedClient = true;
            } else if (typeof client.push === 'function' && typeof client.trackEvent === 'function') {
                const { data } = client;
                isLoadedClient = !!data && typeof data === 'object';
            }
        } catch (e) {
            isLoadedClient = false;
        }
    }
    if (isLoadedClient) {
        return;
    }

    const CLIENT_NAME = 'js';
    const CLIENT_VERSION = '0.261.0';
    const POLL_INTERVAL = 20;

    /**
     * Checks whether an object has an own property, also if the object has no `hasOwnProperty()` of its own.
     *
     * @param obj Object to check.
     * @param key Property name.
     * @returns `true` if `obj` has the own property `key`.
     */
    const hasOwn = (obj: unknown, key: unknown): boolean => {
        return Object.prototype.hasOwnProperty.call(obj, key as PropertyKey);
    };

    /**
     * Returns the identity of the project from the URL of the snippet.
     * The request is redirected, not the element, so `document.currentScript`
     * still has the URL of the snippet:
     * - `/js/<projectId>.js`;
     * - `/public/<accountId>/<projectId>/<revision>_<hash>_edge_helper.js` of Performance Edge.
     *
     * There is no URL of the snippet if it runs as a scriptlet: `document.currentScript` is then
     * the inline script which injects it, or `null`, e.g. for `chrome.scripting`, so the identity is not known.
     * The project id is not in the URL of a custom snippet `/public/<accountId>/s/<name>.js` either.
     *
     * @returns Project identity, with `null` values if it is not known.
     */
    const identityFromScript = (): ProjectIdentity => {
        const blank: ProjectIdentity = { accountId: null, projectId: null, revision: null };
        try {
            const el = doc.currentScript as HTMLScriptElement | null;
            const src = (el && el.src) || '';
            // As uBO, the whole URL is matched, e.g. also a snippet URL in a parameter of a loader script
            const direct = /\/(\d{6,})\.js/.exec(src);
            if (direct !== null) {
                return {
                    accountId: null,
                    projectId: direct[1],
                    revision: null,
                };
            }
            const nested = /\/public\/(\d+)\/(\d+)\/(?:(\d+)_)?/.exec(src);
            if (nested !== null) {
                return {
                    accountId: nested[1],
                    projectId: nested[2],
                    revision: nested[3] !== undefined ? nested[3] : null,
                };
            }
            return blank;
        } catch (e) {
            return blank;
        }
    };

    /**
     * Returns a random UUID v4.
     *
     * @returns UUID string.
     */
    const uuid = (): string => {
        const bytes = new Uint8Array(16);
        try {
            w.crypto.getRandomValues(bytes);
        } catch (e) {
            for (let i = 0; i < 16; i += 1) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }
        // eslint-disable-next-line no-bitwise
        bytes[6] = (bytes[6] & 15) | 64;
        // eslint-disable-next-line no-bitwise
        bytes[8] = (bytes[8] & 63) | 128;
        let hex = '';
        for (let i = 0; i < 16; i += 1) {
            hex += (bytes[i] + 256).toString(16).slice(-2);
        }
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20),
        ].join('-');
    };

    const observers: ObserverEntry[] = [];
    let mutationObserver: MutationObserver | null = null;

    /**
     * Disconnects the mutation observer of `observeSelector()` when no entry is left to watch;
     * the next `observeSelector()` call creates it again.
     */
    const releaseObserver = () => {
        if (observers.length !== 0 || mutationObserver === null) {
            return;
        }
        mutationObserver.disconnect();
        mutationObserver = null;
    };

    /**
     * Removes an entry of `observeSelector()`. Entries are removed by identity, not by index,
     * as a callback may register or remove other entries meanwhile.
     *
     * @param entry Observer entry.
     */
    const drop = (entry: ObserverEntry) => {
        const index = observers.indexOf(entry);
        if (index !== -1) {
            observers.splice(index, 1);
        }
    };

    /**
     * Checks whether the `timeout` of an entry has expired, as the real client: a number of ms is compared
     * with the time since `observeSelector()`, and other values are converted, e.g. `false` or a negative
     * number expires at once and `NaN` never, `null` means no timeout, and a function is called,
     * without a receiver, and stops the entry if it returns a truthy value.
     *
     * @param entry Observer entry.
     * @returns `true` if it has expired.
     */
    const isTimedOut = (entry: ObserverEntry): boolean => {
        const { timeout } = entry.options;
        if (timeout === undefined || timeout === null) {
            return false;
        }
        if (typeof timeout === 'function') {
            try {
                return !!timeout();
            } catch (e) {
                return false;
            }
        }
        return Date.now() - entry.start > Number(timeout);
    };

    /**
     * Stops an entry whose `timeout` has expired, as the real client: its `onTimeout` is called,
     * as a method of the copy of the options, only if no element has been passed to its callback.
     *
     * @param entry Observer entry.
     * @returns `false`, as the entry is spent.
     */
    const stopByTimeout = (entry: ObserverEntry): false => {
        if (entry.matched === 0 && typeof entry.options.onTimeout === 'function') {
            // called directly, as a method of the options, as by the real client
            runProtected(() => (entry.options as { onTimeout: Callback }).onTimeout(), []);
        }
        return false;
    };

    /**
     * Calls the callback of the entry for matching nodes which it has not seen yet, and stops,
     * as the real client, once the callback has removed the entry, e.g. by the function returned
     * by `observeSelector()`.
     * As the real client, the `timeout` is checked only then, before the elements are passed: at the first
     * check, of the existing elements, e.g. if the page has been busy since `observeSelector()`,
     * and on each DOM change, so an entry is stopped by the first DOM change after its timeout has expired.
     *
     * @param entry Observer entry.
     * @returns `false` if the entry is spent and should be removed.
     */
    const scanEntry = (entry: ObserverEntry): boolean => {
        if (isTimedOut(entry)) {
            return stopByTimeout(entry);
        }
        let nodes: NodeListOf<Element>;
        try {
            nodes = doc.querySelectorAll(entry.selector);
        } catch (e) {
            return false;
        }
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (entry.seen.has(node)) {
                continue;
            }
            entry.seen.add(node);
            entry.matched += 1;
            // called directly, as a method of the entry, as the real client calls it as a method of its own
            // entry, i.e. `h[t].callback(n)`, so `this` is not `null`, as by `runProtected(entry.callback, [node])`
            runProtected(() => entry.callback(node), []);
            if (entry.once || observers.indexOf(entry) === -1) {
                return false;
            }
        }
        return true;
    };

    /**
     * Scans the document for all entries of `observeSelector()` on DOM changes, removes the spent ones,
     * and disconnects the observer if none is left.
     */
    const scanObservers = () => {
        const entries = observers.slice();
        for (let i = 0; i < entries.length; i += 1) {
            // an entry which a callback of another one has removed meanwhile is skipped
            if (observers.indexOf(entries[i]) !== -1 && scanEntry(entries[i]) === false) {
                drop(entries[i]);
            }
        }
        releaseObserver();
    };

    /**
     * Calls the callback once for each element matching the selector, for the existing elements in the next task,
     * and for elements which match later on DOM changes, as `utils.observeSelector()` of the real client:
     * elements added later, and elements which match after a change of an attribute, e.g. of their class
     * or of a class of their parent.
     *
     * @param selector CSS selector.
     * @param callback Page callback, called with each matching element.
     * @param options Options: `once: true` stops after the first element, `timeout` in ms, or a function
     * which returns whether to stop, stops observing, and `onTimeout` is called then if no element
     * has been passed.
     * @returns Function which stops observing.
     * @throws Error, as the real client, for an invalid selector, a non-function callback,
     * or options which are not an object.
     */
    const observeSelector = (selector: unknown, callback: unknown, options?: unknown) => {
        let valid = typeof selector === 'string';
        if (valid) {
            try {
                doc.querySelector(selector as string);
            } catch (e) {
                valid = false;
            }
        }
        if (valid === false) {
            throw new Error('observeSelector expects a valid css selector as its first argument');
        }
        if (typeof callback !== 'function') {
            throw new Error('observeSelector expects a function as its second argument');
        }
        if (options !== undefined && options !== null) {
            if (typeof options !== 'object') {
                throw new Error('observeSelector expects an object as its third argument');
            }
        }
        const entryOptions = Object.assign({}, options) as Record<string, unknown>;
        const entry: ObserverEntry = {
            selector: selector as string,
            callback: callback as Callback,
            once: entryOptions.once === true,
            seen: new WeakSet(),
            start: Date.now(),
            options: entryOptions,
            matched: 0,
        };
        observers.push(entry);
        if (mutationObserver === null && typeof w.MutationObserver === 'function') {
            const root = doc.documentElement || doc;
            const newObserver = new w.MutationObserver(scanObservers);
            mutationObserver = newObserver;
            try {
                newObserver.observe(root, { attributes: true, childList: true, subtree: true });
            } catch (e) {
                mutationObserver = null;
            }
        }
        // As the real client, the elements which match already are passed in a later task, not at once,
        // so that the callback can use the function returned by `observeSelector()`,
        // e.g. `const stop = observeSelector(selector, () => stop())`.
        w.setTimeout(() => {
            if (observers.indexOf(entry) !== -1 && scanEntry(entry) === false) {
                drop(entry);
                releaseObserver();
            }
        }, 0);
        return () => {
            drop(entry);
            releaseObserver();
        };
    };

    // One interval per distinct period, as in the real client.
    // Callbacks are keyed by a token, so the same callback can be registered twice and cancelled once.
    const pollGroups = new Map<number, PollGroup>();

    /**
     * Calls the callback every `interval` ms until it is cancelled, as `utils.poll()` of the real client.
     * Callbacks of the same interval share one timer, which is cleared when the last one is cancelled.
     *
     * @param callback Page callback.
     * @param interval Interval in ms, 20 by default.
     * @returns Function which cancels the callback; calling it again does nothing.
     */
    const poll = (callback: unknown, interval?: unknown) => {
        const period = typeof interval === 'number' ? interval : POLL_INTERVAL;
        let group = pollGroups.get(period);
        if (group === undefined) {
            const newGroup: PollGroup = { id: 0, callbacks: new Map() };
            newGroup.id = w.setInterval(() => {
                const callbacks = Array.from(newGroup.callbacks.values());
                for (let i = 0; i < callbacks.length; i += 1) {
                    // `this` is `null`, as in the real client
                    runProtected(callbacks[i], []);
                }
            }, period);
            pollGroups.set(period, newGroup);
            group = newGroup;
        }
        const currentGroup = group;
        const token = {};
        currentGroup.callbacks.set(token, callback as Callback);
        return () => {
            if (currentGroup.callbacks.delete(token) === false) {
                return;
            }
            if (currentGroup.callbacks.size !== 0) {
                return;
            }
            w.clearInterval(currentGroup.id);
            pollGroups.delete(period);
        };
    };

    /**
     * Returns a promise resolved once the condition is true, checked at once and then every 20 ms,
     * as `utils.waitUntil()` of the real client.
     * The condition is not checked: the real client calls it immediately,
     * so the promise is rejected if it is not callable.
     *
     * @param condition Page function returning whether to resolve.
     */
    const waitUntil = (condition: unknown) => new Promise<void>((resolve) => {
        if ((condition as Callback)()) {
            resolve();
            return;
        }
        const cancel = poll(() => {
            if ((condition as Callback)()) {
                cancel();
                resolve();
            }
        });
    });

    /**
     * Returns a promise resolved with the first element matching the selector,
     * as `utils.waitForElement()` of the real client.
     *
     * @param selector CSS selector.
     * @returns Promise resolved with the element, or rejected for an invalid selector.
     */
    const waitForElement = (selector: unknown) => new Promise((resolve) => {
        observeSelector(selector, resolve, { once: true });
    });

    const urlChangeHandlers = new Map<string, Callback>();
    // Wrappers installed for the current subscriptions; `active` is cleared on the last unsubscription,
    // so a wrapper which stays wrapped by another script calls the method only and does not notify again
    // after the next subscription wraps the methods once more.
    let historyPatch: { active: boolean } | null = null;
    let nativePushState: History['pushState'] | null = null;
    let nativeReplaceState: History['replaceState'] | null = null;
    let ownPushState: History['pushState'] | null = null;
    let ownReplaceState: History['replaceState'] | null = null;

    /**
     * Calls the handlers of `onUrlChange()` with the current URL; their errors are caught.
     */
    const notifyUrlChange = () => {
        const handlers = Array.from(urlChangeHandlers.values());
        for (let i = 0; i < handlers.length; i += 1) {
            // called directly, without a receiver, as by the real client, so `this` in strict code is `undefined`
            const handler = handlers[i];
            runProtected(() => handler(w.location.href), []);
        }
    };

    /**
     * Calls the handler with the URL on each URL change, as `utils.onUrlChange()` of the real client:
     * on `popstate`, `hashchange`, `history.pushState()` and `history.replaceState()`.
     * The history methods are wrapped while there is a handler, and restored after the last one is removed,
     * unless the page has wrapped them again meanwhile.
     *
     * @param handler Page handler, called with `location.href`.
     * @returns Function which removes the handler; a no-op function for a non-function handler.
     */
    const onUrlChange = (handler: unknown) => {
        if (typeof handler !== 'function') {
            return noopFunc;
        }
        const token = uuid();
        const first = urlChangeHandlers.size === 0;
        urlChangeHandlers.set(token, handler as Callback);
        if (first) {
            w.addEventListener('popstate', notifyUrlChange);
            w.addEventListener('hashchange', notifyUrlChange);
            if (historyPatch === null) {
                const patch = { active: true };
                const pushState = w.history.pushState;
                const replaceState = w.history.replaceState;
                nativePushState = pushState;
                nativeReplaceState = replaceState;
                w.history.pushState = function (...args: Parameters<History['pushState']>) {
                    pushState.apply(w.history, args);
                    if (patch.active) {
                        notifyUrlChange();
                    }
                };
                w.history.replaceState = function (...args: Parameters<History['replaceState']>) {
                    replaceState.apply(w.history, args);
                    if (patch.active) {
                        notifyUrlChange();
                    }
                };
                ownPushState = w.history.pushState;
                ownReplaceState = w.history.replaceState;
                historyPatch = patch;
            }
        }
        return () => {
            urlChangeHandlers.delete(token);
            if (urlChangeHandlers.size !== 0) {
                return;
            }
            w.removeEventListener('popstate', notifyUrlChange);
            w.removeEventListener('hashchange', notifyUrlChange);
            if (historyPatch !== null) {
                historyPatch.active = false;
                // Native methods are restored only if the wrappers are still installed,
                // so a wrapper installed by another script later is kept.
                if (w.history.pushState === ownPushState && nativePushState) {
                    w.history.pushState = nativePushState;
                }
                if (w.history.replaceState === ownReplaceState && nativeReplaceState) {
                    w.history.replaceState = nativeReplaceState;
                }
                ownPushState = null;
                ownReplaceState = null;
                historyPatch = null;
            }
        };
    };

    const PLACEMENTS: Record<string, InsertPosition> = {
        before: 'beforebegin',
        after: 'afterend',
        first_child: 'afterbegin',
        last_child: 'beforeend',
    };

    /**
     * Inserts the HTML next to the element matching the selector, as `utils.persistHtml()` of the real client.
     * The real client inserts the markup again if the page removes it.
     * It is inserted once here, as no variation code is run.
     *
     * @param html Markup to insert.
     * @param selector CSS selector of the element.
     * @param placement `before` (default), `after`, `first_child` or `last_child`.
     * @returns No-op function.
     * @throws Error, as the real client, for an empty markup, an invalid selector or placement,
     * or no matching element.
     */
    const persistHtml = (html: unknown, selector: unknown, placement?: unknown) => {
        if (typeof html !== 'string' || html === '') {
            throw new Error('persistHtml: html must be a non-empty string');
        }
        try {
            doc.querySelector(selector as string);
        } catch (e) {
            throw new Error(`persistHtml: invalid CSS selector: ${selector}`);
        }
        const position = placement === undefined || placement === null ? 'before' : placement;
        if (hasOwn(PLACEMENTS, position) === false) {
            throw new Error(`persistHtml: placement must be one of: ${Object.keys(PLACEMENTS).join(', ')}`);
        }
        const target = doc.querySelector(selector as string);
        if (target === null) {
            throw new Error(`persistHtml: no element found for selector "${selector}"`);
        }
        try {
            target.insertAdjacentHTML(PLACEMENTS[position as string], html);
        } catch (e) {
            // ignore
        }
        return noopFunc;
    };

    // As in the real client, nothing is logged until a log level is set by the page,
    // e.g. by `push({ type: 'log', level: 'WARN' })` or `push(['log'])`, which means INFO.
    const LOG_LEVELS: Record<string, number> = {
        OFF: 0,
        ERROR: 1,
        WARN: 2,
        INFO: 3,
        DEBUG: 4,
    };
    let logLevel: number | null = null;

    /**
     * Sets the level of the logs of the real client, enabled by the page, e.g. by the `log` command.
     * An unknown level is reported to the console, as by the real client.
     *
     * @param level Name, e.g. `WARN`, or number of the level.
     */
    const setLogLevel = (level: unknown) => {
        const resolved = typeof level === 'string'
            ? LOG_LEVELS[level.toUpperCase()]
            : level;
        if (typeof resolved !== 'number') {
            try {
                w.console.error(`Unknown log level: ${level}`);
            } catch (e) {
                // ignore
            }
            return;
        }
        logLevel = resolved;
    };

    /**
     * Logs a warning of the real client, only if the page has enabled the `WARN` level or a higher one.
     *
     * @param message Warning message.
     * @param detail Optional value logged after the message.
     */
    const warn = (message: string, detail?: unknown) => {
        if (logLevel === null || logLevel < LOG_LEVELS.WARN) {
            return;
        }
        try {
            if (detail === undefined) {
                w.console.warn(message);
            } else {
                w.console.warn(message, detail);
            }
        } catch (e) {
            // ignore
        }
    };

    const identity = identityFromScript();

    const state = {
        getActivationId: () => null,
        getActiveExperimentIds: () => [],
        getCampaignStateLists: () => ({}),
        getCampaignStates: () => ({}),
        getDecisionObject: () => null,
        getDecisionString: () => null,
        getExperimentStates: () => ({}),
        getPageStates: () => ({}),
        getRedirectInfo: () => null,
        getTrafficExclusionStats: () => ({}),
        getVariationMap: () => ({}),
        isGlobalHoldback: () => false,
    };

    const data = {
        accountId: identity.accountId,
        audiences: {},
        campaigns: {},
        clientName: CLIENT_NAME,
        clientVersion: CLIENT_VERSION,
        dcpServiceId: null,
        events: {},
        experiments: {},
        groups: {},
        pages: {},
        projectId: identity.projectId,
        revision: identity.revision,
        snippetId: identity.projectId,
        variations: {},
    };

    // Keys of the visitor profile providers of the real client, all empty.
    // `location` is an object, as page code reads properties of it.
    const visitor: Record<string, unknown> = {
        browserId: '',
        browserVersion: '',
        campaign: null,
        cookies: {},
        custom: {},
        customBehavior: [],
        // Dynamic Customer Profile, fetched by the real client, so an empty object,
        // as its audience matcher reads properties of it.
        dcpData: {},
        device: '',
        device_type: '',
        events: [],
        first_session: true,
        IP: '',
        language: '',
        location: {
            city: '',
            continent: '',
            country: '',
            dma: '',
            region: '',
        },
        offset: 0,
        platform: '',
        queryParams: {},
        referrer: '',
        source_type: 'direct',
        url: '',
        visitorId: null,
    };
    // Lazy in the real client, so it returns the time of the read.
    Object.defineProperty(visitor, 'currentTimestamp', {
        enumerable: true,
        get: () => Date.now(),
    });

    const utils = {
        observeSelector,
        onUrlChange,
        persistHtml,
        poll,
        Promise: w.Promise,
        waitForElement,
        waitUntil,
    };

    // `get('behavior')` queries the event store of the visitor, which is empty here.
    // Argument checks are the ones of the real client.
    const RECENCY_FILTERS = ['most_recent', 'least_recent'];
    const FREQUENCY_FILTERS = ['most_frequent', 'least_frequent'];

    /**
     * Validates a query descriptor of `get('behavior')` as the real client does.
     *
     * @param descriptor Query descriptor of the page.
     * @param allowed Allowed `pick` modifiers.
     * @returns Messages of the problems, or `undefined` if there is none.
     */
    const descriptorProblems = (descriptor: BehaviorDescriptor, allowed: string[]): string[] | undefined => {
        if (!descriptor) {
            return ['Descriptor not defined'];
        }
        const problems: string[] = [];
        if (descriptor.count) {
            problems.push('Unexpected "count" clause specified');
        }
        const { pick } = descriptor;
        if (pick && pick.modifier && allowed.indexOf(pick.modifier as string) === -1) {
            problems.push(`Invalid "pick" modifier "${pick.modifier}"`);
        }
        const filters = descriptor.filters || [];
        for (let i = 0; i < filters.length; i += 1) {
            const filter = filters[i];
            if (filter && filter.modifier !== undefined) {
                problems.push(`Unexpected "filter" modifier "${filter.modifier}"`);
            }
        }
        return problems.length !== 0 ? problems : undefined;
    };

    const behavior = {
        getEvents: (descriptor?: unknown) => {
            if (descriptor === undefined) {
                return [];
            }
            if (typeof descriptor === 'number') {
                if (descriptor <= 0) {
                    throw new Error(`Count must be a positive integer, got ${descriptor}`);
                }
                return [];
            }
            const problems = descriptorProblems(descriptor as BehaviorDescriptor, RECENCY_FILTERS);
            if (problems !== undefined) {
                throw new Error(problems.join('\n'));
            }
            return [];
        },
        getByFrequency: (descriptor?: unknown) => {
            const spec = (descriptor !== undefined && descriptor !== null ? descriptor : {}) as BehaviorDescriptor;
            if (!spec.pick) {
                throw new Error('No "pick" clause provided in query descriptor');
            }
            if (!spec.pick.name) {
                throw new Error('No field name provided in "pick" clause');
            }
            const problems = descriptorProblems(spec, FREQUENCY_FILTERS);
            if (problems !== undefined) {
                throw new Error(problems.join('\n'));
            }
            return [];
        },
        query: (descriptor?: unknown) => {
            const spec = (descriptor !== undefined && descriptor !== null ? descriptor : {}) as BehaviorDescriptor;
            // A reduced query of no events has nothing to return.
            return spec.reduce ? undefined : [];
        },
    };

    const listeners: ListenerEntry[] = [];
    // Names of the lifecycle events which have been emitted at the start, in their order, see `STARTUP_NAMES`.
    // The ones which page code emits itself are not recorded, so they are not delivered again.
    const emittedAtStart: string[] = [];

    /**
     * Creates a lifecycle event of the start. As in the real client, only `campaignsDecided` has data,
     * the ids of the active pages. An event is created for each emission and each replay, as a handler
     * of the page may change the object which it gets.
     *
     * @param name Name of the event, e.g. `initialized`.
     * @returns Event.
     */
    const createStartupEvent = (name: string): OptimizelyEvent => {
        const event: OptimizelyEvent = { type: 'lifecycle', name };
        if (name === 'campaignsDecided') {
            event.data = { pageIds: [] };
        }
        return event;
    };
    // Whether the page is still starting: until the document is parsed, or until the next task if it is
    // parsed already. Listeners added until then get the lifecycle events emitted before, see `replayLifecycle()`.
    let isStarting = true;

    /**
     * Checks whether an event matches the filter of a listener: its `type` and `name`, if they are set.
     *
     * @param filter Filter of the listener; no filter matches all events.
     * @param event Event.
     * @returns `true` if the listener should be called.
     */
    const eventMatches = (filter: OptimizelyEvent | null | undefined, event: OptimizelyEvent): boolean => {
        if (filter === undefined || filter === null) {
            return true;
        }
        if (filter.type !== undefined && filter.type !== event.type) {
            return false;
        }
        if (filter.name !== undefined && filter.name !== event.name) {
            return false;
        }
        return true;
    };

    /**
     * Calls the handler of a listener with an event, catching its errors.
     * As the real client, a handler of `addListener` is called without a receiver, so `this` in strict code
     * is `undefined`, not `null`, and a handler of `event_emitter.on()` with an object of its own for each call.
     *
     * @param entry Listener.
     * @param event Event.
     */
    const callListener = (entry: ListenerEntry, event: OptimizelyEvent) => {
        const handler = entry.handler as Callback;
        runProtected(() => handler.call(entry.hasReceiver ? {} : undefined, event), []);
    };

    /**
     * Calls the listeners matching the event. As the real client, they get the same object,
     * and they are matched with the event as it has been emitted, also if a handler changes it,
     * e.g. its name. A copy of the listeners is iterated, as a listener may add or remove others.
     *
     * @param event Event, e.g. `{ type: 'lifecycle', name: 'initialized' }`.
     */
    const emit = (event: OptimizelyEvent) => {
        const emitted: OptimizelyEvent = { type: event.type, name: event.name };
        const entries = listeners.slice();
        for (let i = 0; i < entries.length; i += 1) {
            if (eventMatches(entries[i].filter, emitted)) {
                callListener(entries[i], event);
            }
        }
    };

    /**
     * Removes all listeners registered with the token.
     *
     * @param token Token of `addListener()` or `event_emitter.on()`.
     */
    const dropByToken = (token: unknown) => {
        for (let i = listeners.length - 1; i >= 0; i -= 1) {
            if (listeners[i].token === token) {
                listeners.splice(i, 1);
            }
        }
    };

    /**
     * Registers a listener. As the real client, a token is set on the spec of the page if it has none,
     * as it is needed for `removeListener`.
     *
     * @param spec Listener spec of the page: `filter`, `handler` and an optional `token`.
     * @param hasReceiver Whether `this` of the handler is an object.
     * @returns The listener.
     */
    const register = (spec: ListenerSpec, hasReceiver: boolean): ListenerEntry => {
        if (!spec.token) {
            spec.token = uuid();
        }
        const entry: ListenerEntry = {
            filter: spec.filter,
            handler: spec.handler,
            token: spec.token,
            hasReceiver,
        };
        listeners.push(entry);
        return entry;
    };

    // lifecycle events which are delivered to the listeners of their name which are added at any time later
    const STICKY = ['initialized', 'originsSynced', 'activated'];

    /**
     * Delivers the lifecycle events which have been emitted before to a listener which has just been added.
     * The real client does not do it, but it emits them while the snippet is run, to the listeners
     * which the page has queued, while the scriptlet runs before the page adds its listeners.
     * - While the page is starting, the listener gets all the events which match its filter, in their order,
     *   also if it has only the type `lifecycle` or no filter, until it is removed, e.g. by itself.
     * - Later, only a listener of the name of a sticky event, i.e. `initialized`, `originsSynced`
     *   or `activated`, gets this event, so that e.g. a listener without a filter which page code adds
     *   for the next event does not get the lifecycle events instead.
     *
     * @param entry Listener which has just been added.
     */
    const replayLifecycle = (entry: ListenerEntry) => {
        if (isStarting === false) {
            const { filter } = entry;
            const name = filter && filter.type === 'lifecycle' ? filter.name as string : '';
            if (STICKY.indexOf(name) !== -1 && emittedAtStart.indexOf(name) !== -1) {
                callListener(entry, createStartupEvent(name));
            }
            return;
        }
        const names = emittedAtStart.slice();
        for (let i = 0; i < names.length; i += 1) {
            if (listeners.indexOf(entry) === -1) {
                return;
            }
            const event = createStartupEvent(names[i]);
            if (eventMatches(entry.filter, event)) {
                callListener(entry, event);
            }
        }
    };

    /**
     * Command `addListener` of the real client: registers a listener, and delivers the lifecycle events
     * emitted before to it, see `replayLifecycle()`.
     *
     * @param spec Listener spec of the page.
     * @returns Token of the listener.
     * @throws Error, as the real client, if there is no handler function.
     */
    const addListener = (spec: unknown) => {
        if (spec === null || typeof spec !== 'object' || typeof (spec as ListenerSpec).handler !== 'function') {
            throw new Error('A handler function must be supplied');
        }
        const entry = register(spec as ListenerSpec, false);
        replayLifecycle(entry);
        return entry.token;
    };

    /**
     * Command `removeListener` of the real client: removes the listeners of the token of the spec.
     *
     * @param spec Spec with the `token` of the listener.
     * @throws Error, as the real client, if there is no token.
     */
    const removeListener = (spec: unknown) => {
        if (spec === null || typeof spec !== 'object' || !(spec as ListenerSpec).token) {
            throw new Error('Must supply a token to removeListener');
        }
        dropByToken((spec as ListenerSpec).token);
    };

    // `on()` takes the spec and returns its token, `off()` takes the token.
    // Its handlers are called with an object as `this`, as by the real client.
    const eventEmitter = {
        on: (spec: unknown) => {
            if (spec === null || typeof spec !== 'object') {
                return undefined;
            }
            const entry = register(spec as ListenerSpec, true);
            replayLifecycle(entry);
            return entry.token;
        },
        off: (token: unknown) => {
            dropByToken(token);
        },
        emit: (event: unknown) => {
            if (event === null || typeof event !== 'object') {
                return;
            }
            emit(event as OptimizelyEvent);
        },
    };

    const modules: Record<string, unknown> = {
        behavior,
        data,
        state,
        utils,
        visitor,
        visitor_id: { randomId: uuid() },
    };

    /**
     * `optimizely.get()`: returns a module of the real client, e.g. `state`, `data` or `utils`.
     * An unknown module is `undefined`, and a warning is logged if the page has enabled it.
     *
     * @param name Module name.
     * @returns Module, `window.$` for `jquery`, or `undefined`.
     */
    const get = (name: unknown) => {
        // The real client does not bundle jQuery, it uses `window.$` of the page,
        // and never `window.jQuery`.
        if (name === 'jquery') {
            return w.$;
        }
        if (name === 'event_emitter') {
            return eventEmitter;
        }
        if (hasOwn(modules, name)) {
            return modules[name as string];
        }
        warn(`Module "${name}" not found.`);
        return undefined;
    };

    // Commands are looked up by version: arrays and strings are version 0,
    // objects have their own version or version 1, and the version 2 table of the real client is empty.
    // A name of another version is refused, e.g. `push('activate')` returns `false`.
    const commandsV0: CommandTable = {
        activateGeoDelayedExperiments: noopFunc,
        activateSiteCatalyst: noopFunc,
        bucketUser: noopFunc,
        bucketVisitor: noopFunc,
        disable: noopFunc,
        log: (enabled?: unknown) => {
            setLogLevel(enabled === undefined || enabled ? 'INFO' : 'OFF');
        },
        optOut: noopFunc,
        setCookieDomain: noopFunc,
        setCookieExpiration: noopFunc,
        setDimensionValue: noopFunc,
        setGA4UserId: noopFunc,
        setUserId: noopFunc,
        storeThirdPartyData: noopFunc,
        trackEvent: noopFunc,
    };

    const commandsV1: CommandTable = {
        activate: noopFunc,
        addListener,
        bucketVisitor: noopFunc,
        clientMetadata: noopFunc,
        cookieDomain: noopFunc,
        cookieExpiration: noopFunc,
        dataFromSource: noopFunc,
        disable: noopFunc,
        disableCrossOrigin: noopFunc,
        event: noopFunc,
        extendCookieLifetime: noopFunc,
        ga4User: noopFunc,
        holdEvents: noopFunc,
        initialViewStates: noopFunc,
        integrationSettings: noopFunc,
        load: noopFunc,
        loadEmbeddedEditor: noopFunc,
        log: (spec: unknown) => {
            setLogLevel((spec as { level?: unknown }).level);
        },
        microsnippetError: noopFunc,
        optOut: noopFunc,
        page: noopFunc,
        priorRedirectString: noopFunc,
        registerModule: noopFunc,
        removeListener,
        rum: noopFunc,
        sendEvents: noopFunc,
        tags: noopFunc,
        user: noopFunc,
        waitForOriginSync: noopFunc,
    };

    const commandTables: CommandTable[] = [commandsV0, commandsV1, {}];

    // Commands which the real client runs from its queue before the others while it starts,
    // by `push(command, true)`.
    const HIGH_PRIORITY_COMMANDS = ['clientMetadata', 'cookieDomain', 'disable', 'load', 'optOut', 'rum'];

    /**
     * `optimizely.push()`: runs a command of the real client, looked up by its version: arrays and strings
     * are version 0, objects have their own version or version 1. Errors of the command are caught.
     * As the real client, with `highPriorityOnly`, only the commands which it runs first while it starts
     * are run, and other ones are refused without a warning, also if they are unknown,
     * e.g. for `commands.forEach(optimizely.push)`, as `forEach()` passes the index as the second argument.
     *
     * @param command Command, e.g. `['trackEvent', 'name']`, `'disable'` or `{ type: 'addListener', ... }`.
     * @param highPriorityOnly Whether only a high-priority command is run.
     * @returns `true` if the command is known for its version, `false` otherwise.
     */
    const push = (command: unknown, highPriorityOnly?: unknown): boolean => {
        let version: unknown;
        let name: unknown;
        let args: unknown[];
        if (Array.isArray(command)) {
            version = 0;
            name = command[0];
            args = command.slice(1);
        } else if (command !== null && typeof command === 'object') {
            const objectCommand = command as { version?: unknown; type?: unknown };
            version = objectCommand.version !== undefined ? objectCommand.version : 1;
            name = objectCommand.type;
            args = [command];
        } else if (typeof command === 'string') {
            version = 0;
            name = command;
            args = [];
        } else {
            warn('API / Ignoring non-array/object/string argument:', command);
            return false;
        }
        if (highPriorityOnly && HIGH_PRIORITY_COMMANDS.indexOf(name as string) === -1) {
            return false;
        }
        const table = commandTables[version as number];
        if (table === undefined || hasOwn(table, name) === false) {
            warn(`API / No function found for "${name}" (v${version}) with arguments:`, args);
            return false;
        }
        try {
            table[name as string].apply(null, args);
        } catch (e) {
            // ignore errors of the command, as the real client does
        }
        return true;
    };

    // Optimizely Classic, the product before Web Experimentation, is still served for projects
    // last saved before the migration, from the same `/js/<projectId>.js` path, with its API on the object itself,
    // e.g. `optimizely.trackEvent()`, `optimizely.activeExperiments` and `optimizely.data.state`.
    // It is mocked as a project without running experiments; the `referrer` of the visitor is empty,
    // as in `get('visitor')`.
    const classicData = {
        note: "Obsolete, use optimizely.get('data') instead",
        audiences: {},
        customTags: {},
        experiments: {},
        sections: {},
        segments: {},
        thirdParty: {},
        variations: {},
        state: {
            activeExperiments: [],
            enabled: true,
            integrations: { activeOAuthClientIds: [] },
            redirectExperiment: undefined,
            variationIdsMap: {},
            variationMap: {},
            variationNamesMap: {},
        },
        visitor: {
            audiences: {},
            browser: '',
            browserVersion: '',
            device: '',
            deviceType: '',
            dimensions: {},
            ip: '',
            lists: {},
            location: {},
            matchingRules: {},
            mobile: false,
            mobileId: '',
            os: '',
            params: {},
            // an object in Classic, e.g. `{ id: 'linux', version: 'x86_64' }`, from the user agent
            platform: { id: '', version: '' },
            referrer: '',
            segments: {},
        },
    };

    const CLASSIC_METHODS = [
        'activate',
        'activateGeoDelayedExperiments',
        'activateSiteCatalyst',
        'activateUniversalAnalytics',
        'addOAuthClientId',
        'addToAudience',
        'addToSegment',
        'bindTrackElement',
        'bucketUser',
        'bucketVisitor',
        'clickTalePlayback',
        'clickTaleRecord',
        'customTag',
        'delayDomReadyEval',
        'delayPageviewTracking',
        'disable',
        'googleAnalyticsCustomVariableScope',
        'integrationPrefix',
        'log',
        'optOut',
        'optOutThirdPartyCookies',
        'overrideUrl',
        'removeFromAllAudiences',
        'removeFromAllSegments',
        'removeFromAudience',
        'removeFromReportableAudiences',
        'removeFromSegment',
        'sc_activate',
        'sc_svar',
        'setDimensionValue',
        'setUserId',
        'skipPageTracking',
        'storeThirdPartyData',
        'timeout',
        'trackEvent',
        'verbose',
    ];

    /**
     * Returns an id of the project identity as a number, as Classic returns its ids, e.g. `getProjectId()`,
     * while the current client returns them as strings, e.g. `get('data').projectId`.
     *
     * @param id Id from the URL of the snippet.
     * @returns The id as a number, or `null` if it is not known.
     */
    const toClassicId = (id: string | null): number | null => (id === null ? null : Number(id));

    const api: Record<string, unknown> = {
        push,
        get,
        initialized: true,
        data: classicData,
        state: {},
        activeExperiments: [],
        allExperiments: {},
        all_experiments: {},
        allVariations: {},
        getElementsByClassName: (className: unknown) => doc.getElementsByClassName(String(className)),
        revision: toClassicId(identity.revision),
        variationIdsMap: {},
        variationMap: {},
        variationNamesMap: {},
        variation_map: {},
        getAccountId: () => toClassicId(identity.accountId),
        getProjectId: () => toClassicId(identity.projectId),
    };
    // In Classic, a method which is also a version 0 command is the same function,
    // e.g. `optimizely.log()` enables logging as `push(['log'])` does; other methods do nothing.
    CLASSIC_METHODS.forEach((method) => {
        api[method] = hasOwn(commandsV0, method) ? commandsV0[method] : noopFunc;
    });
    // `optimizely.$` of Classic is the jQuery which the snippet bundles, if the project includes it,
    // otherwise jQuery of the page, `window.jQuery`, or `window.$` in older versions.
    // As jQuery is not bundled here, it is jQuery of the page when it is read, so that `optimizely.$('.x')` works
    // if the page has one, also if `window.$` is another library; it is `undefined` if the page has none,
    // unlike in a snippet which bundles jQuery.
    try {
        Object.defineProperty(api, '$', {
            configurable: true,
            enumerable: true,
            get: () => (w.jQuery !== undefined && w.jQuery !== null ? w.jQuery : w.$),
        });
    } catch (e) {
        // ignore
    }

    const queued: unknown[] = Array.isArray(existing) ? existing.slice() : [];
    w.optimizely = api;
    for (let i = 0; i < queued.length; i += 1) {
        push(queued[i]);
    }

    hit(source);

    // The lifecycle events are emitted at once, after the queued commands, as the real client emits them
    // while the snippet is run, e.g. for an anti-flicker snippet of the page which shows the page
    // on `initialized`. The real client emits `initialized`, `campaignsDecided`, with the ids of the active
    // pages, `activated` and `activateDeferredDone`, e.g. page code waits for the last one to know
    // that no campaign has run; `originsSynced` and `activate` are emitted as well, for page code
    // which waits for them. Listeners added later get them as `replayLifecycle()` describes.
    const STARTUP_NAMES = [
        'initialized',
        'originsSynced',
        'campaignsDecided',
        'activate',
        'activated',
        'activateDeferredDone',
    ];
    STARTUP_NAMES.forEach((lifecycleName) => {
        emittedAtStart.push(lifecycleName);
        emit(createStartupEvent(lifecycleName));
    });

    const endStarting = () => {
        isStarting = false;
    };
    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', endStarting, { once: true });
    } else {
        w.setTimeout(endStarting, 0);
    }
}

export const OptimizelyNames = [
    'optimizely',
    // prefixed name
    'ubo-optimizely.js',
    // original ubo name
    'optimizely.js',
];

// eslint-disable-next-line prefer-destructuring
Optimizely.primaryName = OptimizelyNames[0];

Optimizely.injections = [
    hit,
    noopFunc,
    runProtected,
];
