import { randomId } from './random-id';

/**
 * Spoofed clicks shared by spoofClickEventsIsTrusted() and clickElement() of all scriptlet injections,
 * see createSpoofedClicks() and getSpoofedClicks(). The page can reach the shared object, so its state is private
 * and its functions cannot be replaced, but the page can still call them, e.g. to detect a spoofed event
 * or to delete its proxy, as it can detect or block the clicks of the scriptlet without them anyway.
 */
export type SpoofedClicks = Readonly<{
    /**
     * Returns the event to deliver to a listener or an inline handler: the proxy of a spoofed event,
     * i.e. of an event dispatched by clickElement(), of a click forwarded from it by a label,
     * or after spoofAllEvents(), of an untrusted page event, otherwise the event itself.
     * It is used by the listener wrappers and by clickElement() for the inline handler,
     * and a created proxy is stored, so all of them receive the same proxy of an event.
     * Trusted events are passed unchanged, as they are trusted anyway.
     */
    getDeliveredEvent: (event: Event) => Event;

    /**
     * Stores the proxy of an event dispatched by clickElement(), to deliver it to all listeners.
     */
    setProxy: (event: Event, proxy: Event) => void;

    /**
     * Removes the stored proxy of an event, once it has been dispatched.
     */
    deleteProxy: (event: Event) => void;

    /**
     * Sets the function which clickElement() uses while it dispatches a click which activates a label,
     * to spoof the click that the label forwards to its control and return its proxy, or null.
     */
    setForwardedClickSpoofer: (spoofer: ((event: Event) => Event | undefined) | null) => void;

    /**
     * Spoofs `isTrusted` for all untrusted click-related events on the page, including the page's own ones.
     * Called by any rule with `isTrusted:all`, for the whole page.
     */
    spoofAllEvents: () => void;
}>;

/**
 * Creates a proxy of a native event with `isTrusted` spoofed to `true`
 * for listeners and inline handlers.
 *
 * @param nativeEvent Original DOM event.
 *
 * @returns Proxied event.
 */
export const createTrustedEventProxy = (nativeEvent: Event): Event => {
    return new Proxy(nativeEvent, {
        get(target, prop) {
            if (prop === 'isTrusted') {
                return true;
            }
            const value = Reflect.get(target, prop);
            // Methods must run on the native event; the constructor is kept as is for type checks
            if (typeof value === 'function' && prop !== 'constructor') {
                return value.bind(target);
            }

            return value;
        },
        // Native setters such as "cancelBubble" and "returnValue" throw on a proxy receiver
        // https://github.com/AdguardTeam/Scriptlets/issues/555
        set(target, prop, value) {
            return Reflect.set(target, prop, value);
        },
    });
};

/**
 * Creates spoofed clicks, shared by the installed hook, or local to a click of clickElement() without it.
 * Its state is kept in the closure, so the page cannot read or replace it, and the returned object is frozen,
 * so the page cannot replace its functions, but it can call them.
 *
 * @param isAllSpoofed Whether to spoof `isTrusted` for all untrusted click-related events on the page.
 *
 * @returns Frozen object with functions over the private state.
 */
export const createSpoofedClicks = (isAllSpoofed = false): SpoofedClicks => {
    // Spoofed events mapped to their proxies, so all listeners of an event receive the same proxy
    const proxies = new WeakMap<Event, Event>();
    let isAllEventsSpoofed = isAllSpoofed;
    let spoofForwardedClick: ((event: Event) => Event | undefined) | null = null;

    return Object.freeze({
        getDeliveredEvent: (event: Event): Event => {
            // A forwarded click is recognized by the first listener it reaches, unless it is recognized earlier
            const proxy = proxies.get(event) || spoofForwardedClick?.(event);
            if (proxy) {
                return proxy;
            }
            if (!isAllEventsSpoofed || event.isTrusted) {
                return event;
            }
            const pageEventProxy = createTrustedEventProxy(event);
            proxies.set(event, pageEventProxy);
            return pageEventProxy;
        },
        setProxy: (event: Event, proxy: Event): void => {
            proxies.set(event, proxy);
        },
        deleteProxy: (event: Event): void => {
            proxies.delete(event);
        },
        setForwardedClickSpoofer: (spoofer: ((event: Event) => Event | undefined) | null): void => {
            spoofForwardedClick = spoofer;
        },
        spoofAllEvents: (): void => {
            isAllEventsSpoofed = true;
        },
    });
};

