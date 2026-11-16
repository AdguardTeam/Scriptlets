import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { runAtReadyState } from '../../src/helpers/ready-state-utils';

describe('runAtReadyState', () => {
    let readyState = 'loading';

    const setReadyState = (state: string): void => {
        readyState = state;
        document.dispatchEvent(new Event('readystatechange'));
    };

    afterEach(() => {
        delete (document as unknown as { readyState?: string }).readyState;
    });

    // value of `runAt`, ready state in which the callback is called
    test.each([
        [undefined, 'loading'],
        ['', 'loading'],
        ['unknown', 'loading'],
        ['loading', 'loading'],
        ['asap', 'loading'],
        [1, 'loading'],
        ['interactive', 'interactive'],
        ['end', 'interactive'],
        // parseUboOptions() converts `2` to a number, e.g. `runAt, 2`
        [2, 'interactive'],
        ['2', 'interactive'],
        ['complete', 'complete'],
        ['idle', 'complete'],
        [3, 'complete'],
    ])('%j', (when, expectedState) => {
        readyState = 'loading';
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        const states: string[] = [];
        runAtReadyState(() => states.push(readyState), when);

        setReadyState('interactive');
        setReadyState('complete');

        expect(states).toEqual([expectedState]);
    });

    test('called once, and not again on the next state', () => {
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        readyState = 'loading';
        const callback = vi.fn();
        runAtReadyState(callback, 'interactive');

        setReadyState('interactive');
        setReadyState('complete');

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
