import {
    hit,
    observeDOMChanges,
    nativeIsNaN,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-attr
 * @description
 * Sets the specified attribute on the specified elements. This scriptlet runs once when the page loads
 * and after that and after that on DOM tree changes.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-attr', selector, attr[, value])
 * ```
 *
 * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
 * - `attr` — required, attribute to be set
 * - `value` — the value to assign to the attribute, defaults to ''. Possible values:
 *     - `''` - empty string
 *     - positive decimal integer `<= 32767`
 *
 * **Examples**
 * 1.  Set attribute by selector
 *     ```
 *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', '0')
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute="0">Some text</div>
 *     ```
 * 2.  Set attribute without value
 *     ```
 *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute')
 *     ```
 *
 *     ```html
 *     <!-- before  -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute>Some text</div>
 *     ```
 */
/* eslint-enable max-len */
export function setAttr(source, selector, attr, value = '') {
    if (!selector || !attr) {
        return;
    }
    // Drop strings that cant be parsed into number, negative numbers and numbers below 32767
    if (value.length !== 0
        && (nativeIsNaN(parseInt(value, 10))
            || parseInt(value, 10) < 0
            || parseInt(value, 10) > 32767)) {
        return;
    }

    const setAttr = () => {
        const nodes = [].slice.call(document.querySelectorAll(selector));
        let set = false;
        nodes.forEach((node) => {
            node.setAttribute(attr, value);
            set = true;
        });
        if (set) {
            hit(source);
        }
    };

    setAttr();
    observeDOMChanges(setAttr, true);
}

setAttr.names = [
    'set-attr',
];

setAttr.injections = [
    hit,
    observeDOMChanges,
    nativeIsNaN,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
];
