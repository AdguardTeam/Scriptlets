import { describe, test, expect } from 'vitest';

import { parseAttributePairs } from '../../src/helpers';

describe('parseAttributePairs', () => {
    describe('valid input', () => {
        const testCases = [
            {
                actual: '',
                expected: [],
            },
            {
                actual: 'test',
                expected: [{
                    name: 'test',
                    value: '',
                }],
            },
            {
                actual: 'empty=""',
                expected: [{
                    name: 'empty',
                    value: '',
                }],
            },
            {
                actual: 'equal-sign="="',
                expected: [{
                    name: 'equal-sign',
                    value: '=',
                }],
            },
            {
                actual: 'name1="value1"',
                expected: [{
                    name: 'name1',
                    value: 'value1',
                }],
            },
            {
                actual: 'test="escaped\\"quote"',
                expected: [{
                    name: 'test',
                    value: 'escaped"quote',
                }],
            },
            {
                actual: 'test2="escaped-quote\\" and space"',
                expected: [{
                    name: 'test2',
                    value: 'escaped-quote" and space',
                }],
            },
            {
                actual: 'n1="v1" n2="v2"',
                expected: [
                    {
                        name: 'n1',
                        value: 'v1',
                    },
                    {
                        name: 'n2',
                        value: 'v2',
                    },
                ],
            },
            {
                // multiple spaces between attributes are skipped
                actual: 'test1  test2',
                expected: [
                    {
                        name: 'test1',
                        value: '',
                    },
                    {
                        name: 'test2',
                        value: '',
                    },
                ],
            },
            {
                actual: 'name1="has space" name2="noSpace"',
                expected: [
                    {
                        name: 'name1',
                        value: 'has space',
                    },
                    {
                        name: 'name2',
                        value: 'noSpace',
                    },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'class="adsbygoogle adsbygoogle-noablate" data-adsbygoogle-status="done" data-ad-status="filled" style="top: 0 !important;"',
                expected: [
                    {
                        name: 'class',
                        value: 'adsbygoogle adsbygoogle-noablate',
                    },
                    {
                        name: 'data-adsbygoogle-status',
                        value: 'done',
                    },
                    {
                        name: 'data-ad-status',
                        value: 'filled',
                    },
                    {
                        name: 'style',
                        value: 'top: 0 !important;',
                    },
                ],
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(parseAttributePairs(actual)).toStrictEqual(expected);
        });
    });

    describe('invalid input', () => {
        const testCases = [
            {
                actual: 'name1=value1',
                expected: 'Attribute value should be quoted: "value1"',
            },
            {
                actual: 'name1="value1"  ="value2"',
                expected: "Attribute name before '=' should be specified: 'name1=\"value1\"  =\"value2\"'",
            },
            {
                actual: 'name1="value1"name2="value2"',
                expected: 'No space before attribute: \'name2="value2"\'',
            },
            {
                actual: 'test="non-escaped"quote"',
                // non-escaped quote in the value causes value collection to finish on it
                // so the following string part is treated as a new attribute
                expected: 'No space before attribute: \'quote"\'',
            },
            {
                actual: 'name1="',
                expected: 'Unbalanced quote for attribute value: \'name1="\'',
            },
            {
                actual: 'name1="value1',
                expected: 'Unbalanced quote for attribute value: \'name1="value1\'',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(() => parseAttributePairs(actual)).toThrow(expected);
        });
    });
});
