import { randomId } from './random-id';

/**
 * State shared by spoofClickEventsIsTrusted() and clickElement() of all scriptlet injections.
 */
export type SpoofedClicks = {
    /**
     * Spoofed events mapped to their proxies, so all listeners of an event receive the same proxy:
     * events dispatched by clickElement(), clicks forwarded from them by labels,
     * and other events if `isAllSpoofed` is set.
     */
    proxies: WeakMap<Event, Event>;

    /**
     * Whether `isTrusted` is spoofed for all untrusted click-related events on the page,
     * including the page's own ones. Set by any rule with `isTrusted:all` for the whole page.
     */
    isAllSpoofed: boolean;

    /**
     * Set by clickElement() while it dispatches a click which activates a label:
     * spoofs the click that the label forwards to its control and returns its proxy.
     */
    spoofForwardedClick: ((event: Event) => Event | undefined) | null;
};

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
 * Returns the event to deliver to a listener or an inline handler: the proxy of a spoofed event,
 * i.e. of an event dispatched by `clickElement()`, of a click forwarded from it by a label,
 * or with `isTrusted:all`, of an untrusted page event, otherwise the event itself.
 * It is used by the listener wrappers and by `clickElement()` for the inline handler,
 * and a created proxy is stored, so all of them receive the same proxy of an event.
 * Trusted events are passed unchanged, as they are trusted anyway.
 *
 * @param spoofedClicks State shared by `spoofClickEventsIsTrusted()` and `clickElement()`.
 * @param event Event received by a listener or an inline handler.
 *
 * @returns Proxy of the event if it is spoofed, otherwise the event itself.
 */
export const getDeliveredClickEvent = (spoofedClicks: SpoofedClicks, event: Event): Event => {
    // A forwarded click is recognized by the first listener it reaches, unless it is recognized earlier
    const proxy = spoofedClicks.proxies.get(event) || spoofedClicks.spoofForwardedClick?.(event);
    if (proxy) {
        return proxy;
    }
    if (!spoofedClicks.isAllSpoofed || event.isTrusted) {
        return event;
    }
    const pageEventProxy = createTrustedEventProxy(event);
    spoofedClicks.proxies.set(event, pageEventProxy);
    return pageEventProxy;
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
 * read-only, the hook is not installed, so events are not spoofed for listeners added by `addEventListener()`,
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
    // Shared with clickElement() of all scriptlet injections, see SpoofedClicks.
    // Its presence also guards against double-patching.
    const SPOOFED_CLICKS_KEY = Symbol.for('adg-spoof-click-isTrusted');
    const installedClicks = (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY];
    if (installedClicks) {
        // Older versions store `true` here, and they spoof all events anyway
        if (isAllSpoofed && typeof installedClicks === 'object') {
            installedClicks.isAllSpoofed = true;
        }
        return true;
    }

    const spoofedClicks: SpoofedClicks = {
        proxies: new WeakMap(),
        spoofForwardedClick: null,
        isAllSpoofed,
    };

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
                const delivered = getDeliveredClickEvent(spoofedClicks, event);
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
    if (!isAddInstalled || !isRemoveInstalled) {
        // Methods replaced by the wrappers are writable, so they are restored
        if (isAddInstalled) {
            EventTarget.prototype.addEventListener = nativeAddEventListener;
        }
        if (isRemoveInstalled) {
            EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
        }
        return false;
    }

    (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY] = spoofedClicks;
    return true;
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
 * @param element HTML element to click.
 * @param clickType Optional click mode. Use 'native' to bypass React internal handlers.
 */
export const clickElement = (element: HTMLElement, clickType = ''): void => {
    const REACT_PROPS_KEY_PREFIX = '__reactProps$';
    const NATIVE_CLICK_TYPE = 'native';
    // State shared with spoofClickEventsIsTrusted(), see SpoofedClicks
    const SPOOFED_CLICKS_KEY = Symbol.for('adg-spoof-click-isTrusted');

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
        const isDefaultPrevented = () => isPreventDefaultCalled || nativeEvent.defaultPrevented;
        const isPropagationStopped = () => isStopPropagationCalled || nativeEvent.cancelBubble;

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
     * the click to its control, or with `isTrusted:all`, see `getDeliveredClickEvent()`.
     */
    const dispatchNativeClick = (): void => {
        const sharedClicks = (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY];
        // Duck-typed: the page may replace the WeakMap global, and older versions store `true` here
        const spoofedClicks: SpoofedClicks = typeof sharedClicks?.proxies?.get === 'function'
            ? sharedClicks
            : { proxies: new WeakMap(), spoofForwardedClick: null, isAllSpoofed: false };
        const eventProxies = spoofedClicks.proxies;

        /**
         * Returns the event to deliver to the inline handler, as hooked listeners do.
         *
         * @param event Event received by the inline handler.
         *
         * @returns Proxy of the event if it is spoofed, otherwise the event itself.
         */
        const getDeliveredEvent = (event: Event): Event => getDeliveredClickEvent(spoofedClicks, event);

        const dispatch = (event: Event): void => {
            eventProxies.set(event, createTrustedEventProxy(event));
            const restoreInlineHandler = wrapInlineHandler(event.type, getDeliveredEvent);
            try {
                element.dispatchEvent(event);
            } finally {
                eventProxies.delete(event);
                restoreInlineHandler();
            }
        };

        // The browser forwards a click on a label, or inside it, to the label's control as a separate event.
        // It is a direct result of the scriptlet click, so it is spoofed as well.
        const forwardedClicks: Event[] = [];

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
         * e.g. the Chrome version which runs the tests, so such distinction could not be tested.
         *
         * @param label Label activated by the click.
         *
         * @returns Function which returns the proxy of the forwarded click, or undefined for other events.
         */
        const createForwardedClickSpoofer = (label: HTMLLabelElement) => (event: Event): Event | undefined => {
            const recognizedProxy = eventProxies.get(event);
            if (recognizedProxy) {
                return recognizedProxy;
            }
            if (event.type !== 'click' || event.isTrusted) {
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
            eventProxies.set(event, proxy);
            forwardedClicks.push(event);
            return proxy;
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
        const spoofForwardedClick = label ? createForwardedClickSpoofer(label) : null;
        const previousSpoofForwardedClick = spoofedClicks.spoofForwardedClick;
        // The forwarded click is recognized when it starts at the window, before handlers of the control
        // may change the label's `for` or replace the control. If the hook is installed, its wrapper of this
        // listener recognizes it already, otherwise the listener does.
        const recognizeForwardedClick = (event: Event): void => {
            spoofForwardedClick?.(event);
        };
        try {
            spoofedClicks.spoofForwardedClick = spoofForwardedClick;
            if (spoofForwardedClick) {
                try {
                    window.addEventListener('click', recognizeForwardedClick, true);
                } catch {
                    // The page may have replaced the method; the forwarded click is recognized by listeners then
                }
            }
            dispatch(new MouseEvent('click', releaseOpts));
        } finally {
            // Restored first, so the spoofer is not left for other clicks even if the removal throws
            spoofedClicks.spoofForwardedClick = previousSpoofForwardedClick;
            forwardedClicks.forEach((event) => eventProxies.delete(event));
            if (spoofForwardedClick) {
                try {
                    window.removeEventListener('click', recognizeForwardedClick, true);
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
