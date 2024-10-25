import { flatten } from './array-utils';

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

type QueryFunc = typeof document.querySelector;

/**
 * Retrieves the first Element that matches the selector, with the ability
 * to select elements from inside open shadow-dom.
 *
 * @param selector A DOMString containing one or more selectors to match.
 * Supports `>>>` combinator to split the selector into shadow host selector,
 * to find the element containing shadow root, and shadow root selector, to find the element inside shadow dom.
 * @param context The Element or Document which is the context for the query.
 * @param context.querySelector The querySelector function to use.
 * @returns The first Element within the document that matches the specified selector, or null if no matches are found.
 */
export function queryShadowSelector(
    selector: string,
    context: { querySelector: QueryFunc } = document.documentElement,
): ReturnType<QueryFunc> {
    const SHADOW_COMBINATOR = ' >>> ';
    const pos = selector.indexOf(SHADOW_COMBINATOR);
    if (pos === -1) {
        return context.querySelector(selector);
    }

    const shadowHostSelector = selector.slice(0, pos).trim();
    const elem = context.querySelector(shadowHostSelector);
    if (!elem || !elem.shadowRoot) {
        return null;
    }

    const shadowRootSelector = selector.slice(pos + SHADOW_COMBINATOR.length).trim();
    return queryShadowSelector(shadowRootSelector, elem.shadowRoot);
}
