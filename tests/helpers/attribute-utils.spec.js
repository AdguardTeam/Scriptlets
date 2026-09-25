/* eslint-disable no-underscore-dangle */
import {
    afterEach,
    beforeEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import {
    parseAttributePairs,
    getElementAttributesWithValues,
    defaultAttributeSetter,
    setAttributeBySelector,
} from '../../src/helpers';

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

describe('defaultAttributeSetter', () => {
    const ATTR_NAME = 'data-test';

    test('sets attribute and returns true if it is missing', () => {
        const elem = document.createElement('div');
        expect(defaultAttributeSetter(elem, ATTR_NAME, '')).toBe(true);
        expect(elem.getAttribute(ATTR_NAME)).toBe('');
    });

    test('sets attribute and returns true if its value differs', () => {
        const elem = document.createElement('div');
        elem.setAttribute(ATTR_NAME, '1');
        expect(defaultAttributeSetter(elem, ATTR_NAME, '2')).toBe(true);
        expect(elem.getAttribute(ATTR_NAME)).toBe('2');
    });

    test('does not set attribute and returns false if its value matches', () => {
        const elem = document.createElement('div');
        elem.setAttribute(ATTR_NAME, '1');
        const setAttributeSpy = vi.spyOn(elem, 'setAttribute');
        expect(defaultAttributeSetter(elem, ATTR_NAME, '1')).toBe(false);
        expect(setAttributeSpy).not.toHaveBeenCalled();
        expect(elem.getAttribute(ATTR_NAME)).toBe('1');
    });
});

describe('setAttributeBySelector', () => {
    const CLASS_NAME = 'ag-test-attr-utils';
    const SELECTOR = `.${CLASS_NAME}`;
    const ATTR_NAME = 'data-test';
    const source = {
        name: 'set-attr',
        args: [],
        verbose: true,
    };

    let elems;

    beforeEach(() => {
        elems = [document.createElement('div'), document.createElement('div')];
        elems.forEach((elem) => {
            elem.classList.add(CLASS_NAME);
            document.body.appendChild(elem);
        });
        window.__debug = vi.fn();
        // hit() logs a trace on each call
        vi.spyOn(console, 'trace').mockImplementation(() => {});
    });

    afterEach(() => {
        elems.forEach((elem) => elem.remove());
        delete window.__debug;
        vi.restoreAllMocks();
    });

    test('sets attribute and calls hit if some of matched elements are changed', () => {
        elems[0].setAttribute(ATTR_NAME, '1');
        setAttributeBySelector(source, SELECTOR, ATTR_NAME, '1');
        elems.forEach((elem) => expect(elem.getAttribute(ATTR_NAME)).toBe('1'));
        expect(window.__debug).toHaveBeenCalledTimes(1);
    });

    test('does not call hit if all matched elements already have the value', () => {
        elems.forEach((elem) => elem.setAttribute(ATTR_NAME, '1'));
        setAttributeBySelector(source, SELECTOR, ATTR_NAME, '1');
        expect(window.__debug).not.toHaveBeenCalled();
    });

    test('calls hit only if custom attribute setter reports a change', () => {
        const noChangeSetter = vi.fn(() => false);
        setAttributeBySelector(source, SELECTOR, ATTR_NAME, '1', noChangeSetter);
        expect(noChangeSetter).toHaveBeenCalledTimes(elems.length);
        expect(window.__debug).not.toHaveBeenCalled();

        const changeSetter = vi.fn(() => true);
        setAttributeBySelector(source, SELECTOR, ATTR_NAME, '1', changeSetter);
        expect(changeSetter).toHaveBeenCalledTimes(elems.length);
        expect(window.__debug).toHaveBeenCalledTimes(1);
    });
});
