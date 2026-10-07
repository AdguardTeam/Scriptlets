import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import {
    clickElement,
    createSpoofedClicks,
    getSpoofedClicks,
    spoofClickEventsIsTrusted,
    type SpoofedClicks,
} from '../../src/helpers/click-utils';
import { allowSpoofedClicksReset } from '../helpers';
import { useViewlessMouseEvents } from '../vitest-helpers';

const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
const spoofedClicksKey = Symbol.for('adg-spoof-click-isTrusted');

// Spoofed clicks are deleted after each test, so the hook is installed again,
// see spoofed-clicks-property.spec.ts for the property which cannot be deleted outside of tests
let restoreDefineProperty: () => void;
beforeAll(() => {
    restoreDefineProperty = allowSpoofedClicksReset();
});
afterAll(() => {
    restoreDefineProperty();
});

type ReactLikeEvent = Event & {
    nativeEvent: Event;
    isDefaultPrevented(): boolean;
    isPropagationStopped(): boolean;
};

const createListener = (kind: 'function' | 'object', callback: EventListener) => {
    return kind === 'function' ? callback : { handleEvent: callback };
};

const createFixture = () => {
    const root = document.createElement('div');
    const target = document.createElement('button');
    const popup = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    popup.hidden = true;
    popup.append(inside);
    root.append(target, popup);
    document.body.append(root, outside);
    return {
        root,
        target,
        popup,
        inside,
        outside,
    };
};

/**
 * jsdom focus() emits trusted focusin events. Route registrations through the real click hook
 * to test its trusted-event branch without redefining isTrusted. QUnit covers browser behavior.
 */
