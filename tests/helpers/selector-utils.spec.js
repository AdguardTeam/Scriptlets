import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { isEmptySelector, isValidSelector, splitSelectors } from '../../src/helpers';

describe('isValidSelector', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        'div',
        '#id',
        '.class',
        'a[href*="example.org"]',
        'div > p:not(.ad), span + i',
    ])('valid selector: %s', (selector) => {
        expect(isValidSelector(selector)).toBe(true);
    });

    test.each([
        '',
        '..class',
        '.1class',
        'div[',
        'div >',
        '[1a]',
    ])('invalid selector: "%s"', (selector) => {
        expect(isValidSelector(selector)).toBe(false);
    });

    test('does not query the page DOM', () => {
        const querySelectorSpy = vi.spyOn(document, 'querySelector');
        const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');

        isValidSelector('div');

        expect(querySelectorSpy).not.toHaveBeenCalled();
        expect(querySelectorAllSpy).not.toHaveBeenCalled();
    });
});

describe('isEmptySelector', () => {
    test.each([
        '',
        '   ',
        '/**/',
        '/* #reject */',
        ' /* #reject */ /* #close */ ',
        // unclosed comment lasts till the end
        '/* #reject',
    ])('empty: "%s"', (selector) => {
        expect(isEmptySelector(selector)).toBe(true);
    });

    test.each([
        '#accept',
        '/* #reject */ #accept',
        '#accept /* #reject */',
        '[title="/*"]',
        'xpath(//*)',
        'xpath(/*)',
    ])('not empty: %s', (selector) => {
        expect(isEmptySelector(selector)).toBe(false);
    });
});

