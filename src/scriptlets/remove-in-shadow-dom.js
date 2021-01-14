import {
    hit,
    observeDOMChanges,
    flatten,
    findHostElements,
    pierceShadowDom,
} from '../helpers';

/**
 * @scriptlet remove-in-shadow-dom
 *
 * @description
 * Removes elements inside open shadow DOM elements.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('remove-in-shadow-dom', selector[, baseSelector])
 * ```
 *
 * - `selector` — required, CSS selector of element in shadow-dom to remove
 * - `baseSelector` — optional, selector of specific page DOM element,
 * narrows down the part of the page DOM where shadow-dom host supposed to be,
 * defaults to document.documentElement
 *
 * > `baseSelector` should match element of the page DOM, but not of shadow DOM
 *
 * **Examples**
 * ```
 * ! removes menu bar
 * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')
 *
 * ! removes floating element
 * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'vt-ui-contact-fab')
 * ```
 */
export function removeInShadowDom(source, selector, baseSelector) {
    // do nothing if browser does not support ShadowRoot
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow) {
        return;
    }

    const removeElement = (targetElement) => {
        targetElement.remove();
    };

    /**
     * Handles shadow-dom piercing and removing of found elements
     */
    const removeHandler = () => {
        // start value of shadow-dom hosts for the page dom
        let hostElements = !baseSelector ? findHostElements(document.documentElement)
            : document.querySelectorAll(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
            let isRemoved = false;
            const { targets, innerHosts } = pierceShadowDom(selector, hostElements);

            targets.forEach((targetEl) => {
                removeElement(targetEl);
                isRemoved = true;
            });

            if (isRemoved) {
                hit(source);
            }

            // continue to pierce for inner shadow-dom hosts
            // and search inside them while the next iteration
            hostElements = innerHosts;
        }
    };

    removeHandler();

    observeDOMChanges(removeHandler, true);
}

removeInShadowDom.names = [
    'remove-in-shadow-dom',
];

removeInShadowDom.injections = [
    hit,
    observeDOMChanges,
    flatten,
    findHostElements,
    pierceShadowDom,
];