/**
 * Returns spoofed clicks shared by spoofClickEventsIsTrusted() and clickElement() of all scriptlet injections,
 * which the hook stores on `EventTarget.prototype` once it is installed, so that it is not installed twice.
 * It is stored as a non-writable, non-enumerable and non-configurable property, so the page cannot replace it
 * once the hook is installed. The page can still define the property before, which prevents the installation,
 * as `true` of older versions does, but scriptlets usually run before the page scripts.
 *
 * @param installedClicks Spoofed clicks of the hook which has just been installed, to store them.
 *
 * @returns Spoofed clicks of the installed hook, true if the hook is installed without them,
 * e.g. by an older version, which stores `true` instead, or false if the hook is not installed,
 * or if the passed spoofed clicks cannot be stored.
 */
export const getSpoofedClicks = (installedClicks?: SpoofedClicks): SpoofedClicks | boolean => {
    const SPOOFED_CLICKS_KEY = Symbol.for('adg-spoof-click-isTrusted');
    const SPOOFED_CLICKS_FUNCTIONS = [
        'getDeliveredEvent',
        'setProxy',
        'deleteProxy',
        'setForwardedClickSpoofer',
        'spoofAllEvents',
    ];
    if (installedClicks) {
        // Throws if the page has made the prototype non-extensible, e.g. sealed it,
        // or has defined the property as non-configurable with a falsy value, which is not taken as installed
        try {
            Object.defineProperty(EventTarget.prototype, SPOOFED_CLICKS_KEY, {
                value: installedClicks,
                writable: false,
                enumerable: false,
                configurable: false,
            });
        } catch {
            return false;
        }
        return installedClicks;
    }
    const storedClicks = (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY];
    if (!storedClicks) {
        return false;
    }
    const isSpoofedClicks = SPOOFED_CLICKS_FUNCTIONS.every((name) => typeof storedClicks[name] === 'function');
    return isSpoofedClicks ? storedClicks : true;
};

/**
 * Spoof isTrusted for click-related events dispatched by `clickElement()`, and for the clicks which labels
 * forward from them to their controls, so that
 * programmatic clicks appear as real user interactions to the page's event handlers.
 * Event.prototype.isTrusted is non-configurable, so we wrap addEventListener
 * to proxy the event object that handlers receive (similar to ABP event-override).
 * All other events, including the page's own synthetic ones, are passed through unchanged,
 * unless spoofing of all events is enabled.
 * If `addEventListener()` or `removeEventListener()` cannot be replaced, e.g. another script has made them
 * read-only, or its spoofed clicks cannot be stored, e.g. the page has sealed `EventTarget.prototype`,
 * the hook is not installed, so events are not spoofed for listeners added by `addEventListener()`,
 * but `clickElement()` still spoofs them for the inline and React handlers of the clicked element.
 *
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/491}
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/582}
 *
 * @param isAllSpoofed Whether to spoof `isTrusted` for all untrusted click-related events on the page,
 * including the page's own ones. It is enabled for the whole page, even if the hook is already installed,
 * and may break the page, e.g. guards which compare events, see #582.
 *
 * @returns True if the hook is installed, now or by an earlier call, false if it cannot be installed.
 */
