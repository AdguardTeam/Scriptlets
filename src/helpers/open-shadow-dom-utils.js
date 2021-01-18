import { flatten } from './array-utils';

/**
 * Finds shadow-dom host (elements with shadowRoot property) in DOM of rootElement.
 * @param {HTMLElement} rootElement
 * @returns {HTMLElement[]} shadow-dom hosts
 */
export const findHostElements = (rootElement) => {
    const hosts = [];
    // Element.querySelectorAll() returns list of elements
    // which are defined in DOM of Element.
    // Meanwhile, inner DOM of the element with shadowRoot property
    // is absolutely another DOM and which can not be reached by querySelectorAll('*')
    const domElems = rootElement.querySelectorAll('*');
    domElems.forEach((el) => {
        if (el.shadowRoot) {
            hosts.push(el);
        }
    });
    return hosts;
};

/**
 * A collection of nodes.
 *
 * @external NodeList
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeList NodeList}
 */

/**
 * @typedef {Object} PierceData
 * @property {HTMLElement[]} targets found elements that match the specified selector
 * @property {HTMLElement[]} innerHosts inner shadow-dom hosts
 */

/**
 * Pierces open shadow-dom in order to find:
 * - elements by 'selector' matching
 * - inner shadow-dom hosts
 * @param {string} selector
 * @param {HTMLElement[]|external:NodeList} hostElements
 * @returns {PierceData}
 */
export const pierceShadowDom = (selector, hostElements) => {
    let targets = [];
    const innerHostsAcc = [];

    // it's possible to get a few hostElements found by baseSelector on the page
    hostElements.forEach((host) => {
        // check presence of selector element inside base element if it's not in shadow-dom
        const simpleElems = host.querySelectorAll(selector);
        targets = targets.concat(Array.from(simpleElems));

        const shadowRootElem = host.shadowRoot;
        const shadowChildren = shadowRootElem.querySelectorAll(selector);
        targets = targets.concat(Array.from(shadowChildren));

        // find inner shadow-dom hosts inside processing shadow-dom
        innerHostsAcc.push(findHostElements(shadowRootElem));
    });

    // if there were more than one host element,
    // innerHostsAcc is an array of arrays and should be flatten
    const innerHosts = flatten(innerHostsAcc);
    return { targets, innerHosts };
};
