import {
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { getThrownValueMessage } from '../../src/helpers';

describe('getThrownValueMessage', () => {
    test.each([
        { value: new Error('error message'), expected: 'error message' },
        { value: { message: 'object message' }, expected: 'object message' },
        { value: null, expected: 'null' },
        { value: undefined, expected: 'undefined' },
        { value: 'string error', expected: 'string error' },
        { value: 42, expected: '42' },
        { value: Symbol('symbol error'), expected: 'Symbol(symbol error)' },
        { value: {}, expected: '' },
        { value: { message: 1 }, expected: '' },
    ])('returns $expected for $value', ({ value, expected }) => {
        expect(getThrownValueMessage(value)).toBe(expected);
    });

    test('does not convert an object without a message', () => {
        const toJSON = vi.fn();
        const toString = vi.fn();
        const value = { toJSON, toString };

        expect(getThrownValueMessage(value)).toBe('');
        expect(toJSON).not.toHaveBeenCalled();
        expect(toString).not.toHaveBeenCalled();
    });

    test('returns an empty string if reading the message throws', () => {
        const value = {
            get message() {
                throw new Error('getter error');
            },
        };

        expect(getThrownValueMessage(value)).toBe('');
    });
});
