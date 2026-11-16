import {
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    defaultAttributeSetter,
    logMessage,
    isValidSelector,
    isValidAttributeName,
    throttle,
    hit,
    parseUboOptions,
    unescapeUboArgument,
    runAtReadyState,
    getAdgAttrSettings,
    getUboAttrSettings,
    setAttrBySettings,
} from '../helpers';

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
 * example.org#%#//scriptlet('set-attr', selector, attr[, value[, ...options]])
 * ```
 *
 * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
 * - `attr` — required, attribute to be set
 * - `value` — optional, the value to assign to the attribute, defaults to ''. Possible values:
 *     - `''` — empty string
 *     - positive decimal integer `<= 32767`
 *     - `true` / `false` in any case variation
 *     - `[attribute-name]` copy the value from attribute `attribute-name` on the same element,
 *       or `null` if the element has no such attribute.
 * - `options` — optional, pairs of a name and a value which follow `value`:
 *     - `runAt, value` — set the attribute when the document is `loading`, `interactive` or `complete`,
 *       instead of immediately, e.g. `'runAt', 'interactive'`
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(set-attr, iframe[data-src], src, [data-src], runAt, interactive)`:
 *
 * ```text
 * example.org##+js(set-attr, selector, attr[, value[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows, as in uBO:
 *
 * - `value` is a decimal integer which consists of digits only, and is set without leading zeros,
 *   e.g. `007` as `7`, and an attribute to copy the value from is empty if the element has no such attribute
 * - options are pairs of a name and a value which follow `value`:
 *     - `runAt, value` — the attribute is set when the document is `loading`, `interactive` or `complete`,
 *       by default when it is `complete`
 * - the attribute is set again only when nodes are added, not when the page changes an attribute
 * - an attribute of an event handler of the element, e.g. `onclick`, is not set to a non-empty value,
 *   e.g. copied from another attribute
 *
 * ### Examples
 *
 * 1. Set attribute by selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'div > a.class', 'test-attribute', '0')
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
 * 1. Copy attribute value when the document is interactive, e.g. if the page sets it while it is loading
 *
 *     ```adblock
 *     example.org#%#//scriptlet('set-attr', 'iframe[data-cur]', 'href', '[data-cur]', 'runAt', 'interactive')
 *     ```
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function setAttr(source, selector, attr, value = '', ...extraArgs) {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments, i.e. named options
    const settings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboAttrSettings(
            source,
            unescapeUboArgument(selector),
            unescapeUboArgument(attr),
            unescapeUboArgument(value),
            extraArgs.map(unescapeUboArgument),
            false,
        )
        : getAdgAttrSettings(source, selector, attr, value, extraArgs, false);

    if (settings === null) {
        return;
    }

    setAttrBySettings(source, settings);
}

export const setAttrNames = [
    'set-attr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-attr.js',
    'ubo-set-attr.js',
    'ubo-set-attr',
];

// eslint-disable-next-line prefer-destructuring
setAttr.primaryName = setAttrNames[0];

setAttr.injections = [
    setAttributeBySelector,
    observeDOMChanges,
    nativeIsNaN,
    isValidSelector,
    isValidAttributeName,
    parseUboOptions,
    unescapeUboArgument,
    runAtReadyState,
    getAdgAttrSettings,
    getUboAttrSettings,
    setAttrBySettings,
    // following helpers should be imported and injected
    // because they are used by helpers above
    defaultAttributeSetter,
    logMessage,
    throttle,
    hit,
];
