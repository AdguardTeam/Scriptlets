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
    nodes.forEach((node) => {
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
 */
export const clickElement = (element: HTMLElement): void => {
    const REACT_PROPS_KEY_PREFIX = '__reactProps$';

    // Find React internal props key on the element
    const reactPropsKey = Object.keys(element).find((key) => key.startsWith(REACT_PROPS_KEY_PREFIX));

    // If React props are found, try to use React's handlers
    if (reactPropsKey) {
        const reactProps = (element as unknown as Record<string, unknown>)[reactPropsKey] as {
            onFocus?: () => void;
            onClick?: () => void;
        } | undefined;

        if (reactProps && typeof reactProps.onClick === 'function') {
            // Call onFocus first if available, as some React components require it
            if (typeof reactProps.onFocus === 'function') {
                reactProps.onFocus();
            }
            reactProps.onClick();
            return;
        }
    }

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

    // Feature-detect PointerEvent for environments that don't support it
    const hasPointerEvent = typeof PointerEvent === 'function';

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
};
