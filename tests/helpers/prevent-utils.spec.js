import { parseRawDelay } from '../../src/helpers';

describe('Test parseRawDelay', () => {
    const testCases = [
        {
            actual: 0,
            expected: 0,
        },
        {
            actual: 10,
            expected: 10,
        },
        {
            actual: 10.123,
            expected: 10,
        },
        {
            actual: '0',
            expected: 0,
        },
        {
            actual: '10',
            expected: 10,
        },
        {
            actual: '10.123',
            expected: 10,
        },
        {
            actual: 'string',
            expected: 'string',
        },
        {
            actual: null,
            expected: null,
        },
        {
            actual: undefined,
            expected: undefined,
        },
        {
            actual: false,
            expected: false,
        },
    ];
    test.each(testCases)('$actual -> $expected', ({ actual, expected }) => {
        expect(parseRawDelay(actual)).toStrictEqual(expected);
    });

    test('parsing NaN', () => {
        const actual = NaN;
        expect(parseRawDelay(actual).toString()).toStrictEqual('NaN');
    });
});
