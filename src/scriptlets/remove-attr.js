import { hit, observeDOMChanges } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet remove-attr
 *
 * @description
 * Removes the specified attributes from DOM nodes. This scriptlet runs once when the page loads
 * and after that periodically in order to DOM tree changes.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-attrjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('remove-attr', attrs[, selector, applying])
 * ```
 *
 * - `attrs` — required, attribute or list of attributes joined by '|'
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the attributes will be removed
 * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply, defaults to 'asap stay'; possible flags:
 *     - `asap` — runs as fast as possible **once**
 *     - `complete` — runs **once** after the whole page has been loaded
 *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
 *
 * **Examples**
 * 1.  Removes by attribute
 *     ```
 *     example.org#%#//scriptlet('remove-attr', 'example|test')
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
 *  3. Using flags
 *     ```
 *     example.org#%#//scriptlet('remove-attr', 'example', 'html', 'asap complete')
 *     ```
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

    const FLAGS_DIVIDER = ' ';
    const ASAP_FLAG = 'asap';
    const COMPLETE_FLAG = 'complete';
    const STAY_FLAG = 'stay';

    const VALID_FLAGS = [STAY_FLAG, ASAP_FLAG, COMPLETE_FLAG];

    /* eslint-disable no-restricted-properties */
    const passedFlags = applying.trim()
        .split(FLAGS_DIVIDER)
        .filter((f) => VALID_FLAGS.indexOf(f) !== -1);

    const run = () => {
        rmattr();
        if (!passedFlags.indexOf(STAY_FLAG) !== -1) {
            return;
        }
        // 'true' for observing attributes
        observeDOMChanges(rmattr, true);
    };

    if (passedFlags.indexOf(ASAP_FLAG) !== -1) {
        rmattr();
    }

    if (document.readyState !== 'complete' && passedFlags.indexOf(COMPLETE_FLAG) !== -1) {
        window.addEventListener('load', run, { once: true });
    } else if (passedFlags.indexOf(STAY_FLAG) !== -1) {
        // Do not call rmattr() twice for 'asap stay' flag
        if (passedFlags.length === 1) {
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

removeAttr.injections = [hit, observeDOMChanges];
