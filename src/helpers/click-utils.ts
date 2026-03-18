import { randomId } from './random-id';

/**
 * Spoof isTrusted for click-related events so that programmatic clicks
 * appear as real user interactions to the page's event handlers.
 * Event.prototype.isTrusted is non-configurable, so we wrap addEventListener
 * to proxy the event object that handlers receive (similar to ABP event-override).
 *
 * @see {@link https://github.com/AdguardTeam/Scriptlets/issues/491}
 */
export const spoofClickEventsIsTrusted = (): void => {
    // Guard against double-patching when multiple scriptlet injections run
    const PATCHED_FLAG = Symbol.for('adg-spoof-click-isTrusted');
    if ((EventTarget.prototype as any)[PATCHED_FLAG]) {
        return;
    }

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
     * Single WeakMap keyed by the original listener reference (function or EventListenerObject).
     * Value is a Map from "type\0capture" composite key to the wrapped function.
     */
    const wrappedListeners = new WeakMap<object, Map<string, EventListener>>();

    /**
     * Normalizes the capture option from various addEventListener signatures.
     *
     * @param options Options parameter from addEventListener.
     *
     * @returns Capture boolean value.
     */
    const normalizeCapture = (
        options?: boolean | AddEventListenerOptions | EventListenerOptions,
    ): boolean => {
        if (typeof options === 'boolean') {
            return options;
        }
        return options?.capture ?? false;
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

        const wrapped: EventListener = function wrappedListener(this: any, event: Event) {
            const proxied = new Proxy(event, {
                get(target, prop) {
                    if (prop === 'isTrusted') {
                        return true;
                    }
                    const val = Reflect.get(target, prop);
                    if (typeof val === 'function') {
                        return val.bind(target);
                    }
                    return val;
                },
            });
            if (isFn) {
                return (listener as EventListener).call(this, proxied);
            }
            return (listener as EventListenerObject).handleEvent.call(listener, proxied);
        };

        const listenerRef = listener as object;
        let map = wrappedListeners.get(listenerRef);
        if (!map) {
            map = new Map();
            wrappedListeners.set(listenerRef, map);
        }
        // Do not overwrite if same listener already registered with same (type, capture)
        const existing = map.get(key);
        if (!existing) {
            map.set(key, wrapped);
        }

        return nativeAddEventListener.call(this, type, existing || wrapped, options);
    };

    EventTarget.prototype.removeEventListener = function removeEventListenerWrapper(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ) {
        if (!listener || !SPOOFED_EVENTS.has(type)) {
            return nativeRemoveEventListener.call(this, type, listener, options);
        }

        const listenerRef = listener as object;
        const key = getMapKey(type, options);
        const map = wrappedListeners.get(listenerRef);

        if (map && map.has(key)) {
            const wrapped = map.get(key)!;
            map.delete(key);
            return nativeRemoveEventListener.call(this, type, wrapped, options);
        }

        return nativeRemoveEventListener.call(this, type, listener, options);
    };

    // Mark as patched to prevent double-wrapping
    (EventTarget.prototype as any)[PATCHED_FLAG] = true;
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
     * Creates a trusted-looking event proxy for either React handlers or native
     * inline handlers.
     *
     * React handlers need extra SyntheticEvent-like fields such as
     * `nativeEvent`, `persist()`, `isDefaultPrevented()` and stable
     * `currentTarget`. Native inline handlers only need the original event with
     * `isTrusted` spoofed to `true`.
     *
     * @param nativeEvent Original DOM event.
     * @param eventType Event type exposed to the handler.
     * @param isReactEvent Whether to expose React-specific SyntheticEvent-like fields.
     *
     * @returns Proxied event object with the fields needed for the target handler type.
     */
    const createEventProxy = (nativeEvent: Event, eventType: string, isReactEvent = false): Event => {
        let defaultPrevented = nativeEvent.defaultPrevented;
        let propagationStopped = false;

        return new Proxy(nativeEvent, {
            get(target, prop) {
                if (prop === 'isTrusted') {
                    return true;
                }
                if (!isReactEvent) {
                    const value = Reflect.get(target, prop);
                    if (typeof value === 'function') {
                        return value.bind(target);
                    }

                    return value;
                }
                if (prop === 'nativeEvent') {
                    return target;
                }
                if (prop === 'target' || prop === 'srcElement' || prop === 'currentTarget') {
                    return element;
                }
                if (prop === 'type') {
                    return eventType;
                }
                if (prop === 'defaultPrevented') {
                    return defaultPrevented;
                }
                if (prop === 'persist') {
                    return () => {};
                }
                if (prop === 'isDefaultPrevented') {
                    return () => defaultPrevented;
                }
                if (prop === 'isPropagationStopped') {
                    return () => propagationStopped;
                }
                if (prop === 'preventDefault') {
                    return () => {
                        defaultPrevented = true;
                        target.preventDefault();
                    };
                }
                if (prop === 'stopPropagation') {
                    return () => {
                        propagationStopped = true;
                        target.stopPropagation();
                    };
                }
                if (prop === 'stopImmediatePropagation') {
                    return () => {
                        propagationStopped = true;
                        if (typeof target.stopImmediatePropagation === 'function') {
                            target.stopImmediatePropagation();
                        }
                    };
                }

                const value = Reflect.get(target, prop);
                if (typeof value === 'function') {
                    return value.bind(target);
                }

                return value;
            },
        });
    };

    /**
     * Temporarily wraps inline `on...` handlers on the clicked element so they receive
     * a proxied event with spoofed `isTrusted`.
     *
     * @param target Event target to inspect for inline handlers.
     * @param eventTypes Event types whose `on...` properties should be wrapped.
     *
     * @returns Cleanup function that restores original inline handlers.
     */
    const wrapInlineHandlers = (target: EventTarget, eventTypes: Set<string>): (() => void) => {
        const originalHandlers = new Map<string, OnErrorEventHandler | EventListener | null>();
        const targetRecord = target as unknown as Record<string, unknown>;

        eventTypes.forEach((eventType) => {
            const propertyName = `on${eventType}`;
            const handler = targetRecord[propertyName];

            if (typeof handler !== 'function' || originalHandlers.has(propertyName)) {
                return;
            }

            originalHandlers.set(propertyName, handler as EventListener);
            targetRecord[propertyName] = function wrappedInlineHandler(this: unknown, event: Event) {
                const onEventProxy = createEventProxy(event, eventType);
                return handler.call(this, onEventProxy);
            };
        });

        return () => {
            originalHandlers.forEach((handler, propertyName) => {
                targetRecord[propertyName] = handler;
            });
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
     * Dispatches the synthetic pointer and mouse sequence used by the native
     * click path while temporarily wrapping inline handlers on the bubbling path.
     */
    const dispatchNativeClick = (): void => {
        // Feature-detect PointerEvent for environments that don't support it
        const hasPointerEvent = typeof PointerEvent === 'function';
        const spoofedEventTypes = new Set([
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
        const restoreInlineHandlers = wrapInlineHandlers(element, spoofedEventTypes);

        try {
            if (hasPointerEvent) {
                element.dispatchEvent(new PointerEvent('pointerover', commonOpts));
                element.dispatchEvent(new PointerEvent('pointerenter', noBubbleOpts));
            }
            element.dispatchEvent(new MouseEvent('mouseover', commonOpts));
            element.dispatchEvent(new MouseEvent('mouseenter', noBubbleOpts));
            if (hasPointerEvent) {
                element.dispatchEvent(new PointerEvent('pointerdown', commonOpts));
            }
            element.dispatchEvent(new MouseEvent('mousedown', commonOpts));
            element.focus();
            if (hasPointerEvent) {
                element.dispatchEvent(new PointerEvent('pointerup', releaseOpts));
            }
            element.dispatchEvent(new MouseEvent('mouseup', releaseOpts));
            element.dispatchEvent(new MouseEvent('click', releaseOpts));
        } finally {
            restoreInlineHandlers();
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
                const eventFocusProxy = createEventProxy(focusEvent, 'focus', true);
                reactProps.onFocus.call(element, eventFocusProxy);
            }
            const clickEvent = new MouseEvent('click', releaseOpts);
            const eventClickProxy = createEventProxy(clickEvent, 'click', true);
            reactProps.onClick.call(element, eventClickProxy);
            return;
        }
    }

    dispatchNativeClick();
};
