import { hit, logMessage, hijackAttachShadow } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet inject-css-in-shadow-dom
 *
 * @description
 * Injects CSS rule into selected Shadow DOM subtrees on a page.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('inject-css-in-shadow-dom', cssRule[, hostSelector[, cssInjectionMethod]])
 * ```
 *
 * - `cssRule` — required, string representing a single CSS rule.
 * - `hostSelector` — optional, string, selector to match shadow host elements.
 *   CSS rule will be only applied to shadow roots inside these elements.
 *   Defaults to injecting CSS rule into all available roots.
 * - `cssInjectionMethod` — optional, string, method to inject CSS rule into shadow DOM.
 *   Available methods are:
 *     - `adoptedStyleSheets` — injects the CSS rule using adopted style sheets (default option).
 *     - `styleTag` — injects the CSS rule using a `style` tag.
 *
 * ### Examples
 *
 * 1. Apply style to all shadow DOM subtrees:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#advertisement { display: none !important; }')
 *     ```
 *
 * 1. Apply style to a specific shadow DOM subtree:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('inject-css-in-shadow-dom', '#content { margin-top: 0 !important; }', '#banner')
 *     ```
 *
 * 1. Apply style to all shadow DOM subtrees using style tag:
 *
 *    ```adblock
 *    example.org#%#//scriptlet('inject-css-in-shadow-dom', '.ads { display: none !important; }', '', 'styleTag')
 *    ```
 *
 * @added v1.8.2.
 */
/* eslint-enable max-len */

export function injectCssInShadowDom(
    source,
    cssRule,
    hostSelector = '',
    cssInjectionMethod = 'adoptedStyleSheets',
) {
    // Do nothing if browser does not support ShadowRoot, Proxy or Reflect:
    // https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
    if (!Element.prototype.attachShadow || typeof Proxy === 'undefined' || typeof Reflect === 'undefined') {
        return;
    }

    if (cssInjectionMethod !== 'adoptedStyleSheets' && cssInjectionMethod !== 'styleTag') {
        logMessage(source, `Unknown cssInjectionMethod: ${cssInjectionMethod}`);
        return;
    }

    // Prevent url() and image-set() styles from being applied:
    if (cssRule.match(/(url|image-set)\(.*\)/i)) {
        logMessage(source, '"url()" function is not allowed for css rules');
        return;
    }

    const injectStyleTag = (shadowRoot) => {
        try {
            const styleTag = document.createElement('style');
            styleTag.innerText = cssRule;
            shadowRoot.appendChild(styleTag);
            hit(source);
        } catch (error) {
            logMessage(source, `Unable to inject style tag due to: \n'${error.message}'`);
        }
    };

    /**
     * Injects CSS rules into a shadow root using the adoptedStyleSheets API.
     *
     * @param {ShadowRoot} shadowRoot - The shadow root to inject styles into
     * @private
     *
     * @description
     * This function attempts to inject CSS using adoptedStyleSheets API.
     * If successful, it adds the stylesheet to the shadow root's adoptedStyleSheets array.
     * On failure, it falls back to using the injectStyleTag method.
     */
    const injectAdoptedStyleSheets = (shadowRoot) => {
        try {
            // adoptedStyleSheets and CSSStyleSheet constructor are not supported by old browsers:
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
            hit(source);
        } catch (error) {
            logMessage(source, `Unable to inject adopted style sheet due to: \n'${error.message}'`);
            injectStyleTag(shadowRoot);
        }
    };

    const callback = (shadowRoot) => {
        if (cssInjectionMethod === 'adoptedStyleSheets') {
            injectAdoptedStyleSheets(shadowRoot);
        } else if (cssInjectionMethod === 'styleTag') {
            injectStyleTag(shadowRoot);
        }
    };

    hijackAttachShadow(window, hostSelector, callback);
}

export const injectCssInShadowDomNames = [
    'inject-css-in-shadow-dom',
];

// eslint-disable-next-line prefer-destructuring
injectCssInShadowDom.primaryName = injectCssInShadowDomNames[0];

injectCssInShadowDom.injections = [
    hit,
    logMessage,
    hijackAttachShadow,
];
