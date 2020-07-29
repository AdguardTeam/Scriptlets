import { hit, observeDOMChanges } from '../helpers';

/**
 * @scriptlet hide-in-shadow-dom
 *
 * @description
 * Hides elements in open shadow-dom.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('hide-in-shadow-dom', selector[, baseSelector])
 * ```
 *
 * - `selector` — required, CSS selector of element in shadow-dom to hide
 * - `baseSelector` — optional, base selector to specify selector search area,
 * defaults to document.documentElement
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
    if (!ShadowRoot) {
        return;
    }

    /**
     * Finds shadow host elements.
     * We should find the closest to the root elements with shadowRoot property
     * and consider them as bases to pierce shadow-doms
     * @param {HTMLElement} rootElement root element to start searching from
     * @returns {nodeList[]} shadow dom hosts
     */
    const findHostElements = (rootElement) => {
        const hosts = [];
        // if some element has shadowRoot property,
        // querySelectorAll('*') will reach it
        // and will not explore its childNodes 'cause it can not
        const pageElems = rootElement.querySelectorAll('*');
        pageElems.forEach((el) => {
            if (el.shadowRoot) {
                hosts.push(el);
            }
        });
        return hosts;
    };

    const findTargetsToHide = (selector, hostElements) => {
        const targets = [];

        // it's possible to get a few hostElements found by baseSelector on the page
        hostElements.forEach((host) => {
            // check presence of selector element inside base element if it's not in shadow-dom
            const simpleElems = host.querySelectorAll(selector);
            if (simpleElems.length !== 0) {
                simpleElems.forEach((el) => targets.push(el));
            }

            const shadowRootElem = host.shadowRoot;
            if (shadowRootElem) {
                const shadowChildren = shadowRootElem.querySelectorAll(selector);

                // we have found our target elements if shadowChildren is not empty
                if (shadowChildren.length !== 0) {
                    shadowChildren.forEach((el) => {
                        targets.push(el);
                    });
                } else {
                    // if there is no childNodes in shadowRootElem that satisfies given selector,
                    // shadowRootElem is reputed as root element for finding inner shadow dom hosts
                    // and selector searching continues inside them (recursively)
                    const innerShadowHosts = findHostElements(shadowRootElem);
                    const innerShadowChildren = findTargetsToHide(selector, innerShadowHosts);
                    innerShadowChildren.forEach((el) => {
                        targets.push(el);
                    });
                }
            }
        });

        return targets;
    };

    const hideHandler = () => {
        // if no baseSelector, we should find shadow host elements on the page
        const hostElements = !baseSelector ? findHostElements(document.documentElement)
            : document.querySelectorAll(baseSelector);

        let hidden = false;
        const DISPLAY_NONE_CSS = 'display:none!important;';

        const targets = findTargetsToHide(selector, hostElements);
        targets.forEach((targetEl) => {
            targetEl.style = DISPLAY_NONE_CSS;
            hidden = true;
        });

        if (hidden) {
            hit(source);
        }
    };

    hideHandler();

    observeDOMChanges(hideHandler, true);
}

hideInShadowDom.names = [
    'hide-in-shadow-dom',
];

hideInShadowDom.injections = [hit, observeDOMChanges];