const useTrustedFocusEvents = (eventType = 'click') => {
    EventTarget.prototype.addEventListener = function addListener(type, listener, options) {
        return nativeAddEventListener.call(this, type === eventType ? 'focusin' : type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function removeListener(type, listener, options) {
        return nativeRemoveEventListener.call(this, type === eventType ? 'focusin' : type, listener, options);
    };
};

/**
 * Opens the popup from a root click and closes it on a later outside click.
 * The document listener is installed synchronously, so it also receives the opening event.
 */
const installPopupGuard = (
    { root, target, popup }: ReturnType<typeof createFixture>,
    savedEvent: 'argument' | 'window.event',
    trace: string[],
    signal: AbortSignal,
) => {
    root.addEventListener('click', (event) => {
        if (event.target !== target || !popup.hidden) {
            return;
        }
        popup.hidden = false;
        trace.push('open');
        let openingEvent = savedEvent === 'argument' ? event : window.event;
        const onDocument = (documentEvent: Event) => {
            if (documentEvent === openingEvent) {
                openingEvent = undefined;
                trace.push('ignore opening');
                return;
            }
            if (!popup.contains(documentEvent.target as Node)) {
                popup.hidden = true;
                trace.push('close');
                document.removeEventListener('click', onDocument);
            }
        };
        // Document bubble still receives the event that synchronously installed this listener.
        document.addEventListener('click', onDocument, { signal });
    });
};

describe('spoofClickEventsIsTrusted', () => {
    let cleanup: AbortController;

    beforeEach(() => {
        cleanup = new AbortController();
        useViewlessMouseEvents();
    });

    afterEach(() => {
        // Abort removes document registrations before their wrapper lookup is discarded.
        cleanup.abort();
        EventTarget.prototype.addEventListener = nativeAddEventListener;
        EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
        Reflect.deleteProperty(EventTarget.prototype, spoofedClicksKey);
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    describe.each([false, true])('capture=%s', (capture) => {
        describe.each(['function', 'object'] as const)('%s listener', (kind) => {
            test('removes listeners independently across targets', () => {
                spoofClickEventsIsTrusted();
                const first = new EventTarget();
                const second = new EventTarget();
                const callback = vi.fn();
                const listener = createListener(kind, callback);
                first.addEventListener('click', listener, capture);
                second.addEventListener('click', listener, { capture });

                first.removeEventListener('click', listener, { capture });
                first.dispatchEvent(new Event('click'));
                expect(callback).not.toHaveBeenCalled();
                second.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);

                second.removeEventListener('click', listener, capture);
                second.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
            });

            test('deduplicates registration after removing another target', () => {
                spoofClickEventsIsTrusted();
                const first = new EventTarget();
                const second = new EventTarget();
                const callback = vi.fn();
                const listener = createListener(kind, callback);
                first.addEventListener('click', listener, capture);
                second.addEventListener('click', listener, capture);
                first.removeEventListener('click', listener, capture);

                second.addEventListener('click', listener, { capture });
                second.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
                second.removeEventListener('click', listener, capture);
                second.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
            });

            test('ignores removal from an unrelated target', () => {
                spoofClickEventsIsTrusted();
                const target = new EventTarget();
                const unrelated = new EventTarget();
                const callback = vi.fn();
                const listener = createListener(kind, callback);
                target.addEventListener('click', listener, capture);

                unrelated.removeEventListener('click', listener, { capture });
                target.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
                target.removeEventListener('click', listener, capture);
                target.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
            });

            test('removes a registration made before the hook', () => {
                const target = new EventTarget();
                const other = new EventTarget();
                const callback = vi.fn();
                const listener = createListener(kind, callback);
                target.addEventListener('click', listener, capture);
                spoofClickEventsIsTrusted();
                other.addEventListener('click', listener, capture);

                target.removeEventListener('click', listener, { capture });
                target.dispatchEvent(new Event('click'));
                expect(callback).not.toHaveBeenCalled();
                other.dispatchEvent(new Event('click'));
                expect(callback).toHaveBeenCalledTimes(1);
            });
        });
    });

    test.each([
        [{ capture: 1 }, true],
        [1, { capture: true }],
        [{ capture: '' }, false],
        [null, { capture: false }],
        // Functions are converted to an options dictionary as well
        [() => {}, false],
        [Object.assign(() => {}, { capture: true }), true],
    ])('converts capture option %o like native registration of %o', (options, equivalent) => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const listener = vi.fn();
        const dispatch = () => target.dispatchEvent(new Event('click'));
        target.addEventListener('click', listener, options as unknown as AddEventListenerOptions);
        target.addEventListener('click', listener, equivalent);
        dispatch();
        expect(listener).toHaveBeenCalledTimes(1);

        target.removeEventListener('click', listener, equivalent);
        dispatch();
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('reads the capture option once when removing a listener', () => {
        const parent = document.createElement('div');
        const child = document.createElement('button');
        parent.append(child);
        document.body.append(parent);
        const phases: number[] = [];
        const listener = (event: Event) => { phases.push(event.eventPhase); };
        parent.addEventListener('click', listener, true);
        spoofClickEventsIsTrusted();
        parent.addEventListener('click', listener, false);
        let reads = 0;
        // Reports bubble on the first read only
        const options = {
            get capture() {
                reads += 1;
                return reads > 1;
            },
        };
        parent.removeEventListener('click', listener, options);
        child.dispatchEvent(new Event('click', { bubbles: true }));

        // Like native removal, the bubble registration is removed and the capture one is kept
        expect(phases).toEqual([Event.CAPTURING_PHASE]);
    });

    test('reads the capture option once when adding a listener', () => {
        spoofClickEventsIsTrusted();
        const parent = document.createElement('div');
        const child = document.createElement('button');
        parent.append(child);
        document.body.append(parent);
        const phases: number[] = [];
        const listener = (event: Event) => { phases.push(event.eventPhase); };
        let reads = 0;
        // Reports bubble on the first read only
        const options = {
            get capture() {
                reads += 1;
                return reads > 1;
            },
        };
        parent.addEventListener('click', listener, options);
        // Like native registration, it is the same registration as the one above
        parent.addEventListener('click', listener, false);
        child.dispatchEvent(new Event('click', { bubbles: true }));
        expect(reads).toBe(1);
        expect(phases).toEqual([Event.BUBBLING_PHASE]);

        parent.removeEventListener('click', listener, false);
        child.dispatchEvent(new Event('click', { bubbles: true }));
        expect(phases).toEqual([Event.BUBBLING_PHASE]);
    });

    test('retains the passive option', () => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const listener = vi.fn((event: Event) => { event.preventDefault(); });
        target.addEventListener('click', listener, { passive: true });
        const event = new Event('click', { cancelable: true });
        target.dispatchEvent(event);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(false);
    });

    test('keeps capture and bubble registrations independent', () => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const listener = vi.fn();
        target.addEventListener('click', listener, true);
        target.addEventListener('click', listener, false);
        target.dispatchEvent(new Event('click'));
        expect(listener).toHaveBeenCalledTimes(2);

        target.removeEventListener('click', listener, { capture: true });
        target.dispatchEvent(new Event('click'));
        expect(listener).toHaveBeenCalledTimes(3);
        target.removeEventListener('click', listener, false);
        target.dispatchEvent(new Event('click'));
        expect(listener).toHaveBeenCalledTimes(3);
    });

    test('retains once and AbortSignal lifetimes when re-registering', () => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const controller = new AbortController();
        const listener = vi.fn();
        const dispatch = () => target.dispatchEvent(new Event('click'));
        target.addEventListener('click', listener, { once: true, signal: controller.signal });
        dispatch();
        dispatch();
        expect(listener).toHaveBeenCalledTimes(1);

        target.addEventListener('click', listener, { signal: controller.signal });
        dispatch();
        expect(listener).toHaveBeenCalledTimes(2);
        controller.abort();
        dispatch();
        expect(listener).toHaveBeenCalledTimes(2);

        target.addEventListener('click', listener, { signal: controller.signal });
        dispatch();
        expect(listener).toHaveBeenCalledTimes(2);
        target.addEventListener('click', listener);
        dispatch();
        expect(listener).toHaveBeenCalledTimes(3);
        target.removeEventListener('click', listener);
        dispatch();
        expect(listener).toHaveBeenCalledTimes(3);
    });

    test.each(['function', 'object'] as const)('passes page-dispatched events to a %s listener unchanged', (kind) => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const original = new MouseEvent('click', { cancelable: true });
        let received: Event | undefined;
        let receiver: unknown;
        const callback = vi.fn(function onClick(this: unknown, event: Event) {
            received = event;
            receiver = this;
        });
        const listener = createListener(kind, callback);
        target.addEventListener('click', listener);
        target.dispatchEvent(original);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(received).toBe(original);
        expect(received?.isTrusted).toBe(false);
        expect(receiver).toBe(kind === 'function' ? target : listener);
    });

    test.each(['function', 'object'] as const)('spoofs a scriptlet click for a %s listener', (kind) => {
        const { target } = createFixture();
        let original: Event | undefined;
        nativeAddEventListener.call(target, 'click', (event) => { original = event; });
        spoofClickEventsIsTrusted();
        let received: Event | undefined;
        let receiver: unknown;
        let currentTarget: EventTarget | null = null;
        let propagationStopped = false;
        const callback = vi.fn(function onClick(this: unknown, event: Event) {
            received = event;
            receiver = this;
            currentTarget = event.currentTarget;
            event.preventDefault();
            event.cancelBubble = true;
            propagationStopped = event.cancelBubble;
        });
        const listener = createListener(kind, callback);
        target.addEventListener('click', listener);
        clickElement(target);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(original?.isTrusted).toBe(false);
        expect(received?.isTrusted).toBe(true);
        expect(received).not.toBe(original);
        expect(receiver).toBe(kind === 'function' ? target : listener);
        expect(currentTarget).toBe(target);
        expect(original?.defaultPrevented).toBe(true);
        expect(propagationStopped).toBe(true);
    });

    test('delivers one spoofed event to every listener of a scriptlet click', () => {
        const { root, target } = createFixture();
        const originals: Event[] = [];
        nativeAddEventListener.call(document, 'click', (event) => { originals.push(event); }, {
            capture: true,
            signal: cleanup.signal,
        });
        spoofClickEventsIsTrusted();

        const records: {
            position: string;
            event: Event;
            receiver: unknown;
            currentTarget: EventTarget | null;
        }[] = [];
        const record = (position: string, receiver: unknown, event: Event) => {
            records.push({
                position,
                event,
                receiver,
                currentTarget: event.currentTarget,
            });
        };
        root.addEventListener('click', function onCapture(this: EventTarget, event: Event) {
            record('root capture', this, event);
        }, true);
        target.addEventListener('click', function onTarget(this: EventTarget, event: Event) {
            record('target function', this, event);
        });
        const listener = {
            handleEvent(event: Event) { record('target object', this, event); },
        };
        target.addEventListener('click', listener);
        root.addEventListener('click', function onBubble(this: EventTarget, event: Event) {
            record('root bubble', this, event);
        });
        document.addEventListener('click', function onDocument(this: EventTarget, event: Event) {
            record('document bubble', this, event);
        }, {
            signal: cleanup.signal,
        });
        clickElement(target);

        expect(originals).toHaveLength(1);
        const original = originals[0];
        expect(original.isTrusted).toBe(false);
        expect(records.map(({ position }) => position)).toEqual([
            'root capture', 'target function', 'target object', 'root bubble', 'document bubble',
        ]);
        const delivered = records[0].event;
        expect(delivered).not.toBe(original);
        expect(delivered.isTrusted).toBe(true);
        const receivers = [root, target, listener, root, document];
        const currentTargets = [root, target, target, root, document];
        records.forEach((entry, index) => {
            expect(entry.event).toBe(delivered);
            expect(entry.receiver).toBe(receivers[index]);
            expect(entry.currentTarget).toBe(currentTargets[index]);
        });
    });

    test('shares the spoofed event with inline handlers that set event properties', () => {
        const { target } = createFixture();
        let original: Event | undefined;
        nativeAddEventListener.call(target, 'click', (event) => { original = event; });
        spoofClickEventsIsTrusted();
        let listenerEvent: Event | undefined;
        let inlineEvent: Event | undefined;
        const documentListener = vi.fn();
        target.addEventListener('click', (event) => { listenerEvent = event; });
        target.onclick = (event) => {
            inlineEvent = event;
            // Native setters throw on a proxy receiver unless the proxy forwards them.
            event.returnValue = false;
            event.cancelBubble = true;
        };
        document.addEventListener('click', documentListener, { signal: cleanup.signal });
        clickElement(target);

        expect(inlineEvent?.isTrusted).toBe(true);
        expect(inlineEvent).toBe(listenerEvent);
        expect(original?.defaultPrevented).toBe(true);
        expect(documentListener).not.toHaveBeenCalled();
    });

    test.each([
        {
            name: 'legacy setters',
            cancel: (event: ReactLikeEvent) => {
                event.returnValue = false;
                event.cancelBubble = true;
            },
        },
        {
            name: 'nativeEvent methods',
            cancel: (event: ReactLikeEvent) => {
                event.nativeEvent.preventDefault();
                event.nativeEvent.stopPropagation();
            },
        },
    ])('reports React event state changed through $name', ({ cancel }) => {
        const { target } = createFixture();
        const REACT_PROPS_KEY = '__reactProps$test';
        let state: Record<string, boolean> | undefined;
        Object.assign(target, {
            [REACT_PROPS_KEY]: {
                onClick(event: ReactLikeEvent) {
                    cancel(event);
                    state = {
                        defaultPrevented: event.defaultPrevented,
                        isDefaultPrevented: event.isDefaultPrevented(),
                        isPropagationStopped: event.isPropagationStopped(),
                    };
                },
            },
        });
        clickElement(target);

        expect(state).toEqual({
            defaultPrevented: true,
            isDefaultPrevented: true,
            isPropagationStopped: true,
        });
    });

    test('keeps the event constructor on a scriptlet click', () => {
        const { target } = createFixture();
        let original: Event | undefined;
        nativeAddEventListener.call(target, 'click', (event) => { original = event; });
        spoofClickEventsIsTrusted();
        let received: Event | undefined;
        target.addEventListener('click', (event) => { received = event; });
        clickElement(target);

        expect(received?.isTrusted).toBe(true);
        expect(received?.constructor).toBe(original?.constructor);
        expect(received?.constructor.name).toBe('MouseEvent');
    });

    test('exposes a trusted nativeEvent and the event constructor to React handlers', () => {
        const { target } = createFixture();
        const REACT_PROPS_KEY = '__reactProps$test';
        let received: ReactLikeEvent | undefined;
        Object.assign(target, {
            [REACT_PROPS_KEY]: {
                onClick(event: ReactLikeEvent) {
                    received = event;
                },
            },
        });
        clickElement(target);

        expect(received?.isTrusted).toBe(true);
        expect(received?.nativeEvent.isTrusted).toBe(true);
        expect(received?.constructor.name).toBe('MouseEvent');
    });

    test('completes the click sequence when an inline handler cannot be wrapped', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        Object.defineProperty(target, 'onmousedown', { value: () => {}, writable: false });
        const onClick = vi.fn();
        target.addEventListener('click', onClick);
        clickElement(target);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test.each([
        'document',
        'open',
        'closed',
    ] as const)('spoofs the click that a label forwards in a %s tree', (mode) => {
        const host = document.createElement('div');
        document.body.append(host);
        const tree = mode === 'document' ? host : host.attachShadow({ mode });
        const label = document.createElement('label');
        const control = document.createElement('input');
        control.type = 'checkbox';
        label.append(control);
        tree.append(label);
        // jsdom forwards label clicks as trusted. Emulate browsers that keep
        // the untrusted state of a synthetic click instead, e.g. Firefox.
        nativeAddEventListener.call(label, 'click', (event) => {
            if (event.target === label) {
                event.preventDefault();
                control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
            }
        });
        spoofClickEventsIsTrusted();
        // Page listeners registered after the hook: before, at and after the control in the event path.
        // Outside the shadow tree, both clicks target the shadow host.
        // Window listeners cannot be hooked in Vitest, as its window global has own bound methods.
        const trust: Record<'capture' | 'control' | 'bubble', boolean[]> = {
            capture: [],
            control: [],
            bubble: [],
        };
        document.addEventListener('click', (event) => { trust.capture.push(event.isTrusted); }, {
            capture: true,
            signal: cleanup.signal,
        });
        control.addEventListener('click', (event) => { trust.control.push(event.isTrusted); });
        document.addEventListener('click', (event) => { trust.bubble.push(event.isTrusted); }, {
            signal: cleanup.signal,
        });

        // The scriptlet click and the click forwarded from it
        clickElement(label);
        expect(trust).toEqual({
            capture: [true, true],
            control: [true],
            bubble: [true, true],
        });

        // The page click and the click forwarded from it are not spoofed
        label.click();
        expect(trust).toEqual({
            capture: [true, true, false, false],
            control: [true, false],
            bubble: [true, true, false, false],
        });
    });

    test('completes the click sequence when restoring an inline handler fails', () => {
        const { target } = createFixture();
        let mousedown: Event | undefined;
        nativeAddEventListener.call(target, 'mousedown', (event) => { mousedown = event; });
        spoofClickEventsIsTrusted();
        let storedHandler: unknown = () => {};
        let isLocked = false;
        Object.defineProperty(target, 'onmousedown', {
            configurable: true,
            get: () => storedHandler,
            set: (value) => {
                if (isLocked) {
                    throw new Error('Locked');
                }
                storedHandler = value;
            },
        });
        // The page locks the handler during the scriptlet's mousedown
        target.addEventListener('mousedown', () => { isLocked = true; });
        const onClick = vi.fn();
        target.addEventListener('click', onClick);
        clickElement(target);

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onClick.mock.calls[0][0].isTrusted).toBe(true);
        // Proxy of the dispatched event is removed
        const spoofedClicks = getSpoofedClicks() as SpoofedClicks;
        expect(spoofedClicks.getDeliveredEvent(mousedown as Event)).toBe(mousedown);
    });

    test('spoofs an inline handler that the page assigns during a scriptlet click', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        let clickEvent: Event | undefined;
        target.onmousedown = () => {
            target.onclick = (event) => { clickEvent = event; };
        };
        clickElement(target);

        expect(clickEvent?.isTrusted).toBe(true);
    });

    test('spoofs an inline handler with a hook installed without the shared state', () => {
        const { target } = createFixture();
        const storedClicks = { isAllSpoofed: false };
        Reflect.set(EventTarget.prototype, spoofedClicksKey, storedClicks);
        let clickEvent: Event | undefined;
        target.onclick = (event) => { clickEvent = event; };
        clickElement(target);

        expect(clickEvent?.isTrusted).toBe(true);
        expect(Reflect.get(EventTarget.prototype, spoofedClicksKey)).toStrictEqual({ isAllSpoofed: false });
    });

    test('keeps spoofing scriptlet clicks after the page replaces WeakMap', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        // E.g. a polyfill bundle loaded after the scriptlet; Map is a working stand-in
        vi.stubGlobal('WeakMap', Map);
        let received: Event | undefined;
        target.addEventListener('click', (event) => { received = event; });
        clickElement(target);

        expect(received?.isTrusted).toBe(true);
    });

    test('keeps an inline handler that the page clears during a scriptlet click', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        const onClickOnce = vi.fn(function onClickOnce(this: GlobalEventHandlers) {
            this.onclick = null;
        });
        target.onclick = onClickOnce;
        clickElement(target);

        expect(target.onclick).toBeNull();
        target.click();
        expect(onClickOnce).toHaveBeenCalledTimes(1);
    });

    test('keeps an inline handler that the page replaces during a scriptlet click', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        const close = vi.fn();
        const open = vi.fn(() => {
            target.onclick = close;
        });
        target.onclick = open;
        clickElement(target);

        expect(target.onclick).toBe(close);
        target.click();
        expect(open).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);
    });

    test('does not spoof page clicks during or after a scriptlet click on the same element', () => {
        const { target } = createFixture();
        spoofClickEventsIsTrusted();
        const received: { event: Event; currentEvent: Event | undefined }[] = [];
        target.addEventListener('click', (event) => {
            received.push({ event, currentEvent: window.event });
        });
        // The page reacts to the scriptlet's mousedown with its own click.
        target.addEventListener('mousedown', () => target.click(), { once: true });
        clickElement(target);
        target.click();

        expect(received.map(({ event }) => event.isTrusted)).toEqual([false, true, false]);
        [received[0], received[2]].forEach(({ event, currentEvent }) => {
            expect(event).toBe(currentEvent);
        });
    });

    test('keeps a popup opened by a scriptlet click when the guard saves the listener argument', () => {
        const fixture = createFixture();
        const {
            target,
            popup,
            inside,
            outside,
        } = fixture;
        const trace: string[] = [];
        spoofClickEventsIsTrusted();
        installPopupGuard(fixture, 'argument', trace, cleanup.signal);

        clickElement(target);
        expect(popup.hidden).toBe(false);
        expect(trace).toEqual(['open', 'ignore opening']);
        inside.click();
        expect(popup.hidden).toBe(false);
        outside.click();
        expect(popup.hidden).toBe(true);
    });

    test.each([
        'click', 'mousedown', 'mouseup', 'mouseover', 'mouseenter',
        'pointerdown', 'pointerup', 'pointerover', 'pointerenter',
    ])('preserves trusted %s listener arguments throughout propagation', (eventType) => {
        useTrustedFocusEvents(eventType);
        const { root, target } = createFixture();
        let original: Event | undefined;
        const records: {
            position: string;
            event: Event;
            currentEvent: Event | undefined;
            receiver: unknown;
            currentTarget: EventTarget | null;
        }[] = [];
        nativeAddEventListener.call(document, 'focusin', (event) => { original = event; }, {
            capture: true,
            signal: cleanup.signal,
        });
        spoofClickEventsIsTrusted();

        const record = (position: string, receiver: unknown, event: Event) => {
            records.push({
                position,
                event,
                currentEvent: window.event,
                receiver,
                currentTarget: event.currentTarget,
            });
        };
        root.addEventListener(eventType, function onCapture(this: EventTarget, event: Event) {
            record('root capture', this, event);
        }, true);
        target.addEventListener(eventType, function onTarget(this: EventTarget, event: Event) {
            record('target function', this, event);
        });
        const listener = {
            handleEvent(event: Event) { record('target object', this, event); },
        };
        target.addEventListener(eventType, listener);
        root.addEventListener(eventType, function onBubble(this: EventTarget, event: Event) {
            record('root bubble', this, event);
        });
        document.addEventListener(eventType, function onDocument(this: EventTarget, event: Event) {
            record('document bubble', this, event);
        }, {
            signal: cleanup.signal,
        });
        target.focus();

        expect(original?.isTrusted).toBe(true);
        expect(records.map(({ position }) => position)).toEqual([
            'root capture', 'target function', 'target object', 'root bubble', 'document bubble',
        ]);
        const receivers = [root, target, listener, root, document];
        const currentTargets = [root, target, target, root, document];
        records.forEach((entry, index) => {
            expect(entry.event).toBe(original);
            expect(entry.currentEvent).toBe(original);
            expect(entry.receiver).toBe(receivers[index]);
            expect(entry.currentTarget).toBe(currentTargets[index]);
        });
    });

    describe.each([
        {
            trigger: 'trusted focus',
            observedType: 'focusin',
            isTrusted: true,
            activate: (element: HTMLElement) => element.focus(),
        },
        {
            trigger: 'page click()',
            observedType: 'click',
            isTrusted: false,
            activate: (element: HTMLElement) => element.click(),
        },
    ])('popup guard, $trigger', ({ observedType, isTrusted, activate }) => {
        describe.each([false, true])('trust hook=%s', (enabled) => {
            test.each([
                'argument',
                'window.event',
            ] as const)('ignores the opening event saved from %s', (savedEvent) => {
                if (isTrusted) {
                    useTrustedFocusEvents();
                }
                const fixture = createFixture();
                const {
                    target,
                    popup,
                    inside,
                    outside,
                } = fixture;
                const originalTrust: boolean[] = [];
                const trace: string[] = [];
                nativeAddEventListener.call(document, observedType, (event) => {
                    if (event.target === target) {
                        originalTrust.push(event.isTrusted);
                    }
                }, { capture: true, signal: cleanup.signal });
                if (enabled) {
                    spoofClickEventsIsTrusted();
                }
                installPopupGuard(fixture, savedEvent, trace, cleanup.signal);

                for (let cycle = 0; cycle < 2; cycle += 1) {
                    activate(target);
                    expect(originalTrust[cycle]).toBe(isTrusted);
                    expect(popup.hidden).toBe(false);
                    expect(trace.slice(-2)).toEqual(['open', 'ignore opening']);
                    activate(inside);
                    expect(popup.hidden).toBe(false);
                    activate(outside);
                    expect(popup.hidden).toBe(true);
                }
                expect(trace).toEqual(['open', 'ignore opening', 'close', 'open', 'ignore opening', 'close']);
            });
        });
    });

    test('spoofs a click forwarded from a label in an XHTML document', () => {
        const xhtml = new DOMParser().parseFromString(
            '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                + '<label><span id="clicked">Accept</span><input type="checkbox" id="control"/></label>'
                + '</body></html>',
            'application/xhtml+xml',
        );
        const label = xhtml.querySelector('label') as HTMLLabelElement;
        const clicked = xhtml.getElementById('clicked') as HTMLElement;
        const control = xhtml.getElementById('control') as HTMLInputElement;
        // Tag names keep their case in XHTML documents
        expect(label.nodeName).toBe('label');
        // Label forwards the click as untrusted, as some browsers do
        nativeAddEventListener.call(label, 'click', (event) => {
            if (event.target !== control) {
                event.preventDefault();
                control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
            }
        });
        spoofClickEventsIsTrusted();
        const trust: boolean[] = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        clickElement(clicked);

        expect(trust).toEqual([true]);
    });

    test('returns true when it installs the hook, and when the hook is already installed', () => {
        // Installs the hook
        expect(spoofClickEventsIsTrusted()).toBe(true);
        const installedAddEventListener = EventTarget.prototype.addEventListener;
        // Hook installed by another rule: nothing is replaced, but spoofing works
        expect(spoofClickEventsIsTrusted()).toBe(true);
        expect(EventTarget.prototype.addEventListener).toBe(installedAddEventListener);
    });

    test('returns false and leaves no wrapper if addEventListener is read-only', () => {
        const descriptor = Object.getOwnPropertyDescriptor(EventTarget.prototype, 'addEventListener')!;
        Object.defineProperty(EventTarget.prototype, 'addEventListener', { ...descriptor, writable: false });
        try {
            expect(spoofClickEventsIsTrusted()).toBe(false);
            expect(EventTarget.prototype.removeEventListener).toBe(nativeRemoveEventListener);
            expect(Reflect.get(EventTarget.prototype, spoofedClicksKey)).toBeUndefined();
        } finally {
            Object.defineProperty(EventTarget.prototype, 'addEventListener', descriptor);
        }
    });

    test('restores the forwarded click spoofer if a window listener cannot be added', () => {
        spoofClickEventsIsTrusted();
        const label = document.createElement('label');
        const clicked = document.createElement('span');
        const control = document.createElement('input');
        control.type = 'checkbox';
        label.append(clicked, control);
        document.body.append(label);
        // E.g. the page has replaced the method of window
        const windowAddEventListener = vi.spyOn(window, 'addEventListener').mockImplementation(() => {
            throw new Error('Blocked');
        });
        const received: boolean[] = [];
        clicked.addEventListener('click', (event) => { received.push(event.isTrusted); });

        try {
            expect(() => clickElement(clicked)).not.toThrow();
            expect(received).toEqual([true]);
            expect((getSpoofedClicks() as SpoofedClicks).setForwardedClickSpoofer(null)).toBeNull();
        } finally {
            windowAddEventListener.mockRestore();
        }
    });

    describe('all events', () => {
        test('spoofs a page click with one proxy shared by all listeners', () => {
            const { root, target } = createFixture();
            spoofClickEventsIsTrusted(true);
            let original: Event | undefined;
            nativeAddEventListener.call(target, 'click', (event) => { original = event; });
            const received: Event[] = [];
            target.addEventListener('click', (event) => { received.push(event); });
            root.addEventListener('click', (event) => { received.push(event); });

            target.click();

            expect(original?.isTrusted).toBe(false);
            expect(received).toHaveLength(2);
            expect(received[0].isTrusted).toBe(true);
            expect(received[0]).not.toBe(original);
            expect(received[1]).toBe(received[0]);
        });

        test.each([
            'pointerover',
            'pointerenter',
            'mouseover',
            'mouseenter',
            'pointerdown',
            'mousedown',
            'pointerup',
            'mouseup',
            'click',
        ])('spoofs a page %s event', (type) => {
            const { target } = createFixture();
            spoofClickEventsIsTrusted(true);
            const received: boolean[] = [];
            target.addEventListener(type, (event) => { received.push(event.isTrusted); });

            // jsdom may have no PointerEvent, and the type is what is checked
            target.dispatchEvent(new MouseEvent(type));

            expect(received).toEqual([true]);
        });

        test.each(['dblclick', 'keydown', 'focus'])('does not spoof a page %s event', (type) => {
            const { target } = createFixture();
            spoofClickEventsIsTrusted(true);
            const received: boolean[] = [];
            target.addEventListener(type, (event) => { received.push(event.isTrusted); });

            target.dispatchEvent(new Event(type));

            expect(received).toEqual([false]);
        });

        test.each(['function', 'object'] as const)('spoofs a page click for a %s listener', (kind) => {
            const { target } = createFixture();
            spoofClickEventsIsTrusted(true);
            const received: boolean[] = [];
            target.addEventListener('click', createListener(kind, (event) => { received.push(event.isTrusted); }), {
                capture: true,
            });

            target.dispatchEvent(new MouseEvent('click'));

            expect(received).toEqual([true]);
        });

        test('spoofs a scriptlet click as by default', () => {
            const { target } = createFixture();
            spoofClickEventsIsTrusted(true);
            const received: boolean[] = [];
            target.addEventListener('click', (event) => { received.push(event.isTrusted); });

            clickElement(target);

            expect(received).toEqual([true]);
        });

        test('passes a trusted event unchanged', () => {
            const { target } = createFixture();
            // Click listeners receive trusted focus events
            useTrustedFocusEvents();
            spoofClickEventsIsTrusted(true);
            let original: Event | undefined;
            nativeAddEventListener.call(target, 'focusin', (event) => { original = event; });
            let received: Event | undefined;
            target.addEventListener('click', (event) => { received = event; });

            target.focus();

            expect(original?.isTrusted).toBe(true);
            expect(received).toBe(original);
        });

        test('is enabled for the whole page if the hook is already installed', () => {
            const { target } = createFixture();
            spoofClickEventsIsTrusted();
            spoofClickEventsIsTrusted(true);
            // Another rule without it does not disable it
            spoofClickEventsIsTrusted();
            const received: boolean[] = [];
            target.addEventListener('click', (event) => { received.push(event.isTrusted); });

            target.click();

            expect(received).toEqual([true]);
        });

        test.each([
            // Older versions spoof all events themselves
            { name: 'an older version', storedClicks: true },
            { name: 'a hook without the shared state', storedClicks: { isAllSpoofed: false } },
        ])('keeps the value stored by $name', ({ storedClicks }) => {
            Reflect.set(EventTarget.prototype, spoofedClicksKey, storedClicks);

            expect(spoofClickEventsIsTrusted(true)).toBe(true);

            expect(Reflect.get(EventTarget.prototype, spoofedClicksKey)).toStrictEqual(storedClicks);
            expect(EventTarget.prototype.addEventListener).toBe(nativeAddEventListener);
        });
    });
});