export const spoofClickEventsIsTrusted = (isAllSpoofed = false): boolean => {
    const installedClicks = getSpoofedClicks();
    if (installedClicks) {
        // Older versions do not share their state, and they spoof all events anyway.
        // It works only if an older version installs its hook first: otherwise, e.g. if another AdGuard product
        // with an older version runs on the page as well, its hook is not installed, as it only checks whether
        // the key is set, and its clickElement() does not register its events, so they reach listeners unspoofed
        // until the page is reloaded, unless a rule sets `isTrusted:all`. Older versions leave no other marker,
        // so this hook cannot tell whether one runs on the page.
        if (isAllSpoofed && installedClicks !== true) {
            installedClicks.spoofAllEvents();
        }
        return true;
    }

    const spoofedClicks = createSpoofedClicks(isAllSpoofed);

    const SPOOFED_EVENTS = new Set([
        'click',
        'mousedown',
        'mouseup',
        'mouseover',
        'mouseenter',
        'pointerdown',
        'pointerup',
        'pointerover',
        'pointerenter',
    ]);

    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

    /**
     * Stable wrappers keyed by the original listener reference (function or EventListenerObject).
     * Value is a Map from "type\0capture" composite key to the wrapped function.
     */
    const wrappedListeners = new WeakMap<object, Map<string, EventListener>>();

    /**
     * Checks whether native registration converts the options parameter to an options dictionary:
     * objects, including functions, are converted to it, other values to a boolean.
     *
     * @param options Options parameter from addEventListener or removeEventListener.
     *
     * @returns True if the options are converted to an options dictionary.
     */
    const isOptionsDictionary = (options: unknown): options is EventListenerOptions => {
        return options !== null && (typeof options === 'object' || typeof options === 'function');
    };

    /**
     * Normalizes the capture option from various addEventListener signatures
     * the same way as native registration does.
     *
     * @param options Options parameter from addEventListener.
     *
     * @returns Capture boolean value.
     */
    const normalizeCapture = (
        options?: boolean | AddEventListenerOptions | EventListenerOptions,
    ): boolean => {
        return isOptionsDictionary(options) ? !!options.capture : !!options;
    };

    /**
     * Generates a composite key for the wrapped listeners map.
     *
     * @param type Event type.
     * @param capture Normalized capture option.
     *
     * @returns Composite key.
     */
    const getMapKey = (type: string, capture: boolean): string => {
        return `${type}\0${capture}`;
    };

    const addEventListenerWrapper = function addEventListenerWrapper(
        this: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ) {
        if (!listener || !SPOOFED_EVENTS.has(type)) {
            return nativeAddEventListener.call(this, type, listener, options);
        }

        const isFn = typeof listener === 'function';
        // Options are read once, in the native order, and native registration gets the values read,
        // so it agrees with the wrapper lookup even if the options are getters returning different values
        const capture = normalizeCapture(options);
        let nativeOptions: boolean | AddEventListenerOptions = capture;
        if (isOptionsDictionary(options)) {
            // Absent members are undefined, which native registration treats as not passed
            nativeOptions = {
                capture,
                once: options.once,
                passive: options.passive,
                signal: options.signal,
            };
        }
        const key = getMapKey(type, capture);

        const listenerRef = listener as object;
        let map = wrappedListeners.get(listenerRef);
        if (!map) {
            map = new Map();
            wrappedListeners.set(listenerRef, map);
        }

        // Reuse the wrapper of the same (listener, type, capture) so native registration deduplicates it
        let wrapped = map.get(key);
        if (!wrapped) {
            wrapped = function wrappedListener(this: any, event: Event) {
                // Only scriptlet clicks are spoofed, with one proxy shared by all listeners.
                // Other events keep their identity, e.g. for guards comparing them with window.event,
                // unless spoofing of all events is enabled.
                const delivered = spoofedClicks.getDeliveredEvent(event);
                if (isFn) {
                    return (listener as EventListener).call(this, delivered);
                }
                return (listener as EventListenerObject).handleEvent.call(listener, delivered);
            };
            map.set(key, wrapped);
        }

        return nativeAddEventListener.call(this, type, wrapped, nativeOptions);
    };

    const removeEventListenerWrapper = function removeEventListenerWrapper(
        this: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ) {
        if (!listener || !SPOOFED_EVENTS.has(type)) {
            return nativeRemoveEventListener.call(this, type, listener, options);
        }

        // Read once, so the wrapper lookup and both native removals agree on it,
        // as capture is the only option that matters for removal
        const capture = normalizeCapture(options);
        const wrapped = wrappedListeners.get(listener as object)?.get(getMapKey(type, capture));
        if (wrapped) {
            // Other targets may still use this wrapper; native listeners own registration and option cleanup.
            nativeRemoveEventListener.call(this, type, wrapped, capture);
        }

        // Also removes a registration made before the hook was installed
        return nativeRemoveEventListener.call(this, type, listener, capture);
    };

    // Another script may have made the methods read-only. Assigning them throws in strict mode
    // and is ignored otherwise, as in the injected scriptlet code, so whether they are replaced is checked.
    // If not, spoofing is skipped, so the scriptlet still clicks the same way in both modes,
    // and no wrapper is left installed without the other one.
    try {
        EventTarget.prototype.addEventListener = addEventListenerWrapper;
        EventTarget.prototype.removeEventListener = removeEventListenerWrapper;
    } catch {
        // Checked below
    }
    const isAddInstalled = EventTarget.prototype.addEventListener === addEventListenerWrapper;
    const isRemoveInstalled = EventTarget.prototype.removeEventListener === removeEventListenerWrapper;
    // Spoofed clicks are stored last, as their property cannot be removed. If they cannot be stored,
    // the wrappers are removed as well, since clickElement() could not register its events with them,
    // and the hook of each later injection would wrap them again
    if (isAddInstalled && isRemoveInstalled && getSpoofedClicks(spoofedClicks)) {
        return true;
    }

    // Methods replaced by the wrappers are writable, so they are restored
    if (isAddInstalled) {
        EventTarget.prototype.addEventListener = nativeAddEventListener;
    }
    if (isRemoveInstalled) {
        EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
    }
    return false;
};

