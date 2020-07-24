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
 * example.org#%#//scriptlet('hide-in-shadow-dom', selector, rootElement)
 * ```
 *
 * - `selector` — required, CSS selector to use
 * - `rootElement` — optional, base element we're using for the given selector
 *
 * **Examples**
 *
/* eslint-enable max-len */
export function hideInShadowDom(source) {
    const selector = 'vt-ui-contact-fab';
    const rootElement = document.documentElement;

    const querySelectorShadow = (selector, rootElement) => {
        const el = rootElement.querySelector(selector);
        if (el) {
            // found the element we were looking for, exiting
            return el;
        }
        const probes = rootElement.querySelectorAll('*');
        // eslint-disable-next-line consistent-return
        probes.forEach((probe) => {
            if (probe.shadowRoot) {
                // check the shadow root (and it's nested roots)
                const shadowElement = querySelectorShadow(selector, probe.shadowRoot);
                if (shadowElement) {
                    // found the element we were looking for, exiting
                    shadowElement.style = 'display: none!important;';
                    hit(source);
                    return shadowElement;
                }
            }
        });

        // nothing found, returning empty array
        return null;
    };

    const pierceHandler = () => {
        querySelectorShadow(selector, rootElement);
    };

    pierceHandler();

    observeDOMChanges(pierceHandler, true);
}

hideInShadowDom.names = [
    'hide-in-shadow-dom',
];

hideInShadowDom.injections = [hit, observeDOMChanges];
