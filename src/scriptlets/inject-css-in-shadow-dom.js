import {
    hit,
    logMessage,
    hijackAttachShadow,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet inject-css-in-shadow-dom
 *
 * @description
 * Injects CSS rule into selected Shadow DOM subtrees on a page
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('inject-css-in-shadow-dom', cssRule[, hostSelector])
 * ```
 *
 * - `cssRule` — required, string representing a single css rule
 * - `hostSelector` — optional, string, selector to match shadow host elements.
 *   CSS rule will be only applied to shadow roots inside these elements.
 *   Defaults to injecting css rule into all available roots.
 *
 * ### Examples
 *
 * 1. Apply style to all shadow dom subtrees
 *
 *     ```adblock
 *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#advertisement { display: none !important; }')
 *     ```
 *
 * 1. Apply style to a specific shadow dom subtree
 *
 *     ```adblock
 *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#content { margin-top: 0 !important; }', '#banner')
 *     ```
 *
 * @added v1.8.2.
 */
/* eslint-enable max-len */

export function injectCssInShadowDom(source, cssRule, hostSelector = '') {
    // do nothing if browser does not support ShadowRoot, Proxy or Reflect
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow || typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
        return;
    }

    // Prevent url() and image-set() styles from being applied
    if (cssRule.match(/(url|image-set)\(.*\)/i)) {
        logMessage(source, '"url()" function is not allowed for css rules');
        return;
    }

    const callback = (shadowRoot) => {
        try {
            // adoptedStyleSheets and CSSStyleSheet constructor are not yet supported by Safari
            // https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets
            // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet
            const stylesheet = new CSSStyleSheet();
            try {
                stylesheet.insertRule(cssRule);
            } catch (e) {
                logMessage(source, `Unable to apply the rule '${cssRule}' due to: \n'${e.message}'`);
                return;
            }
            shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, stylesheet];
        } catch {
            const styleTag = document.createElement('style');
            styleTag.innerText = cssRule;
            shadowRoot.appendChild(styleTag);
        }

        hit(source);
    };

    hijackAttachShadow(window, hostSelector, callback);
}

injectCssInShadowDom.names = [
    'inject-css-in-shadow-dom',
];

injectCssInShadowDom.injections = [
    hit,
    logMessage,
    hijackAttachShadow,
];