/**
 * Triggers a synthetic attribute mutation on documentElement
 * to wake up the main MutationObserver.
 */
export const triggerMainObserver = () => {
    // randomize attribute name to avoid conflicts
    // prefix with 'a' to ensure valid attribute name (must start with a letter)
    const randomName = `adg-${randomId()}`;
    const el = document.documentElement;
    el.setAttribute(randomName, '');
    el.removeAttribute(randomName);
};

/**
 * Sets up load event listeners on iframe elements so that when their
 * content finishes loading, the main observer is triggered to re-check selectors.
 *
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/491}
 *
 * @param nodes NodeList or array of nodes to check for iframes.
 */
export const bridgeIframeLoads = (nodes: NodeList) => {
    Array.from(nodes).forEach((node) => {
        if (node instanceof HTMLIFrameElement) {
            node.addEventListener('load', () => {
                triggerMainObserver();
            });
        }

        // Also check descendants for iframes
        if (node instanceof Element) {
            const iframes = node.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
                iframe.addEventListener('load', () => {
                    triggerMainObserver();
                });
            });
        }
    });
};

/**
 * Clicks an element using React's internal event handlers if available,
 * otherwise falls back to native click.
 *
 * Some React applications don't respond to native click events,
 * so we need to trigger React's synthetic event handlers directly.
 *
 * Dispatched events are spoofed for the listeners hooked by spoofClickEventsIsTrusted()
 * and for the inline handler of the element, with one proxy of an event shared by all of them.
 * If the click activates a label, the click which the label forwards to its control is spoofed as well:
 * the label is taken from the event path of the click right before it is dispatched,
 * also through assigned slots and shadow hosts, and its control is resolved when the forwarded click
 * starts at the window, see getActivatedLabel(), createForwardedClickSpoofer() and isDispatchedOnControl().
 *
 * @param element HTML element to click.
 * @param clickType Optional click mode. Use 'native' to bypass React internal handlers.
 */
