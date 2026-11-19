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
    isDigits,
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
 * example.org#%#//scriptlet('trusted-set-attr', selector, attr[, value[, ...options]])
 * ```
 *
 * - `selector` — required, CSS selector, specifies DOM nodes to set attributes on
 * - `attr` — required, attribute to be set
 * - `value` — optional, the value to assign to the attribute, defaults to ''.
 * - `options` — optional, pairs of a name and a value which follow `value`:
 *     - `runAt, value` — set the attribute when the document is `loading`, `interactive` or `complete`,
 *       instead of immediately, e.g. `'runAt', 'interactive'`
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-set-attr, ins.adsbygoogle, data-ad-status, unfilled, runAt, interactive)`:
 *
 * ```text
 * example.org##+js(trusted-set-attr, selector, attr[, value[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows, as in uBO:
 *
 * - options are pairs of a name and a value which follow `value`:
 *     - `runAt, value` — the attribute is set when the document is `loading`, `interactive` or `complete`,
 *       by default when it is `complete`
 * - the attribute is set again only when nodes are added, not when the page changes an attribute
 * - an attribute of an event handler of the element, e.g. `onclick`, is not set to a non-empty value
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
 * 1. Set attribute when the document is interactive, e.g. if the page sets it while it is loading
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-attr', 'a.class', 'test-attribute', 'MTIzNTY=', 'runAt', 'interactive')
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
export function trustedSetAttr(source, selector, attr, value = '', ...extraArgs) {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments, i.e. named options
    const settings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboAttrSettings(
            source,
            unescapeUboArgument(selector),
            unescapeUboArgument(attr),
            unescapeUboArgument(value),
            extraArgs.map(unescapeUboArgument),
            true,
        )
        : getAdgAttrSettings(source, selector, attr, value, extraArgs, true);

    if (settings === null) {
        return;
    }

    setAttrBySettings(source, settings);
}

export const trustedSetAttrNames = [
    'trusted-set-attr',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-set-attr.js',
    'ubo-trusted-set-attr',
];

// eslint-disable-next-line prefer-destructuring
trustedSetAttr.primaryName = trustedSetAttrNames[0];

trustedSetAttr.injections = [
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
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
