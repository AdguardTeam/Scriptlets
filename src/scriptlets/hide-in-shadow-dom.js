// shadow-dom in process
import { hit, observeDOMChanges } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet hide-in-shadow-dom
 *
 * @description
 *
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
 *
/* eslint-enable max-len */
export function hideInShadowDom(source, selector, baseSelector) {
    // if there is no baseSelector given,
    // we should find the closest to the root elements with shadowRoot property
    // and consider them as bases to pierce shadow-doms
    const findBaseElements = () => {
        const bases = [];
        const rootElement = document.documentElement;
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
        const baseElements = !baseSelector ? findBaseElements() : document.querySelectorAll(baseSelector);

        // it's possible to have a few baseElements found by baseSelector on the page
        baseElements.forEach((baseEl) => {
            // check presence of selector element inside base element if it's not in shadow-dom
            const simpleElems = baseEl.querySelectorAll(selector);
            simpleElems.forEach((el) => targets.push(el));

            const shadowElem = baseEl.shadowRoot;
            if (shadowElem) {
                const shadowElems = shadowElem.querySelectorAll(selector);
                shadowElems.forEach((el) => {
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
