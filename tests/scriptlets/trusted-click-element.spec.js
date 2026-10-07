/* eslint-disable no-underscore-dangle, no-console */
import {
    afterAll,
    beforeAll,
    beforeEach,
    vi,
    afterEach,
    describe,
    expect,
    test,
} from 'vitest';

import { trustedClickElement } from '../../src/scriptlets/trusted-click-element';
import {
    clearGlobalProps,
    PANEL_ID,
    CLICKABLE_NAME,
    createSelectorsString,
    createPanel,
    removePanel,
    createClickable,
    allowSpoofedClicksReset,
} from '../helpers';
import { useViewlessMouseEvents } from '../vitest-helpers';

// Spoofed clicks are deleted by a test, so the hook is installed again
let restoreDefineProperty;
beforeAll(() => {
    restoreDefineProperty = allowSpoofedClicksReset();
});
afterAll(() => {
    restoreDefineProperty();
});

beforeAll(() => {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            reload:
                vi.fn(),
        },
    });
    window.console.trace = vi.fn();
});

beforeEach(() => {
    // Set before each test, as afterEach clears it
    global.__debug = () => {
        global.hit = 'FIRED';
    };
    global.clickOrder = [];
});

afterEach(() => {
    removePanel();
    clearGlobalProps('hit', '__debug');
    vi.clearAllMocks();
});

describe('Test trusted-click-element scriptlet - reload option', () => {
    const sourceParams = {
        sourceParams: 'trusted-click-element',
        verbose: true,
    };

    beforeEach(() => {
        vi.useFakeTimers();
        useViewlessMouseEvents();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test('Single element clicked with passed reload value', async () => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick:100');
        // Click after the 100ms delay, reload 100ms after the click
        await vi.advanceTimersByTimeAsync(200);

        expect(clickable.getAttribute('clicked')).toBeTruthy();
        expect(reloadSpy).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
    });

    test('Multiple elements clicked with passed reload value', async () => {
        const CLICK_ORDER = [1, 2, 3];
        const panel = createPanel();
        const clickables = CLICK_ORDER.map((number) => {
            const clickable = createClickable(number);
            panel.appendChild(clickable);
            return clickable;
        });
        const selectorsString = createSelectorsString(CLICK_ORDER);
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick:100');
        // First click after the 100ms delay, 150ms between the 3 clicks, reload 100ms after the last one
        await vi.advanceTimersByTimeAsync(500);

        clickables.forEach((clickable) => {
            expect(clickable.getAttribute('clicked')).toBeTruthy();
        });
        expect(window.clickOrder).toEqual(CLICK_ORDER);
        expect(reloadSpy).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
    });

    test('Single element clicked with default reload value', async () => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick');
        // Click after the 100ms delay, reload after the default 500ms
        await vi.advanceTimersByTimeAsync(100);
        expect(clickable.getAttribute('clicked')).toBeTruthy();
        expect(reloadSpy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(500);

        expect(reloadSpy).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
    });

    test('Passed reload option is not correct', async () => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        const logMessageSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        // Attempt to trigger the click with an invalid reload value
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick10:10');
        await vi.advanceTimersByTimeAsync(100);

        // Expect no click to have been triggered
        expect(clickable.getAttribute('clicked')).toBeFalsy();
        // Expect no reload to have been triggered
        expect(reloadSpy).not.toHaveBeenCalled();
        // Expect the log message function to have been called with the error about the invalid reload value
        expect(logMessageSpy).toHaveBeenCalledWith(
            expect.stringContaining("Passed reload option 'reloadAfterClick10:10' is invalid"),
        );
        // Ensure that 'window.hit' was not set to 'FIRED'
        expect(window.hit).toBeUndefined();
    });
});

describe('Test trusted-click-element scriptlet - hook installation', () => {
    const sourceParams = {
        sourceParams: 'trusted-click-element',
        verbose: true,
    };
    const spoofedClicksKey = Symbol.for('adg-spoof-click-isTrusted');

    test.each([
        {
            kind: 'read-only, so its assignment throws in strict mode',
            lock: (descriptor) => ({ ...descriptor, writable: false }),
        },
        {
            kind: 'locked with its assignment ignored, as in the injected code, which is not strict',
            lock: (descriptor) => ({ configurable: true, get: () => descriptor.value, set: () => {} }),
        },
    ])('clicks without spoofing if addEventListener is $kind', ({ lock }) => {
        useViewlessMouseEvents();
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const addEventListenerDescriptor = Object.getOwnPropertyDescriptor(EventTarget.prototype, 'addEventListener');
        const removeEventListenerBefore = EventTarget.prototype.removeEventListener;
        // Earlier tests have installed the hook already; reset its guard so it is installed again
        const spoofedClicksBefore = EventTarget.prototype[spoofedClicksKey];
        delete EventTarget.prototype[spoofedClicksKey];
        // E.g. another script has locked addEventListener
        Object.defineProperty(EventTarget.prototype, 'addEventListener', lock(addEventListenerDescriptor));

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            trustedClickElement(sourceParams, `#${PANEL_ID} > #${CLICKABLE_NAME}1`);

            expect(clickable.getAttribute('clicked')).toBeTruthy();
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot spoof isTrusted of clicks'));
            // No wrapper is left installed without the other one, and the hook is not marked as installed
            expect(EventTarget.prototype.removeEventListener).toBe(removeEventListenerBefore);
            expect(EventTarget.prototype[spoofedClicksKey]).toBeUndefined();
        } finally {
            Object.defineProperty(EventTarget.prototype, 'addEventListener', addEventListenerDescriptor);
            EventTarget.prototype.removeEventListener = removeEventListenerBefore;
            if (spoofedClicksBefore) {
                EventTarget.prototype[spoofedClicksKey] = spoofedClicksBefore;
            }
            vi.unstubAllGlobals();
            logSpy.mockRestore();
        }
    });

    test.each([
        {
            kind: 'read-only, so its assignment throws in strict mode',
            lock: (descriptor) => ({ ...descriptor, writable: false }),
        },
        {
            kind: 'locked with its assignment ignored, as in the injected code, which is not strict',
            lock: (descriptor) => ({ configurable: true, get: () => descriptor.value, set: () => {} }),
        },
    ])('clicks in an open shadow root and logs it if attachShadow is $kind', ({ lock }) => {
        useViewlessMouseEvents();
        const panel = createPanel();
        const host = document.createElement('div');
        host.id = 'host';
        const clickable = createClickable(1);
        host.attachShadow({ mode: 'open' }).appendChild(clickable);
        panel.appendChild(host);
        const attachShadowDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'attachShadow');
        // E.g. another script has locked attachShadow
        Object.defineProperty(Element.prototype, 'attachShadow', lock(attachShadowDescriptor));

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            trustedClickElement(sourceParams, `#${PANEL_ID} > #host >>> #${CLICKABLE_NAME}1`);

            expect(clickable.getAttribute('clicked')).toBeTruthy();
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot track shadow roots attached later'));
            expect(Element.prototype.attachShadow).toBe(attachShadowDescriptor.value);
        } finally {
            Object.defineProperty(Element.prototype, 'attachShadow', attachShadowDescriptor);
            vi.unstubAllGlobals();
            logSpy.mockRestore();
        }
    });
});
