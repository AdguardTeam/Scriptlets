import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { isValidXpath, getXpathExpression, getFirstXpathElement } from '../../src/helpers';

describe('isValidXpath', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test.each([
        '//button',
        './/div[@id="panel"]/button',
        '//button[contains(text(), "Accept")]',
        '//a | //button',
        '(//button)[1]',
        'self::button',
        // type error in a predicate of a step which cannot select an element is not detected
        '//button[count(1)]',
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
        // type error in a predicate of a step which may select any element
        'descendant-or-self::*[count(1)]',
        'self::*[count(1)]',
        '//*[count(1)]',
    ])('invalid expression: "%s"', (expression) => {
        expect(isValidXpath(expression)).toBe(false);
    });

    test('does not query the page DOM', () => {
        // `id()` may be resolved against the page document of the context node
        document.body.innerHTML = '<div id="main"><button></button></div>';
        const evaluateSpy = vi.spyOn(Document.prototype, 'evaluate');

        expect(isValidXpath('id("main")//button')).toBe(true);

        expect(evaluateSpy).toHaveBeenCalledTimes(1);
        const contextNode = evaluateSpy.mock.calls[0][1];
        expect(contextNode.ownerDocument || contextNode).not.toBe(document);
        expect(evaluateSpy.mock.instances[0]).not.toBe(document);
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

describe('getFirstXpathElement', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    const getId = (element) => {
        return element ? element.id : null;
    };

    test('selects nothing if evaluation fails', () => {
        document.body.innerHTML = '<button id="button"></button>';
        // e.g. type error in a predicate, which is thrown only if there are nodes to apply it to
        vi.spyOn(document, 'evaluate').mockImplementation(() => {
            throw new TypeError('Type conversion failed');
        });

        expect(getFirstXpathElement('//button[count(1)]', document.documentElement)).toBeNull();
    });

    // Buttons of a consent dialog, the first one has extra whitespaces
    const CONSENT_BUTTONS = `
        <button id="accept">  Accept
            all </button>
        <div>
            <button id="reject">Reject cookies</button>
            <button id="save">Save</button>
            <button id="dismiss">Dismiss</button>
        </div>
    `;

    test.each([
        { expression: '//button[normalize-space()="Accept all"]', expected: 'accept' },
        { expression: '//button[normalize-space(text())="Accept all"]', expected: 'accept' },
        { expression: '//button[contains(text(), "Reject")]', expected: 'reject' },
        { expression: '//button[text()="Save"]', expected: 'save' },
        { expression: '//button[.="Dismiss"]', expected: 'dismiss' },
        { expression: '//button[starts-with(@id, "re") or starts-with(., "Dis")]', expected: 'reject' },
        { expression: '//button[starts-with(@id, "s") and contains(., "Save")]', expected: 'save' },
        { expression: '//button[not(contains(., "e"))]', expected: 'dismiss' },
        { expression: '//button[contains(., "Accept") and contains(., "Reject")]', expected: null },
    ])('functions and logical operators: $expression', ({ expression, expected }) => {
        document.body.innerHTML = CONSENT_BUTTONS;

        expect(getId(getFirstXpathElement(expression, document.documentElement))).toBe(expected);
    });

    test.each([
        { expression: 'descendant-or-self::button[normalize-space()="Accept all"]', expected: 'accept' },
        { expression: 'descendant-or-self::button[contains(., "Reject") or text()="Save"]', expected: 'reject' },
        {
            expression: 'descendant-or-self::button[starts-with(@id, "dis") and normalize-space(.)="Dismiss"]',
            expected: 'dismiss',
        },
        // `.//` skips top-level elements of the shadow root
        { expression: './/button[starts-with(normalize-space(), "Accept")]', expected: null },
    ])('functions and logical operators inside shadow root: $expression', ({ expression, expected }) => {
        document.body.innerHTML = '<div id="host"></div>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        // `accept` button is a top-level element of the shadow root, others are nested
        shadowRoot.innerHTML = CONSENT_BUTTONS;

        expect(getId(getFirstXpathElement(expression, shadowRoot))).toBe(expected);
    });

    test('returns the first suitable element in document order', () => {
        document.body.innerHTML = `
            <div id="panel">
                <button id="first">Accept</button>
                <button id="second">Accept, all</button>
                <button id="third">Reject</button>
            </div>
        `;
        const expression = '//button[contains(text(), "Accept")]';
        const checked = [];
        const hasComma = (element) => {
            checked.push(element.id);
            return element.textContent.includes(',');
        };

        expect(getId(getFirstXpathElement(expression, document.documentElement))).toBe('first');
        expect(getId(getFirstXpathElement(expression, document.documentElement, hasComma))).toBe('second');
        // Elements after the suitable one are not checked
        expect(checked).toStrictEqual(['first', 'second']);
        expect(getFirstXpathElement(expression, document.documentElement, () => false)).toBeNull();
    });

    test('evaluates relative expression against the context element', () => {
        document.body.innerHTML = `
            <div id="panel"><button id="inside"></button></div>
            <button id="outside"></button>
        `;
        const panel = document.getElementById('panel');

        expect(getId(getFirstXpathElement('.//button', panel))).toBe('inside');
    });

    test('skips nodes which are not elements', () => {
        document.body.innerHTML = '<span>text</span><button id="button" title="title">text</button>';

        expect(getFirstXpathElement('//button/text()', document.documentElement)).toBeNull();
        expect(getFirstXpathElement('//button/@title', document.documentElement)).toBeNull();
        // Text node of the span is selected first
        expect(getId(getFirstXpathElement('//span/text() | //button', document.documentElement))).toBe('button');
    });

    test('evaluates expression against top-level elements of shadow root', () => {
        document.body.innerHTML = '<div id="host"></div><button id="light"></button>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
            <button id="top-level"></button>
            <div><button id="nested"></button></div>
        `;

        expect(getId(getFirstXpathElement('.//button', shadowRoot))).toBe('nested');
        expect(getId(getFirstXpathElement('descendant-or-self::button', shadowRoot))).toBe('top-level');
        // Selected from the next top-level element, if the one selected before is not suitable
        const isNotTopLevel = (element) => {
            return element.id !== 'top-level';
        };
        expect(getId(getFirstXpathElement('descendant-or-self::button', shadowRoot, isNotTopLevel))).toBe('nested');
    });

    test('skips elements outside of shadow tree', () => {
        document.body.innerHTML = '<div id="host"></div><button id="light"></button>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<div><button id="nested"></button></div>';

        // Absolute path is evaluated against the document by Chromium before 146 and jsdom,
        // otherwise against the shadow root
        const id = getId(getFirstXpathElement('//button', shadowRoot));

        expect(id === null || id === 'nested').toBe(true);
    });

    test('does not evaluate the expression against top-level elements after a suitable element', () => {
        document.body.innerHTML = '<div id="host"></div>';
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<div id="first"></div><div id="second"></div><div id="third"></div>';
        const evaluateSpy = vi.spyOn(document, 'evaluate');

        expect(getId(getFirstXpathElement('self::div', shadowRoot))).toBe('first');
        expect(evaluateSpy).toHaveBeenCalledTimes(1);

        evaluateSpy.mockClear();
        const isThird = (element) => {
            return element.id === 'third';
        };
        expect(getId(getFirstXpathElement('self::div', shadowRoot, isThird))).toBe('third');
        expect(evaluateSpy).toHaveBeenCalledTimes(3);
    });
});
