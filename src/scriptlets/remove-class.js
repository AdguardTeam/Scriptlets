import { hit, observeDOMChanges } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet remove-class
 *
 * @description
 * Removes the specified classes from DOM nodes. This scriptlet runs once after the page loads
 * and after that periodically in order to DOM tree changes.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#remove-classjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('remove-class', classes[, selector, applying])
 * ```
 *
 * - `classes` — required, class or list of classes separated by '|'
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed.
 * If there is no `selector`, each class of `classes` independently will be removed from all nodes which has one
 * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply, defaults to 'asap stay'; possible flags:
 *     - `asap` — runs as fast as possible **once**
 *     - `complete` — runs **once** after the whole page has been loaded
 *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
 *
 * **Examples**
 * 1.  Removes by classes
 *     ```
 *     example.org#%#//scriptlet('remove-class', 'example|test')
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
 *     example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]')
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
 *
 *  3. Using flags
 *     ```
 *     example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]', 'asap complete')
 *     ```
 */
/* eslint-enable max-len */

export function removeClass(source, classNames, selector, applying = 'asap stay') {
    if (!classNames) {
        return;
    }
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
        removeClassHandler();
        if (!passedFlags.indexOf(STAY_FLAG) !== -1) {
            return;
        }
        // 'true' for observing attributes
        // 'class' for observing only classes
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
    };

    if (passedFlags.indexOf(ASAP_FLAG) !== -1) {
        removeClassHandler();
    }

    if (document.readyState !== 'complete' && passedFlags.indexOf(COMPLETE_FLAG) !== -1) {
        window.addEventListener('load', run, { once: true });
    } else if (passedFlags.indexOf(STAY_FLAG) !== -1) {
        // Do not call removeClassHandler() twice for 'asap stay' flag
        if (passedFlags.length === 1) {
            removeClassHandler();
        }
        // 'true' for observing attributes
        // 'class' for observing only classes
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
    }
}

removeClass.names = [
    'remove-class',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-class.js',
    'ubo-remove-class.js',
    'rc.js',
    'ubo-rc.js',
    'ubo-remove-class',
    'ubo-rc',
];

removeClass.injections = [hit, observeDOMChanges];
