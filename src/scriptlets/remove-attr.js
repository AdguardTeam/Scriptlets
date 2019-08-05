import { hit } from '../helpers';

/**
 * Removes attributes from DOM nodes. Will run only once after page load.
 *
 * @param {Source} source
 * @param {string} attrs attributes names separated by `|` which should be removed
 * @param {string} selector CSS selector specifies nodes from which attributes should be removed
 */
export function removeAttr(source, attrs, selector) {
    if (!attrs) { return; }
    attrs = attrs.split(/\s*\|\s*/);
    if (!selector) {
        selector = `[${attrs.join('],[')}]`;
    }

    const rmattr = (ev) => {
        if (ev) {
            window.removeEventListener(ev.type, rmattr, true);
        }

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

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', rmattr, true);
    } else {
        rmattr();
    }
}

removeAttr.names = [
    'remove-attr',
    'remove-attr.js',
    'ubo-remove-attr.js',
];

removeAttr.injections = [hit];
