import { hit } from '../helpers/index';

/**
 * @scriptlet disable-newtab-links
 *
 * @description
 * Prevents opening new tabs and windows if there is `target` attribute in element.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#disable-newtab-linksjs-
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('disable-newtab-links')
 * ```
 *
 * @added v1.0.4.
 */
export function disableNewtabLinks(source) {
    document.addEventListener('click', (ev) => {
        let { target } = ev;
        while (target !== null) {
            if (target.localName === 'a' && target.hasAttribute('target')) {
                ev.stopPropagation();
                ev.preventDefault();
                hit(source);
                break;
            }
            target = target.parentNode;
        }
    });
}

disableNewtabLinks.names = [
    'disable-newtab-links',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'disable-newtab-links.js',
    'ubo-disable-newtab-links.js',
    'ubo-disable-newtab-links',
];

disableNewtabLinks.injections = [
    hit,
];
