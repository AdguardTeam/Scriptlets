import { hit, observeDOMChanges, flatten } from '../helpers';

/**
 * @scriptlet hide-in-shadow-dom
 *
 * @description
 * Hides elements inside open shadow DOM elements.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('hide-in-shadow-dom', selector[, baseSelector])
 * ```
 *
 * - `selector` — required, CSS selector of element in shadow-dom to hide
 * - `baseSelector` — optional, selector of specific page DOM element,
 * narrows down the part of the page DOM where shadow-dom host supposed to be,
 * defaults to document.documentElement
 *
 * > `baseSelector` should match element of the page DOM, but not of shadow DOM
 *
 * **Examples**
 * ```
 * ! hides menu bar
 * virustotal.com#%#//scriptlet('hide-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')
 *
 * ! hides floating element
 * virustotal.com#%#//scriptlet('hide-in-shadow-dom', 'vt-ui-contact-fab')
 * ```
 */
export function hideInShadowDom(source, selector, baseSelector) {
    // do nothing if browser does not support ShadowRoot
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow) {
        return;
    }

    /**
     * Finds shadow-dom host (elements with shadowRoot property) in DOM of rootElement.
     * @param {HTMLElement} rootElement
     * @returns {nodeList[]} shadow-dom hosts
     */
    const findHostElements = (rootElement) => {
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
     * @typedef {Object} PierceData
     * @property {Array} targets found elements
     * @property {Array} innerHosts inner shadow-dom hosts
     */

    /**
     * Pierces open shadow-dom in order to find:
     * - elements by 'selector' matching
     * - inner shadow-dom hosts
     * @param {string} selector
     * @param {nodeList[]} hostElements
     * @returns {PierceData}
     */
    const pierceShadowDom = (selector, hostElements) => {
        const targets = [];
        const innerHostsAcc = [];

        const collectTargets = (arr) => {
            if (arr.length !== 0) {
                arr.forEach((el) => targets.push(el));
            }
        };

        // it's possible to get a few hostElements found by baseSelector on the page
        hostElements.forEach((host) => {
            // check presence of selector element inside base element if it's not in shadow-dom
            const simpleElems = host.querySelectorAll(selector);
            collectTargets(simpleElems);

            const shadowRootElem = host.shadowRoot;
            const shadowChildren = shadowRootElem.querySelectorAll(selector);
            collectTargets(shadowChildren);

            // find inner shadow-dom hosts inside processing shadow-dom
            innerHostsAcc.push(findHostElements(shadowRootElem));
        });

        // if there were more than one host element,
        // innerHostsAcc is an array of arrays and should be flatten
        const innerHosts = flatten(innerHostsAcc);
        return { targets, innerHosts };
    };

    /**
     * Handles shadow-dom piercing and hiding of found elements
     */
    const hideHandler = () => {
        // start value of shadow-dom hosts for the page dom
        let hostElements = !baseSelector ? findHostElements(document.documentElement)
            : document.querySelectorAll(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
            let hidden = false;
            const DISPLAY_NONE_CSS = 'display:none!important;';

            const { targets, innerHosts } = pierceShadowDom(selector, hostElements);

            targets.forEach((targetEl) => {
                targetEl.style.cssText = DISPLAY_NONE_CSS;
                hidden = true;
            });

            if (hidden) {
                hit(source);
            }

            // continue to pierce for inner shadow-dom hosts
            // and search inside them while the next iteration
            hostElements = innerHosts;
        }
    };

    hideHandler();

    observeDOMChanges(hideHandler, true);
}

hideInShadowDom.names = [
    'hide-in-shadow-dom',
];

hideInShadowDom.injections = [hit, observeDOMChanges, flatten];
