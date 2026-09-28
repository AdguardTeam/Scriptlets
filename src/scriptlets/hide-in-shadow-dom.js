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
 *   defaults to document.documentElement.
 *   It may match a shadow-dom host itself or an element containing shadow-dom hosts, e.g. `#app`.
 *   In both cases elements are searched only in the hosts, i.e. in their shadow DOM and their own subtree,
 *   so elements of the container outside of the hosts are not hidden.
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

    const hideElement = (targetElement) => {
        const DISPLAY_NONE_CSS = 'display:none!important;';
        targetElement.style.cssText = DISPLAY_NONE_CSS;
    };

    const isElementHidden = (targetElement) => {
        const { style } = targetElement;
        // Inline 'all' declaration may override the hiding one, e.g. 'all: initial !important',
        // while inline display is still reported as hidden; other inline declarations do not affect hiding,
        // so they are not checked, otherwise they would be wiped by re-hiding on each DOM change.
        // Computed style is not checked, because page style of higher priority may keep the element visible,
        // e.g. '::slotted(*) { display: block !important; }', so it would be re-hidden on each DOM change
        // and several rules would re-trigger each other infinitely
        return style.getPropertyValue('display') === 'none'
            && style.getPropertyPriority('display') === 'important'
            && style.getPropertyValue('all') === '';
    };

    /**
     * Handles shadow-dom piercing and hiding of found elements
     */
    const hideHandler = () => {
        // start value of shadow-dom hosts for the page dom
        let hostElements = findBaseHostElements(baseSelector);

        // if there is shadow-dom host, they should be explored
        while (hostElements.length !== 0) {
            let isHidden = false;
            const { targets, innerHosts } = pierceShadowDom(selector, hostElements);

            targets.forEach((targetEl) => {
                // Do not re-hide already hidden element, because even such mutation wakes up observers
                // of other rules, and they may re-trigger each other infinitely,
                // and hit should be called only on actual change
                if (isElementHidden(targetEl)) {
                    return;
                }
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

export const hideInShadowDomNames = [
    'hide-in-shadow-dom',
];

// eslint-disable-next-line prefer-destructuring
hideInShadowDom.primaryName = hideInShadowDomNames[0];

hideInShadowDom.injections = [
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