describe('getSpoofedClicks', () => {
    afterEach(() => {
        Reflect.deleteProperty(EventTarget.prototype, spoofedClicksKey);
        vi.unstubAllGlobals();
    });

    test('returns false if the hook is not installed', () => {
        expect(getSpoofedClicks()).toBe(false);
    });

    test('stores spoofed clicks of the installed hook and returns them', () => {
        const spoofedClicks = createSpoofedClicks();

        expect(getSpoofedClicks(spoofedClicks)).toBe(spoofedClicks);
        expect(getSpoofedClicks()).toBe(spoofedClicks);
        expect(Reflect.get(EventTarget.prototype, spoofedClicksKey)).toBe(spoofedClicks);
    });

    test('returns spoofed clicks created after the page replaces WeakMap', () => {
        // E.g. a polyfill bundle loaded after the scriptlet; Map is a working stand-in
        vi.stubGlobal('WeakMap', Map);
        const spoofedClicks = createSpoofedClicks();
        getSpoofedClicks(spoofedClicks);
        const event = new MouseEvent('click');
        const proxy = new MouseEvent('click');
        spoofedClicks.setProxy(event, proxy);

        expect(getSpoofedClicks()).toBe(spoofedClicks);
        expect(spoofedClicks.getDeliveredEvent(event)).toBe(proxy);
    });

    test.each([
        { name: 'an older version', storedClicks: true },
        { name: 'an object without the functions', storedClicks: { isAllSpoofed: false } },
        { name: 'an object with the state of an unreleased version', storedClicks: { proxies: new WeakMap() } },
        { name: 'an object with some of the functions', storedClicks: { getDeliveredEvent: (event: Event) => event } },
    ])('returns true for the hook installed without spoofed clicks by $name', ({ storedClicks }) => {
        Reflect.set(EventTarget.prototype, spoofedClicksKey, storedClicks);

        expect(getSpoofedClicks()).toBe(true);
    });
});