export const clickElement = (element: HTMLElement, clickType = ''): void => {
    const REACT_PROPS_KEY_PREFIX = '__reactProps$';
    const NATIVE_CLICK_TYPE = 'native';

    // Simulate a realistic click because it may not be enough to execute element.click()
    // https://github.com/AdguardTeam/Scriptlets/issues/491
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const commonOpts: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: x,
        clientY: y,
        screenX: x + window.screenX,
        screenY: y + window.screenY,
        button: 0,
        buttons: 1,
    };

    const noBubbleOpts: MouseEventInit = Object.assign({}, commonOpts, { bubbles: false });
    const releaseOpts: MouseEventInit = Object.assign({}, commonOpts, { buttons: 0 });

    /**
     * Creates a trusted-looking event for React handlers that are called directly.
     *
     * React handlers need extra SyntheticEvent-like fields such as
     * `nativeEvent`, `persist()`, `isDefaultPrevented()` and stable
     * `currentTarget`. Other fields, including `nativeEvent` itself,
     * come from the native event proxy, so they report `isTrusted` as `true` as well.
     *
     * @param nativeEvent Original DOM event.
     * @param eventType Event type exposed to the handler.
     *
     * @returns Proxied SyntheticEvent-like event.
     */
    const createReactEventProxy = (nativeEvent: Event, eventType: string): Event => {
        const nativeEventProxy = createTrustedEventProxy(nativeEvent);
        // React reports these calls even for non-cancelable events. Other changes, e.g. made through
        // `nativeEvent` or legacy setters, are read from the native event.
        let isPreventDefaultCalled = false;
        let isStopPropagationCalled = false;
        const isDefaultPrevented = () => {
            return isPreventDefaultCalled || nativeEvent.defaultPrevented;
        };
        const isPropagationStopped = () => {
            return isStopPropagationCalled || nativeEvent.cancelBubble;
        };

        return new Proxy(nativeEvent, {
            get(target, prop) {
                if (prop === 'nativeEvent') {
                    return nativeEventProxy;
                }
                if (prop === 'target' || prop === 'srcElement' || prop === 'currentTarget') {
                    return element;
                }
                if (prop === 'type') {
                    return eventType;
                }
                if (prop === 'defaultPrevented') {
                    return isDefaultPrevented();
                }
                if (prop === 'persist') {
                    return () => {};
                }
                if (prop === 'isDefaultPrevented') {
                    return isDefaultPrevented;
                }
                if (prop === 'isPropagationStopped') {
                    return isPropagationStopped;
                }
                if (prop === 'preventDefault') {
                    return () => {
                        isPreventDefaultCalled = true;
                        target.preventDefault();
                    };
                }
                if (prop === 'stopPropagation') {
                    return () => {
                        isStopPropagationCalled = true;
                        target.stopPropagation();
                    };
                }
                if (prop === 'stopImmediatePropagation') {
                    return () => {
                        isStopPropagationCalled = true;
                        if (typeof target.stopImmediatePropagation === 'function') {
                            target.stopImmediatePropagation();
                        }
                    };
                }

                return Reflect.get(nativeEventProxy, prop);
            },
            set(target, prop, value) {
                return Reflect.set(nativeEventProxy, prop, value);
            },
        });
    };

    /**
     * Temporarily wraps the inline `on...` handler of the clicked element for one dispatch,
     * so it receives the proxied event with spoofed `isTrusted` for events dispatched by the scriptlet,
     * and for the click which a label forwards from it to its control.
     * Wrapping right before the dispatch also covers handlers that the page assigned
     * during earlier events of the click sequence.
     *
     * @param eventType Type of the event about to be dispatched.
     * @param getDeliveredEvent Returns the event to deliver to listeners: its proxy if it is spoofed.
     *
     * @returns Cleanup function that restores the original inline handler unless the page changed it.
     */
    const wrapInlineHandler = (eventType: string, getDeliveredEvent: (event: Event) => Event): (() => void) => {
        const elementRecord = element as unknown as Record<string, unknown>;
        const propertyName = `on${eventType}`;
        const handler = elementRecord[propertyName];

        if (typeof handler !== 'function') {
            return () => {};
        }

        const wrappedHandler = function wrappedInlineHandler(this: unknown, event: Event) {
            return handler.call(this, getDeliveredEvent(event));
        };
        try {
            elementRecord[propertyName] = wrappedHandler;
        } catch {
            // A non-writable handler stays unwrapped, but the click sequence must still complete
            return () => {};
        }

        return () => {
            try {
                // Keep a handler that the page replaced or cleared during the dispatch
                if (elementRecord[propertyName] === wrappedHandler) {
                    elementRecord[propertyName] = handler;
                }
            } catch {
                // A handler that can no longer be restored must not stop the click sequence
            }
        };
    };

    /**
     * Creates a focus event for the direct React handler path.
     *
     * @returns Focus event object compatible with the current environment.
     */
    const createFocusEvent = (): Event => {
        if (typeof FocusEvent === 'function') {
            return new FocusEvent('focus', {
                bubbles: false,
                cancelable: false,
                composed: true,
                relatedTarget: null,
            });
        }

        return new Event('focus', {
            bubbles: false,
            cancelable: false,
            composed: true,
        });
    };

    /**
     * Dispatches the synthetic pointer and mouse sequence used by the native click path.
     * Each dispatched event is registered with its proxy, so listeners and the element's
     * inline handler receive the same spoofed event. Other events are spoofed only if a label forwards
     * the click to its control, or with `isTrusted:all`, see `SpoofedClicks.getDeliveredEvent()`.
     */
    const dispatchNativeClick = (): void => {
        const sharedClicks = getSpoofedClicks();
        // Shared with spoofClickEventsIsTrusted(), or local to this click without the hook
        // or with a hook of an older version, which does not share them
        const spoofedClicks = typeof sharedClicks === 'object' ? sharedClicks : createSpoofedClicks();

        const dispatch = (event: Event): void => {
            spoofedClicks.setProxy(event, createTrustedEventProxy(event));
            // Inline handler receives the same event as hooked listeners
            const restoreInlineHandler = wrapInlineHandler(event.type, spoofedClicks.getDeliveredEvent);
            try {
                element.dispatchEvent(event);
            } finally {
                spoofedClicks.deleteProxy(event);
                restoreInlineHandler();
            }
        };

        // The browser forwards a click on a label, or inside it, to the label's control as a separate event.
        // It is a direct result of the scriptlet click, so it is spoofed as well, with one proxy for all listeners.
        // Proxies of forwarded clicks are kept here, as the clicks occur only while the scriptlet click is dispatched.
        const forwardedClickProxies = new WeakMap<Event, Event>();

        /**
         * Returns the host of the shadow root which contains the node.
         *
         * @param node Node to get the shadow host for.
         *
         * @returns The shadow host, or null if the node is not inside a shadow root.
         */
        const getShadowHost = (node: Node): Element | null => {
            let root: Node = node;
            if (typeof node.getRootNode === 'function') {
                root = node.getRootNode();
            } else {
                // `getRootNode()` is not supported by Firefox 52, so the root is found through parents
                while (root.parentNode) {
                    root = root.parentNode;
                }
            }
            return root.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? (root as ShadowRoot).host || null : null;
        };

        /**
         * Returns the node which follows the given one in an event path:
         * the slot it is assigned to, its parent, or the host of its shadow root.
         * A slot of a closed shadow root is not exposed, so it is skipped.
         *
         * @param node Node of the event path.
         *
         * @returns The next node of the event path, or null if there is none.
         */
        const getEventPathParent = (node: Node): Node | null => {
            const { assignedSlot } = node as Element;
            if (assignedSlot) {
                return assignedSlot;
            }
            if (node.parentNode?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                return getShadowHost(node);
            }
            return node.parentNode;
        };

        /**
         * Returns the label which a click on the clicked element activates, i.e. the first label in its event path:
         * the clicked element or its ancestor, also through the slot it is assigned to and through shadow hosts.
         * A slot of a closed shadow root is not exposed, so a label which contains it is not found.
         *
         * @returns The activated label, or null if there is no label in the event path.
         */
        const getActivatedLabel = (): HTMLLabelElement | null => {
            const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
            let node: Node | null = element;
            while (node) {
                // `nodeName` is lowercase in XHTML documents, so the local name and namespace are checked
                if ((node as Element).localName === 'label' && (node as Element).namespaceURI === HTML_NAMESPACE) {
                    return node as HTMLLabelElement;
                }
                node = getEventPathParent(node);
            }
            return null;
        };

        /**
         * Checks whether the clicked element is the label's control or inside it,
         * as the browser does not forward such click to the control.
         *
         * @param label Label activated by the click.
         * @param labelControl The label's control.
         *
         * @returns True if the control is in the event path of the clicked element before the label.
         */
        const isClickedInsideControl = (label: HTMLLabelElement, labelControl: HTMLElement): boolean => {
            let node: Node | null = element;
            while (node && node !== label) {
                if (node === labelControl) {
                    return true;
                }
                node = getEventPathParent(node);
            }
            return false;
        };

        /**
         * Checks whether the event is dispatched on the label's control.
         * The origin of the event is the first node of its path, as seen by the current listener.
         * Nodes of a closed shadow tree are hidden from listeners outside it, so for them
         * the path starts at its host, which matches the control only if such a tree contains the control.
         * So any click inside such a tree, or on its host, matches for them, as they see the same origin.
         * A host of an open shadow tree does not match, as the listeners which see it see the nodes inside as well.
         * Other events inside the control's shadow tree have other origins,
         * even if their target, as seen by listeners outside, is a shadow host of the control.
         *
         * @param event Event received by a listener.
         * @param labelControl The label's control.
         *
         * @returns True if the event is dispatched on the label's control.
         */
        const isDispatchedOnControl = (event: Event, labelControl: HTMLElement | null): boolean => {
            // `composedPath()` is not supported by Firefox 52-58, which do not support shadow DOM either,
            // so the target of the event is its origin there
            const origin = typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
            let isHidden = false;
            let node: Node | null = labelControl;
            while (node) {
                if (node === origin) {
                    return node === labelControl || isHidden;
                }
                const host = getShadowHost(node);
                // Closed shadow root is not exposed by its host, so the host is the origin of the events inside,
                // but not the host of an open shadow root above it, which exposes the closed root's host
                isHidden = !!host && !host.shadowRoot;
                node = host;
            }
            return false;
        };

        /**
         * Creates a function which spoofs the click that the label forwards to its control.
         * The control is resolved when the forwarded click arrives, as the browser does,
         * since page handlers of the click may change the label's `for` or replace its control.
         * The forwarded click is recognized once, when it starts at the window, and its proxy is reused,
         * as handlers of the control may change the label's `for` or replace the control as well,
         * before the forwarded click reaches other listeners.
         * A click which the page dispatches on the control during the scriptlet click is spoofed as well,
         * as it cannot be told apart from the forwarded one in the browsers which forward it as trusted,
         * e.g. the Chrome version which runs the tests, so such distinction could not be tested,
         * and so is a click on any element of a closed shadow root which contains the control, or on its host,
         * see isDispatchedOnControl().
         *
         * @param label Label activated by the click.
         * @param scriptletClick Click dispatched by the scriptlet, which has its own proxy.
         *
         * @returns Function which returns the proxy of the forwarded click, or undefined for other events.
         */
        const createForwardedClickSpoofer = (
            label: HTMLLabelElement,
            scriptletClick: Event,
        ): ((event: Event) => Event | undefined) => {
            return (event: Event): Event | undefined => {
                const forwardedClickProxy = forwardedClickProxies.get(event);
                if (forwardedClickProxy) {
                    return forwardedClickProxy;
                }
                if (event === scriptletClick || event.type !== 'click' || event.isTrusted) {
                    return undefined;
                }
                const labelControl = label.control;
                // A click on the control, or inside it, is not forwarded, so a click on the control is the page's own
                if (
                    !labelControl
                    || isClickedInsideControl(label, labelControl)
                    || !isDispatchedOnControl(event, labelControl)
                ) {
                    return undefined;
                }
                const proxy = createTrustedEventProxy(event);
                forwardedClickProxies.set(event, proxy);
                return proxy;
            };
        };

        // Feature-detect PointerEvent for environments that don't support it
        const hasPointerEvent = typeof PointerEvent === 'function';
        if (hasPointerEvent) {
            dispatch(new PointerEvent('pointerover', commonOpts));
            dispatch(new PointerEvent('pointerenter', noBubbleOpts));
        }
        dispatch(new MouseEvent('mouseover', commonOpts));
        dispatch(new MouseEvent('mouseenter', noBubbleOpts));
        if (hasPointerEvent) {
            dispatch(new PointerEvent('pointerdown', commonOpts));
        }
        dispatch(new MouseEvent('mousedown', commonOpts));
        element.focus();
        if (hasPointerEvent) {
            dispatch(new PointerEvent('pointerup', releaseOpts));
        }
        dispatch(new MouseEvent('mouseup', releaseOpts));
        // The label is found right before the click, as the browser fixes the event path when it dispatches
        // the click, so page handlers of the click may move the clicked element out of the label
        const label = getActivatedLabel();
        const clickEvent = new MouseEvent('click', releaseOpts);
        const spoofForwardedClick = label ? createForwardedClickSpoofer(label, clickEvent) : null;
        spoofedClicks.setForwardedClickSpoofer(spoofForwardedClick);
        try {
            if (spoofForwardedClick) {
                // The forwarded click is recognized when it starts at the window, before handlers of the control
                // may change the label's `for` or replace the control. If the hook is installed, its wrapper
                // of the spoofer recognizes it already, otherwise the spoofer does as a listener.
                try {
                    window.addEventListener('click', spoofForwardedClick, true);
                } catch {
                    // The page may have replaced the method; the forwarded click is recognized by listeners then
                }
            }
            dispatch(clickEvent);
        } finally {
            // Cleared first, so the spoofer is not left for other clicks even if the removal throws.
            // There is no spoofer of another click to restore, as clickElement() runs when the scriptlet starts,
            // which is when the page or the frame loads, or from timers and observer callbacks,
            // so not during the dispatch of another click.
            spoofedClicks.setForwardedClickSpoofer(null);
            if (spoofForwardedClick) {
                try {
                    window.removeEventListener('click', spoofForwardedClick, true);
                } catch {
                    // Nothing else to clean up
                }
            }
        }
    };

    // Find React internal props key on the element
    const reactPropsKey = Object.keys(element).find((key) => key.startsWith(REACT_PROPS_KEY_PREFIX));

    // If React props are found, try to use React's handlers
    // If clickType is 'native', skip React handlers and dispatch native click directly
    // https://github.com/AdguardTeam/Scriptlets/issues/554
    if (reactPropsKey && clickType !== NATIVE_CLICK_TYPE) {
        const reactProps = (element as unknown as Record<string, unknown>)[reactPropsKey] as {
            onFocus?: (event?: Event) => void;
            onClick?: (event?: Event) => void;
        } | undefined;

        if (reactProps && typeof reactProps.onClick === 'function') {
            // Call onFocus first if available, as some React components require it
            if (typeof reactProps.onFocus === 'function') {
                const focusEvent = createFocusEvent();
                const eventFocusProxy = createReactEventProxy(focusEvent, 'focus');
                reactProps.onFocus.call(element, eventFocusProxy);
            }
            const clickEvent = new MouseEvent('click', releaseOpts);
            const eventClickProxy = createReactEventProxy(clickEvent, 'click');
            reactProps.onClick.call(element, eventClickProxy);
            return;
        }
    }

    dispatchNativeClick();
};
