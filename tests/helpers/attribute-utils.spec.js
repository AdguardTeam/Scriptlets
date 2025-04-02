import { describe, test, expect } from 'vitest';

import { parseAttributePairs, getElementAttributesWithValues } from '../../src/helpers';

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

describe('getElementAttributesWithValues', () => {
    test('Only node name', () => {
        const anchor = document.createElement('a');
        const expected = 'a';
        const result = getElementAttributesWithValues(anchor);
        expect(result).toStrictEqual(expected);
    });

    test('Node name with attributes', () => {
        const NODE_NAME = 'div';
        const ATTRIBUTE_CLASS = 'class';
        const ATTRIBUTE_CLASS_VALUE = 'test-class';
        const ATTRIBUTE_STYLE = 'style';
        const ATTRIBUTE_STYLE_VALUE = 'display: none;';
        const ATTRIBUTE_DATA_TEST = 'data-test';
        const ATTRIBUTE_DATA_TEST_VALUE = 'test-value';
        const divWithClassAndStyle = document.createElement(NODE_NAME);
        divWithClassAndStyle.setAttribute(ATTRIBUTE_CLASS, ATTRIBUTE_CLASS_VALUE);
        divWithClassAndStyle.setAttribute(ATTRIBUTE_STYLE, ATTRIBUTE_STYLE_VALUE);
        divWithClassAndStyle.setAttribute(ATTRIBUTE_DATA_TEST, ATTRIBUTE_DATA_TEST_VALUE);
        // eslint-disable-next-line max-len
        const expected = `${NODE_NAME}[${ATTRIBUTE_CLASS}="${ATTRIBUTE_CLASS_VALUE}"][${ATTRIBUTE_STYLE}="${ATTRIBUTE_STYLE_VALUE}"][${ATTRIBUTE_DATA_TEST}="${ATTRIBUTE_DATA_TEST_VALUE}"]`;
        const result = getElementAttributesWithValues(divWithClassAndStyle);
        expect(result).toStrictEqual(expected);
    });

    test('Not element - should return empty string', () => {
        const expected = '';
        const result = getElementAttributesWithValues('test');
        expect(result).toStrictEqual(expected);
    });
});
