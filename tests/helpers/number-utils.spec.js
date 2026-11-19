import { describe, test, expect } from 'vitest';

import { getNumberFromString, isDigits } from '../../src/helpers';
import { useThrowingMethod } from '../helpers';

describe('Number utils tests', () => {
    describe('check getNumberFromString for all data types inputs', () => {
        const testCases = [
            {
                actual: 123,
                expected: 123,
            },
            {
                actual: '123parsable',
                expected: 123,
            },
            {
                actual: true,
                expected: null,
            },
            {
                actual: null,
                expected: null,
            },
            {
                actual: undefined,
                expected: null,
            },
            {
                actual: undefined,
                expected: null,
            },
            {
                actual: 'not parsable 123',
                expected: null,
            },
            {
                actual: { test: 'test' },
                expected: null,
            },
            {
                actual: ['test'],
                expected: null,
            },
            {
                actual: ['test'],
                expected: null,
            },
        ];
        test.each(testCases)('$actual -> $expected', ({ actual, expected }) => {
            expect(getNumberFromString(actual)).toStrictEqual(expected);
        });
    });
});

describe('isDigits', () => {
    test.each(['0', '7', '117', '0012', '9999999999999999999'])('%s has only digits', (value) => {
        expect(isDigits(value)).toBe(true);
    });

    test.each([
        '', ' 1', '1 ', '+1', '-1', '1.5', '1e3', '0x1', '١٢', '٣', 'a1',
    ])('"%s" has other characters', (value) => {
        expect(isDigits(value)).toBe(false);
    });

    test('calls no method which another rule may hook', () => {
        const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
        const restoreCharCodeAt = useThrowingMethod(String.prototype, 'charCodeAt');
        let results;
        try {
            results = [isDigits('117'), isDigits('1a')];
        } finally {
            restoreTest();
            restoreCharCodeAt();
        }
        expect(results).toEqual([true, false]);
    });
});
