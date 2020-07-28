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
    /**
     * Finds base elements if there is no baseSelector given.
     * In that case we should find the closest to the root elements with shadowRoot property
     * and consider them as bases to pierce shadow-doms
     */
    const findBaseElements = () => {
        const bases = [];
        const rootElement = document.documentElement;
        // if some element has shadowRoot property,
        // querySelectorAll('*') will reach it
        // and will not explore its childNode 'cause it can not
        const pageElems = rootElement.querySelectorAll('*');
        pageElems.forEach((el) => {
            if (el.shadowRoot) {
                bases.push(el);
            }
        });
        return bases;
    };

    const findTargetsToHide = (selector, baseSelector) => {
        const targets = [];
        const baseElements = !baseSelector ? findBaseElements()
            : document.querySelectorAll(baseSelector);

        // it's possible to have a few baseElements found by baseSelector on the page
        baseElements.forEach((baseEl) => {
            // check presence of selector element inside base element if it's not in shadow-dom
            const simpleElems = baseEl.querySelectorAll(selector);
            simpleElems.forEach((el) => targets.push(el));

            const shadowElem = baseEl.shadowRoot;
            if (shadowElem) {
                const shadowChildren = shadowElem.querySelectorAll(selector);
                shadowChildren.forEach((el) => {
                    targets.push(el);
                });
            }
        });

        return targets;
    };

    const hideHandler = () => {
        let hidden = false;
        const DISPLAY_NONE_CSS = 'display:none!important;';
        const targets = findTargetsToHide(selector, baseSelector);
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
