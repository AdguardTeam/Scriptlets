/* eslint-disable no-underscore-dangle, no-console */
import {
    beforeAll,
    vi,
    afterEach,
    describe,
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
} from '../helpers';

beforeAll(() => {
    global.__debug = () => {
        global.hit = 'FIRED';
    };
    global.clickOrder = [];
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            reload:
                vi.fn(),
        },
    });
    window.console.trace = vi.fn();
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

    test('Single element clicked with passed reload value', (done) => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick:100');
        setTimeout(() => {
            try {
                expect(clickable.getAttribute('clicked')).toBeTruthy();
                expect(reloadSpy).toHaveBeenCalledTimes(1);
                expect(window.hit).toBe('FIRED');
                done();
            } catch (error) {
                done(error);
            } finally {
                reloadSpy.mockRestore();
            }
        }, 350);
        // Explanation of the 350ms delay:
        // 1. Initial delay before the click is triggered: 100ms
        // 2. Additional delay after the click is processed: 150ms
        // 3. Delay before the reload action is executed: 100ms
        // Total delay calculation: 100ms + 150ms + 100ms = 350ms
    });

    test('Multiple elements clicked with passed reload value', (done) => {
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
        setTimeout(() => {
            try {
                clickables.forEach((clickable) => {
                    expect(clickable.getAttribute('clicked')).toBeTruthy();
                });
                expect(reloadSpy).toHaveBeenCalledTimes(1);
                expect(window.hit).toBe('FIRED');
                done();
            } catch (error) {
                done(error);
            } finally {
                reloadSpy.mockRestore();
            }
        }, 650);
        // Explanation of the 650ms delay:
        // 1. Initial delay before the click is triggered: 100ms
        // 2. Additional delay after the click is processed: 150ms * 3 = 450ms
        // 3. Delay before the reload action is executed: 100ms
        // Total delay calculation: 100ms + 450ms + 100ms = 650ms
    });

    test('Single element clicked with default reload value', (done) => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick');
        setTimeout(() => {
            try {
                expect(clickable.getAttribute('clicked')).toBeTruthy();
                expect(reloadSpy).toHaveBeenCalledTimes(1);
                expect(window.hit).toBe('FIRED');
                done();
            } catch (error) {
                done(error);
            } finally {
                reloadSpy.mockRestore();
            }
        }, 750);
        // Explanation of the 750ms delay:
        // 1. Initial delay before the click is triggered: 100ms
        // 2. Additional delay after the click is processed: 150ms
        // 3. Delay before the reload action is executed: 500ms
        // Total delay calculation: 100ms + 150ms + 500ms = 750ms
    });

    test('Passed reload option is not correct', (done) => {
        const ELEM_COUNT = 1;
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
        const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        const logMessageSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        // Attempt to trigger the click with an invalid reload value
        trustedClickElement(sourceParams, selectorsString, '', '100', 'reloadAfterClick10:10');
        setTimeout(() => {
            try {
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
                done();
            } catch (error) {
                done(error);
            } finally {
                reloadSpy.mockRestore();
                logMessageSpy.mockRestore();
            }
        }, 100);
    });
});