describe('splitSelectors', () => {
    test.each([
        {
            name: 'CSS selectors',
            selectors: 'div > button, #id,.class',
            delimiter: ',',
            expected: ['div > button', '#id', '.class'],
        },
        {
            name: 'single CSS selector',
            selectors: ' button ',
            delimiter: ',',
            expected: ['button'],
        },
        {
            name: 'commas inside XPath',
            selectors: 'xpath(//button[contains(text(), "Accept")]), div, xpath(//*[@id=concat("a", "b")])',
            delimiter: ',',
            expected: [
                'xpath(//button[contains(text(), "Accept")])',
                'div',
                'xpath(//*[@id=concat("a", "b")])',
            ],
        },
        {
            name: 'parentheses and commas inside XPath string literals',
            selectors: 'xpath(//button[text()=")),"]), xpath(//a[@title=\'(,\'])',
            delimiter: ',',
            expected: ['xpath(//button[text()=")),"])', 'xpath(//a[@title=\'(,\'])'],
        },
        {
            name: 'commas inside XPath after shadow combinator',
            selectors: '#host >>> xpath(.//button[contains(text(), "Accept")]), div',
            delimiter: ',',
            expected: ['#host >>> xpath(.//button[contains(text(), "Accept")])', 'div'],
        },
        {
            name: 'shadow combinator',
            selectors: 'xpath(//div[@id="host"]) >>> div > button >>> xpath(.//button)',
            delimiter: ' >>> ',
            expected: ['xpath(//div[@id="host"])', 'div > button', 'xpath(.//button)'],
        },
        {
            name: 'shadow combinator inside XPath string literal',
            selectors: '#host >>> xpath(.//button[text()=" >>> "])',
            delimiter: ' >>> ',
            expected: ['#host', 'xpath(.//button[text()=" >>> "])'],
        },
        {
            name: 'xpath( inside CSS pseudo-class',
            selectors: 'div:not(xpath(a, b)), span',
            delimiter: ',',
            expected: ['div:not(xpath(a, b))', 'span'],
        },
        {
            name: 'commas inside CSS pseudo-classes',
            selectors: 'div:is(.a, .b) > button:not(.c, .d), li:nth-child(2n + 1 of .e, .f), span',
            delimiter: ',',
            expected: ['div:is(.a, .b) > button:not(.c, .d)', 'li:nth-child(2n + 1 of .e, .f)', 'span'],
        },
        {
            name: 'commas inside nested CSS pseudo-classes',
            selectors: 'div:has(> :is(.a, .b), :where(.c, .d)), span',
            delimiter: ',',
            expected: ['div:has(> :is(.a, .b), :where(.c, .d))', 'span'],
        },
        {
            name: 'commas and brackets inside CSS attribute values',
            selectors: 'button[title="Accept, ]agree"], a[title=\'(,\'], span',
            delimiter: ',',
            expected: ['button[title="Accept, ]agree"]', 'a[title=\'(,\']', 'span'],
        },
        {
            name: 'escaped quote inside CSS attribute value',
            selectors: 'button[title="Accept \\", agree"], span',
            delimiter: ',',
            expected: ['button[title="Accept \\", agree"]', 'span'],
        },
        {
            name: 'escaped comma in CSS selector',
            selectors: '#accept\\,agree, span',
            delimiter: ',',
            expected: ['#accept\\,agree', 'span'],
        },
        {
            name: 'parentheses, brackets and quotes inside CSS comments',
            selectors: '#first/*(*/, #second/*[*/, #third/*"*/, #fourth',
            delimiter: ',',
            expected: ['#first/*(*/', '#second/*[*/', '#third/*"*/', '#fourth'],
        },
        {
            name: 'comma and backslash inside CSS comments',
            selectors: '#first/*,*/, #second/*\\*/, #third',
            delimiter: ',',
            expected: ['#first/*,*/', '#second/*\\*/', '#third'],
        },
        {
            name: 'unclosed CSS comment',
            selectors: '#first/*, #second',
            delimiter: ',',
            expected: ['#first/*, #second'],
        },
        {
            name: 'shadow combinator after CSS comment with parenthesis',
            selectors: '#host/*(*/ >>> button',
            delimiter: ' >>> ',
            expected: ['#host/*(*/', 'button'],
        },
        {
            name: 'shadow combinator inside CSS comment',
            selectors: '#host /* >>> */ button',
            delimiter: ' >>> ',
            expected: ['#host /* >>> */ button'],
        },
        {
            name: 'XPath path steps are not CSS comments',
            selectors: 'xpath(//div[@id="a"]/*[1]), #b',
            delimiter: ',',
            expected: ['xpath(//div[@id="a"]/*[1])', '#b'],
        },
        {
            name: 'backslash before quote inside XPath string literal',
            selectors: 'xpath(//a[@title="C:\\"]), span',
            delimiter: ',',
            expected: ['xpath(//a[@title="C:\\"])', 'span'],
        },
        {
            name: 'shadow combinator inside CSS attribute value',
            selectors: '#host >>> button[title=" >>> "]',
            delimiter: ' >>> ',
            expected: ['#host', 'button[title=" >>> "]'],
        },
        // Invalid CSS selectors are not recovered, so the rest of the string stays a part of them
        {
            name: 'unclosed square bracket in CSS selector',
            selectors: '#first, button[name="agree", #close',
            delimiter: ',',
            expected: ['#first', 'button[name="agree", #close'],
        },
        {
            name: 'unclosed parenthesis in CSS selector',
            selectors: '#first, div:not(.a, #close',
            delimiter: ',',
            expected: ['#first', 'div:not(.a, #close'],
        },
        {
            name: 'unclosed quote in CSS selector',
            selectors: '#first, button[title="Accept], #close',
            delimiter: ',',
            expected: ['#first', 'button[title="Accept], #close'],
        },
        {
            name: 'unexpected closing parenthesis in CSS selector',
            selectors: '#first, div), #close',
            delimiter: ',',
            expected: ['#first', 'div), #close'],
        },
        {
            name: 'unclosed square bracket in CSS selector before shadow combinator',
            selectors: '#host[ >>> button',
            delimiter: ' >>> ',
            expected: ['#host[ >>> button'],
        },
        {
            name: 'unclosed XPath',
            selectors: 'xpath(//button[contains(text(), "Accept"], div',
            delimiter: ',',
            expected: ['xpath(//button[contains(text(), "Accept"], div'],
        },
    ])('$name', ({ selectors, delimiter, expected }) => {
        expect(splitSelectors(selectors, delimiter)).toStrictEqual(expected);
    });
});
