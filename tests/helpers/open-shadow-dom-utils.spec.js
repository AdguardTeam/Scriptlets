import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { doesElementContainText, findBaseHostElements, isValidShadowSelector } from '../../src/helpers';

describe('isValidShadowSelector', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test.each([
        'div > button',
        'button:not(.reject)',
        '#host >>> div > button',
        'xpath(//div[@id="host"])',
        // absolute path is allowed before shadow combinator
        'xpath(//div[@id="host"]) >>> xpath(descendant-or-self::button)',
        '#host >>> xpath(.//button[contains(text(), "Accept, all")]) >>> span',
        'xpath(//div[starts-with(@id, "host")]) >>> xpath(descendant-or-self::button[normalize-space()="Accept all"])',
        '#host >>> xpath(descendant-or-self::button[starts-with(@id, "accept") or text()="OK"])',
    ])('valid: %s', (selector) => {
        expect(isValidShadowSelector(selector)).toBe(true);
    });

    test.each([
        '',
        '..class',
        '#host >>> ..class',
        // empty part between combinators
        '#host >>>  >>> button',
        'xpath(//button[)',
        'xpath(count(//button))',
        'xpath(//button',
        // misspelled XPath is an invalid CSS selector
        'xpath (//button)',
        'div xpath(//button)',
        // absolute path inside shadow DOM
        '#host >>> xpath(//button)',
        '#host >>> xpath(.//a | //button)',
        '#host >>> xpath(descendant-or-self::button[contains(., "Accept") and normalize-space(//title)="Consent"])',
    ])('invalid: "%s"', (selector) => {
        expect(isValidShadowSelector(selector)).toBe(false);
    });

    test('does not query the page DOM', () => {
        document.body.innerHTML = '<div id="host"><button></button></div>';
        const querySelectorSpy = vi.spyOn(document, 'querySelector');
        const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');
        // XPath may be evaluated by any document, so the context node should not be a page one
        const evaluateSpy = vi.spyOn(Document.prototype, 'evaluate');

        isValidShadowSelector('#host >>> xpath(descendant-or-self::button)');

        expect(querySelectorSpy).not.toHaveBeenCalled();
        expect(querySelectorAllSpy).not.toHaveBeenCalled();
        expect(evaluateSpy).toHaveBeenCalled();
        evaluateSpy.mock.calls.forEach((args) => {
            const contextNode = args[1];
            expect(contextNode.ownerDocument || contextNode).not.toBe(document);
        });
    });
});

describe('doesElementContainText', () => {
    test.each([
        { name: 'g flag', matchRegexp: /Reject/g },
        { name: 'y flag', matchRegexp: /Reject/y },
    ])('regexp with $name matches the same text each time', ({ matchRegexp }) => {
        const element = document.createElement('button');
        element.textContent = 'Reject';

        expect(doesElementContainText(element, matchRegexp)).toBe(true);
        expect(doesElementContainText(element, matchRegexp)).toBe(true);
    });

    test('regexp with g flag matches shorter text after longer one', () => {
        const matchRegexp = /Reject/g;
        const longer = document.createElement('button');
        longer.textContent = 'Reject Reject';
        const shorter = document.createElement('button');
        shorter.textContent = 'Reject';

        expect(doesElementContainText(longer, matchRegexp)).toBe(true);
        expect(doesElementContainText(longer, matchRegexp)).toBe(true);
        expect(doesElementContainText(shorter, matchRegexp)).toBe(true);
    });

    test('element without text does not match', () => {
        expect(doesElementContainText(document.createElement('button'), /.*/)).toBe(false);
    });
});

let hostCount = 0;

/**
 * Creates a shadow-dom host with a unique id and appends it to the parent.
 *
 * @param {Element} parent parent element
 * @returns {HTMLElement} created host
 */
const createHost = (parent) => {
    hostCount += 1;
    const host = document.createElement('div');
    host.id = `ag-test-host-${hostCount}`;
    host.attachShadow({ mode: 'open' });
    parent.appendChild(host);
    return host;
};

/**
 * Creates a container element with a class and appends it to the parent.
 *
 * @param {Element} parent parent element
 * @returns {HTMLElement} created container
 */
const createContainer = (parent) => {
    const container = document.createElement('div');
    container.classList.add('ag-test-base');
    parent.appendChild(container);
    return container;
};

/**
 * Returns ids of given elements, since elements are compared by `isEqualNode()` in `toEqual()`,
 * so empty hosts would be equal to each other.
 *
 * @param {Element[]} elems elements
 * @returns {string[]} ids of elements
 */
const getIds = (elems) => elems.map((elem) => elem.id);

describe('findBaseHostElements', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    test('finds all hosts in the document if base selector is not specified', () => {
        const container = createContainer(document.body);
        const bodyHost = createHost(document.body);
        const containerHost = createHost(container);

        // hosts are in document order
        expect(getIds(findBaseHostElements())).toEqual(getIds([containerHost, bodyHost]));
    });

    test('keeps base element which is a host', () => {
        const host = createHost(document.body);
        host.classList.add('ag-test-base');
        createHost(document.body);

        expect(getIds(findBaseHostElements('.ag-test-base'))).toEqual(getIds([host]));
    });

    test('replaces base element which is not a host by hosts inside it', () => {
        const container = createContainer(document.body);
        const wrapper = document.createElement('div');
        container.appendChild(wrapper);
        // host is not a direct child of the container
        const nestedHost = createHost(wrapper);
        const childHost = createHost(container);
        // host outside the base element
        createHost(document.body);

        // hosts are in document order
        expect(getIds(findBaseHostElements('.ag-test-base'))).toEqual(getIds([nestedHost, childHost]));
    });

    test('searches nested containers once and returns each host once', () => {
        const outer = createContainer(document.body);
        const inner = createContainer(outer);
        const host = createHost(inner);
        // host is matched by base selector as well
        host.classList.add('ag-test-base');

        const querySelectorAllSpy = vi.spyOn(Element.prototype, 'querySelectorAll');

        expect(getIds(findBaseHostElements('.ag-test-base'))).toEqual(getIds([host]));
        const containerSearches = querySelectorAllSpy.mock.calls.filter((args) => args[0] === '*');
        expect(containerSearches).toHaveLength(1);
    });

    test('searches sibling container after a nested one', () => {
        const outer = createContainer(document.body);
        const inner = createContainer(outer);
        const innerHost = createHost(inner);
        const sibling = createContainer(document.body);
        const siblingHost = createHost(sibling);

        const querySelectorAllSpy = vi.spyOn(Element.prototype, 'querySelectorAll');

        expect(getIds(findBaseHostElements('.ag-test-base'))).toEqual(getIds([innerHost, siblingHost]));
        // outer and sibling containers are searched, nested one is skipped
        const containerSearches = querySelectorAllSpy.mock.calls.filter((args) => args[0] === '*');
        expect(containerSearches).toHaveLength(2);
    });

    test('searches container inside the light DOM of a matched host', () => {
        const host = createHost(document.body);
        host.classList.add('ag-test-base');
        // matched host is not a searched container, so the container inside it is not skipped
        const container = createContainer(host);
        const innerHost = createHost(container);

        expect(getIds(findBaseHostElements('.ag-test-base'))).toEqual(getIds([host, innerHost]));
    });
});
