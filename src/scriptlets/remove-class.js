import {
    hit,
    logMessage,
    isValidSelector,
    observeDOMChanges,
    parseFlags,
    throttle,
} from '../helpers';

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
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-class', classes[, selector, applying])
 * ```
 *
 * - `classes` — required, class or list of classes separated by '|'
 * - `selector` — optional, CSS selector, specifies DOM nodes from which the classes will be removed.
 *   If there is no `selector`, each class of `classes` independently will be removed from all nodes which has one
 * - `applying` — optional, one or more space-separated flags that describe the way scriptlet apply,
 *   defaults to 'asap stay'; possible flags:
 *     - `asap` — runs as fast as possible **once**
 *     - `complete` — runs **once** after the whole page has been loaded
 *     - `stay` — as fast as possible **and** stays on the page observing possible DOM changes
 *
 * ### Examples
 *
 * 1. Removes by classes
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-class', 'example|test')
 *     ```
 *
 *     ```html
 *     <!-- before -->
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
 * 1. Removes with specified selector
 *
 *     ```adblock
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
 * 1. Using flags
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-class', 'branding', 'div[class^="inner"]', 'asap complete')
 *     ```
 *
 * @added v1.1.1.
 */
/* eslint-enable max-len */

export function removeClass(source, classNames, selector, applying = 'asap stay') {
    if (!classNames) {
        return;
    }
    classNames = classNames.split(/\s*\|\s*/);
    // if selector is not specified, elements are searched by class names,
    // which are escaped, because class name may be not a valid CSS identifier, e.g. 'md:hidden'
    const selectors = selector
        ? [selector]
        : classNames.map((className) => `.${CSS.escape(className)}`);

    // Selectors are validated once, otherwise an invalid selector argument would be logged on each DOM change,
    // and an invalid selector made of class names, e.g. of an empty one, would throw an error
    const invalidSelector = selectors.find((s) => !isValidSelector(s));
    if (invalidSelector !== undefined) {
        logMessage(source, `Invalid selector arg: '${invalidSelector}'`);
        return;
    }

    const removeClassHandler = () => {
        const nodes = new Set();
        // selectors are validated before
        selectors.forEach((s) => {
            const elements = document.querySelectorAll(s);
            for (let i = 0; i < elements.length; i += 1) {
                const element = elements[i];
                nodes.add(element);
            }
        });

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
    const flags = parseFlags(applying);

    const run = () => {
        removeClassHandler();
        if (!flags.hasFlag(flags.STAY)) {
            return;
        }
        // 'true' for observing attributes
        // 'class' for observing only classes
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
    };

    if (flags.hasFlag(flags.ASAP)) {
        // https://github.com/AdguardTeam/Scriptlets/issues/245
        // Call removeClassHandler on DOM content loaded
        // to ensure that target node is present on the page
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', removeClassHandler, { once: true });
        } else {
            removeClassHandler();
        }
    }

    if (document.readyState !== 'complete' && flags.hasFlag(flags.COMPLETE)) {
        window.addEventListener('load', run, { once: true });
    } else if (flags.hasFlag(flags.STAY)) {
        // Only call removeClassHandler for single 'stay' flag
        if (!applying.includes(' ')) {
            removeClassHandler();
        }
        observeDOMChanges(removeClassHandler, true, CLASS_ATTR_NAME);
    }
}

export const removeClassNames = [
    'remove-class',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-class.js',
    'ubo-remove-class.js',
    'rc.js',
    'ubo-rc.js',
    'ubo-remove-class',
    'ubo-rc',
];

// eslint-disable-next-line prefer-destructuring
removeClass.primaryName = removeClassNames[0];

removeClass.injections = [
    hit,
    logMessage,
    isValidSelector,
    observeDOMChanges,
    parseFlags,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
];
