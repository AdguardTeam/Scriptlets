import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet remove-attr
 *
 * @description
 * Removes the specified attributes from DOM notes. This scriptlet runs only once after the page load (DOMContentLoaded).
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-attr", attrs[, selector])
 * ```
 *
 * - `attrs` — required, attribute or list of attributes joined by '|';
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
 *
 * **Examples**
 * 1.  Removes by attribute
 *     ```
 *     example.org#%#//scriptlet("remove-attr", "example|test")
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <div example="true" test="true">Some text</div>
 *
 *     <!-- after -->
 *     <div>Some text</div>
 *     ```
 *
 * 2. Removes with specified selector
 *     ```
 *     example.org#%#//scriptlet("remove-attr", "example", ".inner")
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div class="wrapper" example="true">
 *         <div class="inner" example="true">Some text</div>
 *     </div>
 *
 *     <!-- after -->
 *     <div class="wrapper" example="true">
 *         <div class="inner">Some text</div>
 *     </div>
 *     ```
 */
/* eslint-enable max-len */
export function removeAttr(source, attrs, selector) {
    if (!attrs) { return; }
    attrs = attrs.split(/\s*\|\s*/);
    if (!selector) {
        selector = `[${attrs.join('],[')}]`;
    }

    const rmattr = (ev) => {
        if (ev) {
            window.removeEventListener(ev.type, rmattr, true);
        }

        const nodes = [].slice.call(document.querySelectorAll(selector));
        let removed = false;
        nodes.forEach((node) => {
            attrs.forEach((attr) => {
                node.removeAttribute(attr);
                removed = true;
            });
        });
        if (removed) {
            hit(source);
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', rmattr, true);
    } else {
        rmattr();
    }
}

removeAttr.names = [
    'remove-attr',
    'remove-attr.js',
    'ubo-remove-attr.js',
];

removeAttr.injections = [hit];
