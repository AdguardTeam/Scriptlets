import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import {
    isValidXpath,
    hasAbsoluteXpath,
    getXpathExpression,
    splitSelectors,
    getXpathElements,
} from '../../src/helpers';

describe('isValidXpath', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        '//button',
        './/div[@id="panel"]/button',
        '//button[contains(text(), "Accept")]',
        '//a | //button',
        '(//button)[1]',
        'self::button',
    ])('valid expression: %s', (expression) => {
        expect(isValidXpath(expression)).toBe(true);
    });

    test.each([
        '',
        '//button[',
        '//button[contains(text(), "Accept"]',
        '//button)',
        // valid syntax, but does not select nodes
        'count(//button)',
        'string(//button)',
    ])('invalid expression: "%s"', (expression) => {
        expect(isValidXpath(expression)).toBe(false);
    });

    test('does not query the page DOM', () => {
        const evaluateSpy = vi.spyOn(document, 'evaluate');

        isValidXpath('//button');

        expect(evaluateSpy).toHaveBeenCalledTimes(1);
        const contextNode = evaluateSpy.mock.calls[0][1];
        expect(contextNode.isConnected).toBe(false);
    });
});

describe('hasAbsoluteXpath', () => {
    test.each([
        '//button',
        '/html/body//button',
        '  //button',
        './/a | //button',
        '(//button)[1]',
        './/button[//div[@id="panel"]]',
        './/button[@id = /html/@id]',
        './/button[contains(//title, "Accept")]',
        './/button[@id and //div]',
        './/button[@id or /html]',
        // operators without whitespace before them
        'descendant-or-self::button[text()="OK"and //div[@id="light"]]',
        './/button[(@x)or //div]',
        'descendant-or-self::button[true()and//button[@id="outside"]]',
        // arithmetic operators
        './/button[1 - /html/@x = 1]',
        './/button[2 * /html/@x]',
        './/button[@x mod //a]',
        './/button[@x div /html/@y]',
        './/button[@x + /html/@y]',
    ])('absolute: %s', (expression) => {
        expect(hasAbsoluteXpath(expression)).toBe(true);
    });

    test.each([
        './/button',
        'descendant-or-self::button',
        'self::button[text()="(//"]',
        './/a[@title=\'[/\']',
        'div/button',
        './/div//button',
        '..//button',
        '*/button',
        './/div[1]/button',
        '(.//button)[1]',
        './/button[contains(., "a, /b")]',
        // names of operators as name tests
        'descendant-or-self::div[ or/span]',
        './/div[ and /span]',
        '.// and/button',
        // hyphen inside name is not an operator
        './/my-button/span',
        './/div/node()//span',
        // `*` as multiplication and as name test
        './/a[@x * 2 = 4]/b',
        './/div/*/button',
    ])('relative: %s', (expression) => {
        expect(hasAbsoluteXpath(expression)).toBe(false);
    });
});

describe('getXpathExpression', () => {
    test.each([
        { selector: 'xpath(//button)', expected: '//button' },
        {
            selector: 'xpath(//button[contains(text(), "Accept")])',
            expected: '//button[contains(text(), "Accept")]',
        },
        // missing closing parenthesis
        { selector: 'xpath(//button', expected: '' },
        { selector: 'xpath(//button) div', expected: '' },
        { selector: 'xpath()', expected: '' },
        // not XPath
        { selector: 'div > button', expected: null },
        { selector: 'div xpath(//button)', expected: null },
    ])('$selector', ({ selector, expected }) => {
        expect(getXpathExpression(selector)).toBe(expected);
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

describe('getXpathElements', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    test('selects nothing if evaluation fails', () => {
        document.body.innerHTML = '<button id="button"></button>';
        // e.g. type error in a predicate, which is thrown only if there are nodes to apply it to
        vi.spyOn(document, 'evaluate').mockImplementation(() => {
            throw new TypeError('Type conversion failed');
        });

        expect(getXpathElements('//button[count(1)]', document.documentElement)).toStrictEqual([]);
    });

    test('returns selected elements in document order', () => {
        document.body.innerHTML = `
            <div id="panel">
                <button id="first">Accept</button>
                <button id="second">Accept, all</button>
                <button id="third">Reject</button>
            </div>
        `;

        const elements = getXpathElements('//button[contains(text(), "Accept")]', document.documentElement);

        expect(elements.map((el) => el.id)).toStrictEqual(['first', 'second']);
    });

    test('evaluates relative expression against the context element', () => {
        document.body.innerHTML = `
            <div id="panel"><button id="inside"></button></div>
            <button id="outside"></button>
        `;
        const panel = document.getElementById('panel');

        const elements = getXpathElements('.//button', panel);

        expect(elements.map((el) => el.id)).toStrictEqual(['inside']);
    });

    test('skips nodes which are not elements', () => {
        document.body.innerHTML = '<button id="button" title="title">text</button>';

        expect(getXpathElements('//button/text()', document.documentElement)).toStrictEqual([]);
        expect(getXpathElements('//button/@title', document.documentElement)).toStrictEqual([]);
    });

    test('evaluates expression against top-level elements of shadow root', () => {
        document.body.innerHTML = '<div id="host"></div><button id="light"></button>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
            <button id="top-level"></button>
            <div><button id="nested"></button></div>
        `;

        expect(getXpathElements('.//button', shadowRoot).map((el) => el.id)).toStrictEqual(['nested']);
        expect(getXpathElements('descendant-or-self::button', shadowRoot).map((el) => el.id))
            .toStrictEqual(['top-level', 'nested']);
    });

    test('does not return duplicates selected from different top-level elements of shadow root', () => {
        document.body.innerHTML = '<div id="host"></div>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<div id="first"></div><div id="second"></div><div id="third"></div>';

        const elements = getXpathElements('following-sibling::div', shadowRoot);

        expect(elements.map((el) => el.id)).toStrictEqual(['second', 'third']);
    });
});
