import { describe, test, expect } from 'vitest';

import { toRegExp, inferValue, extractRegexAndReplacement } from '../../src/helpers';

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

        test('too big of a number', () => {
            const actual = (32767 + 1).toString();
            expect(() => inferValue(actual)).toThrow('number values bigger than 32767 are not allowed');
        });

        test('string to regexp', () => {
            const actual = '/[a-z]{1,9}/';
            const expected = /[a-z]{1,9}/;

            const res = inferValue(actual);
            expect(res).toStrictEqual(expected);
            expect(res instanceof RegExp).toBeTruthy();
            expect(res.toString()).toStrictEqual(actual);
        });
    });

    test('Test regex and replacement extraction using "extractRegexAndReplacement"', () => {
        let inputStr;
        let objeRegexAndReplacement;
        let regex;
        let replacement;
        let expRegex;
        let expReplacement;

        // Single regex and replacement
        inputStr = 'replace:/foo/bar/';
        expRegex = /foo/;
        expReplacement = 'bar';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);
        regex = objeRegexAndReplacement.regexPart;
        replacement = objeRegexAndReplacement.replacementPart;

        expect(regex).toStrictEqual(expRegex);
        expect(replacement).toStrictEqual(expReplacement);

        // Single regex and replacement with "g" flag
        inputStr = 'replace:/foo/bar/g';
        expRegex = /foo/g;
        expReplacement = 'bar';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);
        regex = objeRegexAndReplacement.regexPart;
        replacement = objeRegexAndReplacement.replacementPart;

        expect(regex).toStrictEqual(expRegex);
        expect(replacement).toStrictEqual(expReplacement);

        // Slash escaped in regex part
        inputStr = String.raw`replace:/foo\/test/bar/`;
        expRegex = /foo\/test/;
        expReplacement = 'bar';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);
        regex = objeRegexAndReplacement.regexPart;
        replacement = objeRegexAndReplacement.replacementPart;

        expect(regex).toStrictEqual(expRegex);
        expect(replacement).toStrictEqual(expReplacement);

        // Slash escaped in regex part and unescaped slashes in replacement part
        inputStr = String.raw`replace:/foo\/ abc.*ads\/xyz/test/bar/`;
        expRegex = /foo\/ abc.*ads\/xyz/;
        expReplacement = 'test/bar';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);
        regex = objeRegexAndReplacement.regexPart;
        replacement = objeRegexAndReplacement.replacementPart;

        expect(regex).toStrictEqual(expRegex);
        expect(replacement).toStrictEqual(expReplacement);

        // Slash escaped in regex part and both escaped and unescaped slashes in replacement part
        inputStr = String.raw`replace:/foo\/ abc.*ads\/xyz/test\/bar/abc/`;
        expRegex = /foo\/ abc.*ads\/xyz/;
        expReplacement = String.raw`test\/bar/abc`;

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);
        regex = objeRegexAndReplacement.regexPart;
        replacement = objeRegexAndReplacement.replacementPart;

        expect(regex).toStrictEqual(expRegex);
        expect(replacement).toStrictEqual(expReplacement);

        // Invalid input without "replace:" prefix
        inputStr = '/foo/bar/';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);

        expect(objeRegexAndReplacement).toStrictEqual(undefined);

        // Invalid input without slash at the end
        inputStr = 'replace:/a/bar';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);

        expect(objeRegexAndReplacement).toStrictEqual(undefined);

        // Invalid input without slash at the beginning
        inputStr = 'replace:qwerty/asdfg/';

        objeRegexAndReplacement = extractRegexAndReplacement(inputStr);

        expect(objeRegexAndReplacement).toStrictEqual(undefined);
    });
});
