import { describe, test, expect } from 'vitest';

import {
    toRegExp,
    inferValue,
    extractRegexAndReplacement,
    splitByNotEscapedDelimiter,
} from '../../src/helpers';

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

        test('simple string without quotes - "no"', () => {
            const actual = 'no';
            const expected = 'no';
            expect(inferValue(actual)).toStrictEqual(expected);
        });

        test('simple string without quotes - "yes"', () => {
            const actual = 'yes';
            const expected = 'yes';
            expect(inferValue(actual)).toStrictEqual(expected);
        });

        test('simple string without quotes - "allow"', () => {
            const actual = 'allow';
            const expected = 'allow';
            expect(inferValue(actual)).toStrictEqual(expected);
        });

        test('unparseable value treated as string', () => {
            const actual = '{|';
            const expected = '{|';
            expect(inferValue(actual)).toStrictEqual(expected);
        });
    });

    describe('Test regex and replacement extraction using "extractRegexAndReplacement"', () => {
        test('Single regex and replacement', () => {
            const inputStr = 'replace:/foo/bar/';
            const expRegex = /foo/;
            const expReplacement = 'bar';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);
            const regex = objRegexAndReplacement.regexPart;
            const replacement = objRegexAndReplacement.replacementPart;

            expect(regex).toStrictEqual(expRegex);
            expect(replacement).toStrictEqual(expReplacement);
        });

        test('Single regex and replacement with "g" flag', () => {
            const inputStr = 'replace:/foo/bar/g';
            const expRegex = /foo/g;
            const expReplacement = 'bar';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);
            const regex = objRegexAndReplacement.regexPart;
            const replacement = objRegexAndReplacement.replacementPart;

            expect(regex).toStrictEqual(expRegex);
            expect(replacement).toStrictEqual(expReplacement);
        });

        test('Single regex and replacement with escaped slashes', () => {
            const inputStr = String.raw`replace:/foo\/test/bar/`;
            const expRegex = /foo\/test/;
            const expReplacement = 'bar';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);
            const regex = objRegexAndReplacement.regexPart;
            const replacement = objRegexAndReplacement.replacementPart;

            expect(regex).toStrictEqual(expRegex);
            expect(replacement).toStrictEqual(expReplacement);
        });

        test('Slash escaped in regex part and unescaped slashes in replacement part', () => {
            const inputStr = String.raw`replace:/foo\/ abc.*ads\/xyz/test/bar/`;
            const expRegex = /foo\/ abc.*ads\/xyz/;
            const expReplacement = 'test/bar';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);
            const regex = objRegexAndReplacement.regexPart;
            const replacement = objRegexAndReplacement.replacementPart;

            expect(regex).toStrictEqual(expRegex);
            expect(replacement).toStrictEqual(expReplacement);
        });

        test('Slash escaped in regex part and both escaped and unescaped slashes in replacement part', () => {
            const inputStr = String.raw`replace:/foo\/ abc.*ads\/xyz/test\/bar/abc/`;
            const expRegex = /foo\/ abc.*ads\/xyz/;
            const expReplacement = String.raw`test\/bar/abc`;

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);
            const regex = objRegexAndReplacement.regexPart;
            const replacement = objRegexAndReplacement.replacementPart;

            expect(regex).toStrictEqual(expRegex);
            expect(replacement).toStrictEqual(expReplacement);
        });

        test('Invalid input without "replace:" prefix', () => {
            const inputStr = '/foo/bar/';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);

            expect(objRegexAndReplacement).toStrictEqual(undefined);
        });

        test('Invalid input without slash at the end', () => {
            const inputStr = 'replace:/a/bar';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);

            expect(objRegexAndReplacement).toStrictEqual(undefined);
        });

        test('Invalid input without slash at the beginning', () => {
            const inputStr = 'replace:qwerty/asdfg/';

            const objRegexAndReplacement = extractRegexAndReplacement(inputStr);

            expect(objRegexAndReplacement).toStrictEqual(undefined);
        });

        test('Test for null/undefined/empty inputs', () => {
            expect(extractRegexAndReplacement(null)).toBeUndefined();
            expect(extractRegexAndReplacement(undefined)).toBeUndefined();
            expect(extractRegexAndReplacement('')).toBeUndefined();
        });

        test('Edge cases with replace: prefix', () => {
            // Only prefix
            expect(extractRegexAndReplacement('replace:')).toBeUndefined();

            // Empty regex and replacement
            expect(extractRegexAndReplacement('replace://')).toBeUndefined();

            // Empty regex
            expect(extractRegexAndReplacement('replace://bar/')).toBeUndefined();

            // Empty replacement
            const result = extractRegexAndReplacement('replace:/foo//');
            expect(result.regexPart).toStrictEqual(/foo/);
            expect(result.replacementPart).toBe('');
        });

        test('Should handle no unescaped delimiter slash', () => {
            // All slashes are escaped
            expect(extractRegexAndReplacement('replace:/foo\\/bar\\//g')).toBeUndefined();

            // No slash separator found
            expect(extractRegexAndReplacement('replace:/nodelimiter/')).toBeUndefined();
        });

        test('Test invalid regex patterns', () => {
            // Invalid regex - unmatched bracket
            expect(extractRegexAndReplacement('replace:/[/bar/')).toBeUndefined();

            // Invalid regex - unmatched parenthesis
            expect(extractRegexAndReplacement('replace:/(/bar/')).toBeUndefined();

            // Invalid regex - incomplete character class
            expect(extractRegexAndReplacement('replace:/[a-/bar/')).toBeUndefined();
        });

        test('Test complex backslash escape scenarios', () => {
            // Multiple consecutive backslashes before slash
            const result1 = extractRegexAndReplacement(String.raw`replace:/foo\\\\/bar/`);
            expect(result1.regexPart).toStrictEqual(/foo\\\\/);
            expect(result1.replacementPart).toBe('bar');

            // Complex escaping patterns
            // "foo\\\\\\" is a regex part
            // first "/" is a slash delimiter
            // "/bar" is the replacement part
            const result2 = extractRegexAndReplacement(String.raw`replace:/foo\\\\\\//bar/`);
            expect(result2.regexPart).toStrictEqual(/foo\\\\\\/);
            expect(result2.replacementPart).toBe('/bar');

            // Even number of backslashes (unescaped slash)
            const result3 = extractRegexAndReplacement(String.raw`replace:/foo\\\\/bar/test/`);
            expect(result3.regexPart).toStrictEqual(/foo\\\\/);
            expect(result3.replacementPart).toBe('bar/test');
        });

        test('Test complex escaping patterns', () => {
            // "foo\\\/\\\/\/" is a regex part
            // first not escaped "/" is a slash delimiter
            // "/bar/test/abc" is the replacement part
            const result = extractRegexAndReplacement(String.raw`replace:/foo\\\/\\\/\///bar/test\/abc/`);
            expect(result.regexPart).toStrictEqual(/foo\\\/\\\/\//);
            expect(result.replacementPart).toBe('/bar/test\\/abc');
        });

        test('Test unsupported regex flags', () => {
            // i flag should be unsupported
            expect(extractRegexAndReplacement('replace:/foo/bar/i')).toBeUndefined();

            // gi flags should be unsupported
            expect(extractRegexAndReplacement('replace:/foo/bar/gi')).toBeUndefined();

            // m flag should be unsupported
            expect(extractRegexAndReplacement('replace:/foo/bar/m')).toBeUndefined();
        });

        test('Test edge cases with whitespace', () => {
            // Whitespace in regex
            const result1 = extractRegexAndReplacement('replace:/foo bar/baz/');
            expect(result1.regexPart).toStrictEqual(/foo bar/);
            expect(result1.replacementPart).toBe('baz');

            // Whitespace in replacement
            const result2 = extractRegexAndReplacement('replace:/foo/bar baz/');
            expect(result2.regexPart).toStrictEqual(/foo/);
            expect(result2.replacementPart).toBe('bar baz');
        });

        test('Test special characters in replacement', () => {
            // Dollar signs in replacement
            const result1 = extractRegexAndReplacement('replace:/foo/$1 $2/');
            expect(result1.regexPart).toStrictEqual(/foo/);
            expect(result1.replacementPart).toBe('$1 $2');

            // Backslashes in replacement
            const result2 = extractRegexAndReplacement('replace:/foo/bar\\n/');
            expect(result2.regexPart).toStrictEqual(/foo/);
            expect(result2.replacementPart).toBe('bar\\n');
        });
    });

    describe('splitByNotEscapedDelimiter', () => {
        test('Basic split with no escaped delimiters', () => {
            const result = splitByNotEscapedDelimiter('foo,bar,baz', ',');
            expect(result).toStrictEqual(['foo', 'bar', 'baz']);
        });

        test('Split with single escaped delimiter', () => {
            const result = splitByNotEscapedDelimiter('foo\\,bar,baz', ',');
            expect(result).toStrictEqual(['foo,bar', 'baz']);
        });

        test('Split with multiple escaped delimiters', () => {
            const result = splitByNotEscapedDelimiter('foo\\,bar\\,baz,qux', ',');
            expect(result).toStrictEqual(['foo,bar,baz', 'qux']);
        });

        test('Split with escaped and unescaped delimiters', () => {
            const result = splitByNotEscapedDelimiter('a\\,b,c\\,d,e', ',');
            expect(result).toStrictEqual(['a,b', 'c,d', 'e']);
        });

        test('Split with no delimiters', () => {
            const result = splitByNotEscapedDelimiter('foobar', ',');
            expect(result).toStrictEqual(['foobar']);
        });

        test('Split with only escaped delimiters', () => {
            const result = splitByNotEscapedDelimiter('foo\\,bar\\,baz', ',');
            expect(result).toStrictEqual(['foo,bar,baz']);
        });

        test('Split empty string', () => {
            const result = splitByNotEscapedDelimiter('', ',');
            expect(result).toStrictEqual(['']);
        });

        test('Split with delimiter at start', () => {
            const result = splitByNotEscapedDelimiter(',foo,bar', ',');
            expect(result).toStrictEqual(['', 'foo', 'bar']);
        });

        test('Split with delimiter at end', () => {
            const result = splitByNotEscapedDelimiter('foo,bar,', ',');
            expect(result).toStrictEqual(['foo', 'bar', '']);
        });

        test('Split with consecutive delimiters', () => {
            const result = splitByNotEscapedDelimiter('foo,,bar', ',');
            expect(result).toStrictEqual(['foo', '', 'bar']);
        });

        test('Split with escaped delimiter at start', () => {
            const result = splitByNotEscapedDelimiter('\\,foo,bar', ',');
            expect(result).toStrictEqual([',foo', 'bar']);
        });

        test('Split with escaped delimiter at end', () => {
            const result = splitByNotEscapedDelimiter('foo,bar\\,', ',');
            expect(result).toStrictEqual(['foo', 'bar,']);
        });

        test('Split with different delimiter', () => {
            const result = splitByNotEscapedDelimiter('foo|bar\\|baz|qux', '|');
            expect(result).toStrictEqual(['foo', 'bar|baz', 'qux']);
        });

        test('Split with multi-character delimiter', () => {
            const result = splitByNotEscapedDelimiter('foo::bar\\::baz::qux', '::');
            expect(result).toStrictEqual(['foo', 'bar::baz', 'qux']);
        });

        test('Split with special regex characters as delimiter', () => {
            const result = splitByNotEscapedDelimiter('foo.bar\\.baz.qux', '.');
            expect(result).toStrictEqual(['foo', 'bar.baz', 'qux']);
        });

        test('Complex case with multiple escapes', () => {
            const result = splitByNotEscapedDelimiter('a\\,b\\,c,d,e\\,f', ',');
            expect(result).toStrictEqual(['a,b,c', 'd', 'e,f']);
        });

        test('Single character string that is delimiter', () => {
            const result = splitByNotEscapedDelimiter(',', ',');
            expect(result).toStrictEqual(['', '']);
        });

        test('Single character string that is escaped delimiter', () => {
            const result = splitByNotEscapedDelimiter('\\,', ',');
            expect(result).toStrictEqual([',']);
        });
    });
});
