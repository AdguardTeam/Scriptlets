import { flatten } from './array-utils';
import { getXpathElements, getXpathExpression, splitSelectors } from './xpath-utils';

/**
 * Finds shadow-dom host (elements with shadowRoot property) in DOM of rootElement.
 *
 * @param rootElement shadow dom root
 * @returns shadow-dom hosts
 */
export const findHostElements = (rootElement: Element | ShadowRoot | null): HTMLElement[] => {
    const hosts: HTMLElement[] = [];
    if (rootElement) {
        // Element.querySelectorAll() returns list of elements
        // which are defined in DOM of Element.
        // Meanwhile, inner DOM of the element with shadowRoot property
        // is absolutely another DOM and which can not be reached by querySelectorAll('*')
        const domElems = rootElement.querySelectorAll('*');
        domElems.forEach((el) => {
            if (el.shadowRoot) {
                hosts.push(el as HTMLElement);
            }
        });
    }
    return hosts;
};

/**
 * A collection of nodes.
 *
 * @external NodeList
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeList NodeList}
 */

export interface PierceData {
    targets: HTMLElement[];
    innerHosts: HTMLElement[];
}

/**
 * Pierces open shadow-dom in order to find:
 * - elements by 'selector' matching
 * - inner shadow-dom hosts
 *
 * @param selector DOM elements selector
 * @param hostElements shadow-dom hosts
 * @returns object with found elements and shadow-dom hosts
 */
export const pierceShadowDom = (
    selector: string,
    hostElements: Element[] | NodeListOf<any>,
): PierceData => {
    let targets: HTMLElement[] = [];
    const innerHostsAcc: Array<HTMLElement | HTMLElement[]> = [];

    // it's possible to get a few hostElements found by baseSelector on the page
    hostElements.forEach((host) => {
        // check presence of selector element inside base element if it's not in shadow-dom
        const simpleElems = host.querySelectorAll(selector);
        targets = targets.concat([].slice.call(simpleElems));

        const shadowRootElem = host.shadowRoot;
        const shadowChildren = shadowRootElem.querySelectorAll(selector);
        targets = targets.concat([].slice.call(shadowChildren));

        // find inner shadow-dom hosts inside processing shadow-dom
        innerHostsAcc.push(findHostElements(shadowRootElem));
    });

    // if there were more than one host element,
    // innerHostsAcc is an array of arrays and should be flatten
    const innerHosts = flatten<HTMLElement>(innerHostsAcc);
    return { targets, innerHosts };
};

/**
 * Checks if an element contains the specified text.
 *
 * @param element - The element to check.
 * @param matchRegexp - The text to match.
 * @returns True if the element contains the specified text, otherwise false.
 */
export function doesElementContainText(
    element: Element,
    matchRegexp: RegExp,
): boolean {
    const { textContent } = element;
    if (!textContent) {
        return false;
    }
    // Regexp with `g` or `y` flag starts the search from the end of its previous match,
    // so each check would depend on the previous one
    matchRegexp.lastIndex = 0;
    return matchRegexp.test(textContent);
}

/**
 * Finds an element within the given root element that matches the specified element
 * and contains text matching the provided regular expression.
 *
 * @param rootElement - The root element or shadow root to search within.
 * @param selector - The element to find.
 * @param matchRegexp - The regular expression to match the text content of the elements.
 * @returns The first element that matches the criteria, or null if no such element is found.
 */
export function findElementWithText(
    rootElement: Element | ShadowRoot,
    selector: string,
    matchRegexp: RegExp,
): Element | null {
    const elements = rootElement.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i += 1) {
        if (doesElementContainText(elements[i], matchRegexp)) {
            return elements[i];
        }
    }
    return null;
}

/**
 * Retrieves the first Element that matches the selector, with the ability
 * to select elements from inside open shadow-dom.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * Supports `>>>` combinator to split the selector into shadow host selector,
 * to find the element containing shadow root, and shadow root selector, to find the element inside shadow dom.
 * Each part of the selector may be an XPath expression wrapped in `xpath(...)`,
 * see `getXpathElements()` for the evaluation of XPath inside shadow dom.
 * @param context The Element or ShadowRoot which is the context for the query.
 * @param textContent The text content to match.
 * @param shadowRootsMap Closed shadow roots by their host elements.
 * @returns The first Element within the document that matches the specified selector, or null if no matches are found.
 */
export function queryShadowSelector(
    selector: string,
    context: Element | ShadowRoot = document.documentElement,
    textContent: RegExp | null = null,
    shadowRootsMap?: WeakMap<Element, ShadowRoot>,
): Element | null {
    const SHADOW_COMBINATOR = ' >>> ';

    const queryElement = (
        partSelector: string,
        root: Element | ShadowRoot,
        matchRegexp: RegExp | null,
    ): Element | null => {
        const xpath = getXpathExpression(partSelector);
        if (xpath === null) {
            return matchRegexp
                ? findElementWithText(root, partSelector, matchRegexp)
                : root.querySelector(partSelector);
        }

        const elements = getXpathElements(xpath, root);
        const element = matchRegexp
            ? elements.find((el) => doesElementContainText(el, matchRegexp))
            : elements[0];
        return element || null;
    };

    const parts = splitSelectors(selector, SHADOW_COMBINATOR);
    let root = context;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const host = queryElement(parts[i], root, null);
        if (!host) {
            return null;
        }

        // Use native shadowRoot first; fall back to WeakMap for closed shadow DOMs
        const shadowRoot = host.shadowRoot || shadowRootsMap?.get(host);
        if (!shadowRoot) {
            return null;
        }
        root = shadowRoot;
    }

    return queryElement(parts[parts.length - 1], root, textContent);
}
