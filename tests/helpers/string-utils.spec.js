import { toRegExp, inferValue } from '../../src/helpers';

describe('Test string utils', () => {
    describe('Test toRegExp for valid inputs', () => {
        const DEFAULT_VALUE = '.?';
        const defaultRegexp = new RegExp(DEFAULT_VALUE);

        const testCases = [
            {
                actual: '/abc/',
                expected: /abc/,
            },
            {
                actual: '/[a-z]{1,9}/',
                expected: /[a-z]{1,9}/,
            },
            {
                actual: '',
                expected: defaultRegexp,
            },
            {
                actual: undefined,
                expected: defaultRegexp,
            },
        ];
        test.each(testCases)('"$actual"', ({ actual, expected }) => {
            expect(toRegExp(actual)).toStrictEqual(expected);
        });
    });

    describe('Test toRegExp with flag', () => {
        const DEFAULT_VALUE = '.?';
        const defaultRegexp = new RegExp(DEFAULT_VALUE);

        const testCases = [
            {
                actual: '/qwerty/g',
                expected: /qwerty/g,
            },
            {
                actual: '/[a-z]{1,9}/gm',
                expected: /[a-z]{1,9}/gm,
            },
            {
                actual: '',
                expected: defaultRegexp,
            },
            {
                actual: undefined,
                expected: defaultRegexp,
            },
        ];
        test.each(testCases)('"$actual"', ({ actual, expected }) => {
            expect(toRegExp(actual)).toStrictEqual(expected);
        });
    });

    describe('Test toRegExp with not a valid flag', () => {
        const DEFAULT_VALUE = '.?';
        const defaultRegexp = new RegExp(DEFAULT_VALUE);

        const testCases = [
            {
                actual: 'g',
                expected: /g/,
            },
            {
                actual: 'qwerty/g',
                expected: /qwerty\/g/,
            },
            {
                actual: '/asdf/gmtest',
                expected: /\/asdf\/gmtest/,
            },
            {
                actual: '/qwert/ggm',
                expected: /\/qwert\/ggm/,
            },
            {
                actual: '/test\\/g',
                expected: /\/test\\\/g/,
            },
            {
                actual: '',
                expected: defaultRegexp,
            },
            {
                actual: undefined,
                expected: defaultRegexp,
            },
        ];
        test.each(testCases)('"$actual"', ({ actual, expected }) => {
            expect(toRegExp(actual)).toStrictEqual(expected);
        });
    });

    describe('Test toRegExp for invalid inputs', () => {
        const invalidRegexpPatterns = [
            '/\\/',
            '/[/',
            '/*/',
            '/[0-9]++/',
        ];
        test.each(invalidRegexpPatterns)('"%s"', (pattern) => {
            expect(() => {
                toRegExp(pattern);
            }).toThrow();
        });
    });

    test('Test toRegExp for escaped inputs', () => {
        /**
         * For cases where scriptlet rule argument has escaped quotes
         * e.g #%#//scriptlet('prevent-setTimeout', '.css(\'display\',\'block\');')
         *
         * https://github.com/AdguardTeam/Scriptlets/issues/286
         */

        let inputStr;
        let expRegex;

        // Single quotes, escaped
        inputStr = String.raw`.css(\'display\',\'block\');`;
        expRegex = /\.css\('display','block'\);/;
        expect(toRegExp(inputStr)).toStrictEqual(expRegex);
        // Single quotes, unescaped
        inputStr = ".css('display','block');";
        expect(toRegExp(inputStr)).toStrictEqual(expRegex);

        // Double quotes, escaped
        inputStr = String.raw`.css(\"display\",\"block\");`;
        expRegex = /\.css\("display","block"\);/;
        expect(toRegExp(inputStr)).toStrictEqual(expRegex);
        // Double quotes, unescaped
        inputStr = '.css("display","block");';
        expect(toRegExp(inputStr)).toStrictEqual(expRegex);
    });

    describe('inferValue works as expected with valid args', () => {
        const testCases = [
            {
                actual: '1234',
                expected: 1234,
                description: 'value to number',
            },
            {
                actual: '-12.34',
                expected: -12.34,
                description: 'value to float',
            },
            {
                actual: 'false',
                expected: false,
                description: 'value to false',
            },
            {
                actual: 'true',
                expected: true,
                description: 'value to true',
            },
            {
                actual: 'undefined',
                expected: undefined,
                description: 'value to undefined',
            },
            {
                actual: 'null',
                expected: null,
                description: 'value to null',
            },
            {
                actual: '{"aaa":123,"bbb":{"ccc":"string"}}',
                expected: {
                    aaa: 123,
                    bbb: {
                        ccc: 'string',
                    },
                },
                description: 'value to object',
            },
            {
                actual: '[1,2,"string"]',
                expected: [1, 2, 'string'],
                description: 'value to array',
            },
        ];
        test.each(testCases)('$description', ({ actual, expected }) => {
            expect(inferValue(actual)).toStrictEqual(expected);
        });

        test('value to NaN', () => {
            const actual = 'NaN';
            expect(Number.isNaN(inferValue(actual))).toBeTruthy();
        });
    });
});
