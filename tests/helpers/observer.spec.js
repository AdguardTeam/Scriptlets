import {
    afterEach,
    beforeEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { observeDOMChanges } from '../../src/helpers';

/**
 * Time to wait for the observer callback, which is throttled, in milliseconds.
 */
const OBSERVER_DELAY_MS = 50;

const PAGE_ERROR_MESSAGE = 'ag-test-observer-page-error';

const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

/**
 * Makes a DOM mutation.
 */
const changeDom = () => {
    const elem = document.createElement('div');
    document.body.appendChild(elem);
    elem.remove();
};

/**
 * Makes a DOM mutation which wakes up the observers and waits until they handle it.
 */
const makeDomChange = async () => {
    changeDom();
    await sleep(OBSERVER_DELAY_MS);
};

/**
 * Observers cannot be disconnected, so they are still active in the following tests.
 * Callbacks should throw or change the DOM only once, so they do not affect the following tests.
 */
describe('observeDOMChanges', () => {
    /**
     * Error thrown by the callback may be reported as uncaught, like in the browser,
     * so it is prevented from failing the test.
     *
     * @param {ErrorEvent} event error event
     */
    const onError = (event) => {
        if (event.error?.message === PAGE_ERROR_MESSAGE) {
            event.preventDefault();
        }
    };

    beforeEach(() => {
        window.addEventListener('error', onError);
    });

    afterEach(() => {
        window.removeEventListener('error', onError);
    });

    test('calls callback on DOM change and does not observe its own mutations', async () => {
        const callback = vi.fn();
        callback.mockImplementationOnce(changeDom);
        observeDOMChanges(callback);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(1);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(2);
    });

    test('is connected again if callback throws', async () => {
        const callback = vi.fn();
        callback.mockImplementationOnce(() => {
            throw new Error(PAGE_ERROR_MESSAGE);
        });
        observeDOMChanges(callback);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(1);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(2);
    });

    test('does not observe mutations made by callback before it throws', async () => {
        const callback = vi.fn();
        callback.mockImplementationOnce(() => {
            changeDom();
            throw new Error(PAGE_ERROR_MESSAGE);
        });
        observeDOMChanges(callback);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(1);

        await makeDomChange();
        expect(callback).toHaveBeenCalledTimes(2);
    });
});
