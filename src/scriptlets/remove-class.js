import { hit } from '../helpers';

/**
 * @scriptlet remove-class
 *
 * @description
 * Removes class from DOM nodes. Will run only once after page load.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("remove-attr", classes[, selector])
 * ```
 *
 * - `classes` - required, class or list of classes separated by '|';
 * if there is no selector is following this parameter, each class becomes a selector in rotation
 * - `selector` - optional, CSS selector, specifies nodes from which classes will be removed
 *
 * **Examples**
 * 1.  Removes by classes
 *     ```
 *     example.org#%#//scriptlet("remove-class", "example|test")
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <div class="nice example test">Some text</div>
 *
 *     <!-- after -->
 *     <div class="nice">Some text</div>
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
export function removeClass(source, classNames, selector) {
    if (!classNames) { return; }
    classNames = classNames.split(/\s*\|\s*/);
    let selectors = [];
    if (!selector) {
        selectors = classNames.map((className) => {
            return `.${className}`;
        });
    }

    const removeClassHandler = (ev) => {
        if (ev) {
            window.removeEventListener(ev.type, removeClassHandler, true);
        }

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

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', removeClassHandler, true);
    } else {
        removeClassHandler();
    }
}

removeClass.names = [
    'remove-class',
];

removeClass.injections = [hit];
