import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { doesElementContainText, findBaseHostElements } from '../../src/helpers';

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
