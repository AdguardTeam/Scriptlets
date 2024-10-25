import {
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    convertTypeToString,
    // following helpers should be imported and injected
    // because they are used by helpers above
    defaultAttributeSetter,
    logMessage,
    throttle,
    hit,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-attr
 *
 * @description
 * Sets attribute with permitted value on the specified elements. This scriptlet runs once when the page loads
 * and after that on DOM tree changes.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-attrjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-attr', selector, attr[, value])
 * ```
 *
 * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
 * - `attr` — required, attribute to be set
 * - `value` — optional, the value to assign to the attribute, defaults to ''. Possible values:
 *     - `''` — empty string
 *     - positive decimal integer `<= 32767`
 *     - `true` / `false` in any case variation
 *     - `[attribute-name]` copy the value from attribute `attribute-name` on the same element.
 *
 * ### Examples
 *
 * 1. Set attribute by selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'div.class > a.class', 'test-attribute', '0')
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
 *         <a class="class" test-attribute="0">Some text</a>
 *     </div>
 *     ```
 *
 * 1. Set attribute without value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'a.class', 'test-attribute')
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
 * 1. Set attribute value to `TRUE`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'a.class', 'test-attribute', 'TRUE')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute="TRUE">Some text</div>
 *     ```
 *
 * 1. Set attribute value to `fAlse`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'a.class', 'test-attribute', 'fAlse')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <a class="class">Some text</div>
 *
 *     <!-- after -->
 *     <a class="class" test-attribute="fAlse">Some text</div>
 *     ```
 *
 * 1. Copy attribute value from the target element
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'iframe[data-cur]', 'href', '[data-cur]')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <iframe data-cur="good-url.com" href="bad-url.org"></iframe>
 *
 *     <!-- after -->
 *     <iframe data-cur="good-url.com" href="good-url.com"></iframe>
 *     ```
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function setAttr(source, selector, attr, value = '') {
    if (!selector || !attr) {
        return;
    }

    const allowedValues = ['true', 'false'];

    const shouldCopyValue = value.startsWith('[') && value.endsWith(']');

    const isValidValue = value.length === 0
        || (!nativeIsNaN(parseInt(value, 10))
            && parseInt(value, 10) >= 0
            && parseInt(value, 10) <= 32767)
        || allowedValues.includes(value.toLowerCase());

    if (!shouldCopyValue && !isValidValue) {
        logMessage(source, `Invalid attribute value provided: '${convertTypeToString(value)}'`);
        return;
    }

    /**
     * Defining value extraction logic here allows us to remove
     * excessive `shouldCopyValue` checks in observer callback.
     * Setting plain value is a default behavior.
     */
    let attributeHandler;
    if (shouldCopyValue) {
        attributeHandler = (elem, attr, value) => {
            const valueToCopy = elem.getAttribute(value.slice(1, -1));
            if (valueToCopy === null) {
                logMessage(source, `No element attribute found to copy value from: ${value}`);
            }
            elem.setAttribute(attr, valueToCopy);
        };
    }

    setAttributeBySelector(source, selector, attr, value, attributeHandler);
    observeDOMChanges(() => setAttributeBySelector(source, selector, attr, value, attributeHandler), true);
}

export const setAttrNames =[
    'set-attr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-attr.js',
    'ubo-set-attr.js',
    'ubo-set-attr',
];

setAttr.injections = [
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    convertTypeToString,
    // following helpers should be imported and injected
    // because they are used by helpers above
    defaultAttributeSetter,
    logMessage,
    throttle,
    hit,
];