describe('createSpoofedClicks', () => {
    test('keeps its state private and exposes only frozen functions, which the page can still call', () => {
        const spoofedClicks = createSpoofedClicks();

        expect(Object.isFrozen(spoofedClicks)).toBe(true);
        expect(Object.keys(spoofedClicks).sort()).toEqual([
            'deleteProxy',
            'getDeliveredEvent',
            'setForwardedClickSpoofer',
            'setProxy',
            'spoofAllEvents',
        ]);
        expect(Object.values(spoofedClicks).every((value) => typeof value === 'function')).toBe(true);
        expect(() => { Reflect.set(spoofedClicks, 'getDeliveredEvent', (event: Event) => event); }).not.toThrow();
        expect(Reflect.set(spoofedClicks, 'getDeliveredEvent', (event: Event) => event)).toBe(false);
    });

    test('returns the stored proxy of an event until it is deleted', () => {
        const event = new MouseEvent('click');
        const proxy = new MouseEvent('click');
        const spoofedClicks = createSpoofedClicks();
        spoofedClicks.setProxy(event, proxy);

        expect(spoofedClicks.getDeliveredEvent(event)).toBe(proxy);
        spoofedClicks.deleteProxy(event);
        expect(spoofedClicks.getDeliveredEvent(event)).toBe(event);
    });

    test('returns the proxy of a forwarded click while its spoofer is set', () => {
        const event = new MouseEvent('click');
        const proxy = new MouseEvent('click');
        const spoofedClicks = createSpoofedClicks();
        const spoofer = (received: Event) => (received === event ? proxy : undefined);

        expect(spoofedClicks.setForwardedClickSpoofer(spoofer)).toBeNull();
        expect(spoofedClicks.getDeliveredEvent(event)).toBe(proxy);
        expect(spoofedClicks.setForwardedClickSpoofer(null)).toBe(spoofer);
        expect(spoofedClicks.getDeliveredEvent(event)).toBe(event);
    });

    test('returns a page event unchanged by default', () => {
        const event = new MouseEvent('click');

        expect(createSpoofedClicks().getDeliveredEvent(event)).toBe(event);
    });

    test.each([
        { name: 'on creation', createAllSpoofed: () => createSpoofedClicks(true) },
        {
            name: 'later',
            createAllSpoofed: () => {
                const spoofedClicks = createSpoofedClicks();
                spoofedClicks.spoofAllEvents();
                return spoofedClicks;
            },
        },
    ])('stores the proxy of a page event if all events are spoofed $name, so it is reused', ({ createAllSpoofed }) => {
        const event = new MouseEvent('click');
        const spoofedClicks = createAllSpoofed();

        const delivered = spoofedClicks.getDeliveredEvent(event);

        expect(delivered).not.toBe(event);
        expect(delivered.isTrusted).toBe(true);
        expect(spoofedClicks.getDeliveredEvent(event)).toBe(delivered);
    });
});
