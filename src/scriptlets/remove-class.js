import { hit, observeDOMChanges } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet remove-class
 *
 * @description
 * Removes the specified classes from DOM nodes. This scriptlet runs NOT only once after the page load (DOMContentLoaded)
 * but periodically after detecting DOM tree changes.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-class", classes[, selector])
 * ```
 *
 * - `classes` — required, class or list of classes separated by '|';
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed;
 * if there is no selector, every class independently will be removed from all nodes which has one
 *
 * **Examples**
 * 1.  Removes by classes
 *     ```
 *     example.org#%#//scriptlet("remove-class", "example|test")
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <div id="first" class="nice test">Some text</div>
 *     <div id="second" class="rare example for test">Some text</div>
 *     <div id="third" class="testing better example">Some text</div>
 *
 *     <!-- after -->
 *     <div id="first" class="nice">Some text</div>
 *     <div id="second" class="rare for">Some text</div>
 *     <div id="third" class="testing better">Some text</div>
 *     ```
 *
 * 2. Removes with specified selector
 *     ```
 *     example.org#%#//scriptlet("remove-class", "branding", ".inner")
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div class="wrapper true branding">
 *         <div class="inner bad branding">Some text</div>
 *     </div>
 *
 *     <!-- after -->
 *     <div class="wrapper true branding">
 *         <div class="inner bad">Some text</div>
 *     </div>
 *     ```
 */
/* eslint-enable max-len */

export function removeClass(source, classNames, selector) {
    if (!classNames) { return; }
    classNames = classNames.split(/\s*\|\s*/);
    let selectors = [];
    if (!selector) {
        selectors = classNames.map((className) => {
            return `.${className}`;
        });
    }

    const removeClassHandler = () => {
        const nodes = new Set();
        if (selector) {
            const foundedNodes = [].slice.call(document.querySelectorAll(selector));
            foundedNodes.forEach((n) => nodes.add(n));
        } else if (selectors.length > 0) {
            selectors.forEach((s) => {
                const elements = document.querySelectorAll(s);
                for (let i = 0; i < elements.length; i += 1) {
                    const element = elements[i];
                    nodes.add(element);
                }
            });
        }

        let removed = false;

        nodes.forEach((node) => {
            classNames.forEach((className) => {
                if (node.classList.contains(className)) {
                    node.classList.remove(className);
                    removed = true;
                }
            });
        });

        if (removed) {
            hit(source);
        }
    };

    const CLASS_ATTR_NAME = ['class'];

    // 'true' for observing attributes
    observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
}

removeClass.names = [
    'remove-class',
];

removeClass.injections = [hit, observeDOMChanges];
