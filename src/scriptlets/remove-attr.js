import {
    hit,
    observeDOMChanges,
    parseFlags,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet remove-attr
 *
 * @description
 * Removes the specified attributes from DOM nodes. This scriptlet runs once when the page loads
 * and after that periodically in order to DOM tree changes by default,
 * or as specified by applying argument.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-attr', attrs[, selector, applying])
 * ```
 *
 * - `attrs` — required, attribute or list of attributes joined by '|'
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
 * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply,
 *   defaults to 'asap stay'; possible flags:
 *     - `asap` — runs as fast as possible **once**
 *     - `complete` — runs **once** after the whole page has been loaded
 *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
 *
 * ### Examples
 *
 * 1. Removes by attribute
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-attr', 'example|test')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div example="true" test="true">Some text</div>
 *
 *     <!-- after -->
 *     <div>Some text</div>
 *     ```
 *
 * 1. Removes with specified selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-attr', 'example', 'div[class="inner"]')
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
 *
 * 1. Using flags
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-attr', 'example', 'html', 'asap complete')
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function removeAttr(source, attrs, selector, applying = 'asap stay') {
    if (!attrs) {
        return;
    }
    attrs = attrs.split(/\s*\|\s*/);
    if (!selector) {
        selector = `[${attrs.join('],[')}]`;
    }

    const rmattr = () => {
        let nodes = [];
        try {
            nodes = [].slice.call(document.querySelectorAll(selector));
        } catch (e) {
            logMessage(source, `Invalid selector arg: '${selector}'`);
        }
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

    const flags = parseFlags(applying);

    const run = () => {
        rmattr();
        if (!flags.hasFlag(flags.STAY)) {
            return;
        }
        // 'true' for observing attributes
        observeDOMChanges(rmattr, true);
    };

    if (flags.hasFlag(flags.ASAP)) {
        // https://github.com/AdguardTeam/Scriptlets/issues/245
        // Call rmattr on DOM content loaded
        // to ensure that target node is present on the page
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', rmattr, { once: true });
        } else {
            rmattr();
        }
    }

    if (document.readyState !== 'complete' && flags.hasFlag(flags.COMPLETE)) {
        window.addEventListener('load', run, { once: true });
    } else if (flags.hasFlag(flags.STAY)) {
        // Only call rmattr for single 'stay' flag
        if (!applying.includes(' ')) {
            rmattr();
        }
        // 'true' for observing attributes
        observeDOMChanges(rmattr, true);
    }
}

removeAttr.names = [
    'remove-attr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-attr.js',
    'ubo-remove-attr.js',
    'ra.js',
    'ubo-ra.js',
    'ubo-remove-attr',
    'ubo-ra',
];

removeAttr.injections = [
    hit,
    observeDOMChanges,
    parseFlags,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
];
