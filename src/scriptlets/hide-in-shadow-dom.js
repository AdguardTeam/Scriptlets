import {
    hit,
    observeDOMChanges,
    findHostElements,
    pierceShadowDom,
    // following helpers should be imported and injected
    // because they are used by helpers above
    flatten,
    throttle,
} from '../helpers/index';

/**
 * @scriptlet hide-in-shadow-dom
 *
 * @description
 * Hides elements inside open shadow DOM elements.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('hide-in-shadow-dom', selector[, baseSelector])
 * ```
 *
 * - `selector` — required, CSS selector of element in shadow-dom to hide
 * - `baseSelector` — optional, selector of specific page DOM element,
 *   narrows down the part of the page DOM where shadow-dom host supposed to be,
 *   defaults to document.documentElement
 *
 * > `baseSelector` should match element of the page DOM, but not of shadow DOM.
 *
 * ### Examples
 *
 * ```adblock
 * ! hides menu bar
 * example.com#%#//scriptlet('hide-in-shadow-dom', '.storyAd', '#app')
 *
 * ! hides floating element
 * example.com#%#//scriptlet('hide-in-shadow-dom', '.contact-fab')
 * ```
 *
 * @added v1.3.0.
 */
export function hideInShadowDom(source, selector, baseSelector) {
    // do nothing if browser does not support ShadowRoot
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow) {
        return;
    }

    const hideElement = (targetElement) => {
        const DISPLAY_NONE_CSS = 'display:none!important;';
        targetElement.style.cssText = DISPLAY_NONE_CSS;
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
            let isHidden = false;
            const { targets, innerHosts } = pierceShadowDom(selector, hostElements);

            targets.forEach((targetEl) => {
                hideElement(targetEl);
                isHidden = true;
            });

            if (isHidden) {
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

hideInShadowDom.injections = [
    hit,
    observeDOMChanges,
    findHostElements,
    pierceShadowDom,
    // following helpers should be imported and injected
    // because they are used by helpers above
    flatten,
    throttle,
];
