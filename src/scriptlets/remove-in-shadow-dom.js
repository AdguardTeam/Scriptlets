import {
    hit,
    logMessage,
    isValidSelector,
    observeDOMChanges,
    findHostElements,
    findBaseHostElements,
    pierceShadowDom,
    flatten,
    throttle,
} from '../helpers';

/**
 * @scriptlet remove-in-shadow-dom
 *
 * @description
 * Removes elements inside open shadow DOM elements.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-in-shadow-dom', selector[, baseSelector])
 * ```
 *
 * - `selector` — required, CSS selector of element in shadow-dom to remove
 * - `baseSelector` — optional, selector of specific page DOM element,
 *   narrows down the part of the page DOM where shadow-dom host supposed to be,
 *   defaults to document.documentElement.
 *   It may match a shadow-dom host itself or an element containing shadow-dom hosts, e.g. `#app`.
 *   In both cases elements are searched only in the hosts, i.e. in their shadow DOM and their own subtree,
 *   so elements of the container outside of the hosts are not removed.
 *
 * > `baseSelector` should match element of the page DOM, but not of shadow DOM.
 *
 * ### Examples
 *
 * ```adblock
 * ! removes menu bar
 * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'iron-pages', 'vt-virustotal-app')
 *
 * ! removes floating element
 * virustotal.com#%#//scriptlet('remove-in-shadow-dom', 'vt-ui-contact-fab')
 * ```
 *
 * @added v1.3.14.
 */
export function removeInShadowDom(source, selector, baseSelector) {
    // do nothing if browser does not support ShadowRoot
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow) {
        return;
    }

    // Selectors are validated once, otherwise an invalid one would throw an error,
    // e.g. in the observer callback, which would stop the observer
    if (!isValidSelector(selector)) {
        logMessage(source, `Invalid selector arg: '${selector}'`);
        return;
    }
    if (baseSelector && !isValidSelector(baseSelector)) {
        logMessage(source, `Invalid baseSelector arg: '${baseSelector}'`);
        return;
    }

    const removeElement = (targetElement) => {
        targetElement.remove();
    };

    /**
     * Elements whose error has been logged, so it is not logged on each DOM change.
     */
    const loggedFailedElems = new WeakSet();

    /**
     * Handles shadow-dom piercing and removing of found elements
     */
    const removeHandler = () => {
        // start value of shadow-dom hosts for the page dom
        let hostElements = findBaseHostElements(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
            let isRemoved = false;
            const { targets, innerHosts } = pierceShadowDom(selector, hostElements);

            targets.forEach((targetEl) => {
                // Error for one element, e.g. caused by the page, should not stop processing of other elements
                try {
                    removeElement(targetEl);
                    isRemoved = true;
                } catch {
                    if (!loggedFailedElems.has(targetEl)) {
                        loggedFailedElems.add(targetEl);
                        // Element is logged as is, since its string representation does not identify it
                        logMessage(source, ['Failed to remove element:', targetEl], false, false);
                    }
                }
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

export const removeInShadowDomNames = [
    'remove-in-shadow-dom',
];

// eslint-disable-next-line prefer-destructuring
removeInShadowDom.primaryName = removeInShadowDomNames[0];

removeInShadowDom.injections = [
    hit,
    logMessage,
    isValidSelector,
    observeDOMChanges,
    findHostElements,
    findBaseHostElements,
    pierceShadowDom,
    // following helpers should be imported and injected
    // because they are used by helpers above
    flatten,
    throttle,
];
