import { getNumberFromString } from '../../src/helpers';

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
