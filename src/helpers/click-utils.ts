import { randomId } from './random-id';

/**
 * State shared by spoofClickEventsIsTrusted() and clickElement() of all scriptlet injections.
 */
type SpoofedClicks = {
    /**
     * Events dispatched by clickElement() mapped to their spoofed proxies.
     */
    proxies: WeakMap<Event, Event>;

    /**
     * Set by clickElement() while it dispatches a click on a label or inside it:
     * spoofs the click that the label forwards to its control and returns its proxy.
     */
    spoofForwardedClick: ((event: Event) => Event | undefined) | null;
};

/**
 * Spoof isTrusted for click-related events dispatched by `clickElement()` so that
 * programmatic clicks appear as real user interactions to the page's event handlers.
 * Event.prototype.isTrusted is non-configurable, so we wrap addEventListener
 * to proxy the event object that handlers receive (similar to ABP event-override).
 * All other events, including the page's own synthetic ones, are passed through unchanged.
 *
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/491}
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/582}
 */
export const spoofClickEventsIsTrusted = (): void => {
    // Shared with clickElement() of all scriptlet injections, see SpoofedClicks.
    // Its presence also guards against double-patching.
    const SPOOFED_CLICKS_KEY = Symbol.for('adg-spoof-click-isTrusted');
    if ((EventTarget.prototype as any)[SPOOFED_CLICKS_KEY]) {
        return;
    }

    const spoofedClicks: SpoofedClicks = {
        proxies: new WeakMap(),
        spoofForwardedClick: null,
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
        // Objects, including functions, are converted to an options dictionary, other values to a boolean
        if (options !== null && (typeof options === 'object' || typeof options === 'function')) {
            return !!(options as EventListenerOptions).capture;
        }
        return !!options;
    };

    /**
     * Generates a composite key for the wrapped listeners map.
     *
     * @param type Event type.
     * @param options Options parameter from addEventListener.
     *
     * @returns Composite key.
     */
    const getMapKey = (
        type: string,
        options?: boolean | AddEventListenerOptions | EventListenerOptions,
    ): string => {
        return `${type}\0${normalizeCapture(options)}`;
    };

    EventTarget.prototype.addEventListener = function addEventListenerWrapper(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ) {
        if (!listener || !SPOOFED_EVENTS.has(type)) {
            return nativeAddEventListener.call(this, type, listener, options);
        }

        const isFn = typeof listener === 'function';
        const key = getMapKey(type, options);

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
                // Other events keep their identity, e.g. for guards comparing them with window.event.
                // A forwarded click is recognized by the first listener it reaches.
                const delivered = spoofedClicks.proxies.get(event)
                    || spoofedClicks.spoofForwardedClick?.(event)
                    || event;
                if (isFn) {
                    return (listener as EventListener).call(this, delivered);
                }
                return (listener as EventListenerObject).handleEvent.call(listener, delivered);
            };
            map.set(key, wrapped);
        }

        return nativeAddEventListener.call(this, type, wrapped, options);
    };

    EventTarget.prototype.removeEventListener = function removeEventListenerWrapper(
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

    (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY] = spoofedClicks;
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
     * Creates a proxy of a native event with `isTrusted` spoofed to `true`
     * for listeners and inline handlers.
     *
     * @param nativeEvent Original DOM event.
     *
     * @returns Proxied event.
     */
    const createNativeEventProxy = (nativeEvent: Event): Event => {
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
        const nativeEventProxy = createNativeEventProxy(nativeEvent);
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
     * so it receives the proxied event with spoofed `isTrusted` for events dispatched by the scriptlet.
     * Wrapping right before the dispatch also covers handlers that the page assigned
     * during earlier events of the click sequence.
     *
     * @param eventType Type of the event about to be dispatched.
     * @param eventProxies Proxies of the events dispatched by the scriptlet.
     *
     * @returns Cleanup function that restores the original inline handler unless the page changed it.
     */
    const wrapInlineHandler = (eventType: string, eventProxies: WeakMap<Event, Event>): (() => void) => {
        const elementRecord = element as unknown as Record<string, unknown>;
        const propertyName = `on${eventType}`;
        const handler = elementRecord[propertyName];

        if (typeof handler !== 'function') {
            return () => {};
        }

        const wrappedHandler = function wrappedInlineHandler(this: unknown, event: Event) {
            return handler.call(this, eventProxies.get(event) || event);
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
     * inline handler receive the same spoofed event, and no other event is spoofed.
     */
    const dispatchNativeClick = (): void => {
        const sharedClicks = (EventTarget.prototype as any)[SPOOFED_CLICKS_KEY];
        // Duck-typed: the page may replace the WeakMap global, and older versions store `true` here
        const spoofedClicks: SpoofedClicks = typeof sharedClicks?.proxies?.get === 'function'
            ? sharedClicks
            : { proxies: new WeakMap(), spoofForwardedClick: null };
        const eventProxies = spoofedClicks.proxies;

        const dispatch = (event: Event): void => {
            eventProxies.set(event, createNativeEventProxy(event));
            const restoreInlineHandler = wrapInlineHandler(event.type, eventProxies);
            try {
                element.dispatchEvent(event);
            } finally {
                eventProxies.delete(event);
                restoreInlineHandler();
            }
        };

        // The browser forwards a click on a label, or inside it, to the label's control as a separate event.
        // It is a direct result of the scriptlet click, so it is spoofed as well.
        const labelControl = element.closest('label')?.control;
        const forwardedClicks: Event[] = [];

        /**
         * Checks whether an event target, as seen by a listener, is the label's control.
         * Listeners outside the control's shadow tree see one of its shadow hosts instead.
         *
         * @param target Event target seen by a listener.
         *
         * @returns True if the target is the label's control or one of its shadow hosts.
         */
        const isLabelControl = (target: EventTarget | null): boolean => {
            let node: Node | null | undefined = labelControl;
            while (node) {
                if (node === target) {
                    return true;
                }
                const root: Node = node.getRootNode();
                node = root.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? (root as ShadowRoot).host : null;
            }
            return false;
        };

        const spoofForwardedClick = (event: Event): Event | undefined => {
            if (event.type !== 'click' || event.isTrusted || !isLabelControl(event.target)) {
                return undefined;
            }
            const proxy = createNativeEventProxy(event);
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
        const previousSpoofForwardedClick = spoofedClicks.spoofForwardedClick;
        spoofedClicks.spoofForwardedClick = labelControl ? spoofForwardedClick : null;
        try {
            dispatch(new MouseEvent('click', releaseOpts));
        } finally {
            spoofedClicks.spoofForwardedClick = previousSpoofForwardedClick;
            forwardedClicks.forEach((event) => eventProxies.delete(event));
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
