import {
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    defaultAttributeSetter,
    logMessage,
    throttle,
    hit,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-attr
 *
 * @description
 * Sets attribute with arbitrary value on the specified elements. This scriptlet runs once when the page loads
 * and after that on DOM tree changes.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-attr', selector, attr[, value])
 * ```
 *
 * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
 * - `attr` — required, attribute to be set
 * - `value` — optional, the value to assign to the attribute, defaults to ''.
 *
 * ### Examples
 *
 * 1. Set attribute by selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-attr', 'div > a.class', 'test-attribute', '[true, true]')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a>Another text</a>
 *         <a class="class">Some text</a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a>Another text</a>
 *         <a class="class" test-attribute="[true, true]">Some text</a>
 *     </div>
 *     ```
 *
 * 1. Set attribute without value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute>Some text</div>
 *     ```
 *
 * 1. Set attribute value to `MTIzNTY=`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute', 'MTIzNTY=')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute="MTIzNTY=">Some text</div>
 *     ```
 *
 * 1. Set attribute value to `{ playback: false }`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute', '{ playback: false }')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute="{ playback: false }">Some text</div>
 *     ```
 *
 * @added v1.10.1.
 */
/* eslint-enable max-len */
export function trustedSetAttr(source, selector, attr, value = '') {
    if (!selector || !attr) {
        return;
    }

    setAttributeBySelector(source, selector, attr, value);
    observeDOMChanges(() => setAttributeBySelector(source, selector, attr, value), true);
}

export const trustedSetAttrNames = [
    'trusted-set-attr',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedSetAttr.primaryName = trustedSetAttrNames[0];

trustedSetAttr.injections = [
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    // following helpers should be imported and injected
    // because they are used by helpers above
    defaultAttributeSetter,
    logMessage,
    throttle,
    hit,
];
