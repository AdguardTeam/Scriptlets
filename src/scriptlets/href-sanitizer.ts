import {
    observeDOMChanges,
    hit,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
} from '../helpers/index';

/**
 * @scriptlet href-sanitizer
 *
 * @description
 * Set the `href` attribute to a value found in text content of the targeted `a` element,
 * or in an attribute of the targeted `a` element,
 * or in a URL parameter of the targeted `a` element's `href` attribute.
 * This scriptlet runs once when the page loads and after that on DOM tree changes.
 *
 * Related UBO scriptlet:
 * https://github.com/uBlockOrigin/uBlock-issues/wiki/Resources-Library#href-sanitizerjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('href-sanitizer', selector[, attribute])
 * ```
 *
 * - `selector` — required, a CSS selector to match the elements to be sanitized,
 *   which should be anchor elements (`<a>`) with `href` attribute.
 * - `attribute` — optional, default to `text`:
 *     - `text` — use the text content of the matched element,
 *     - `[attribute-name]` copy the value from attribute `attribute-name` on the same element,
 *     - `?parameter` copy the value from URL parameter `parameter` of the same element's `href` attribute.
 *
 * ### Examples
 *
 * 1. Set the `href` attribute to a value found in text content of the targeted `a` element:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="https://foo.com/bar">https://example.org/test?foo</a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="https://example.org/test?foo">https://example.org/test?foo</a>
 *     </div>
 *     ```
 *
 * 2. Set the `href` attribute to a value found in an attribute of the targeted `a` element:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]', '[data-href]')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="https://foo.com/bar" data-href="https://example.org/test?foo"></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="https://example.org/test?foo" data-href="https://example.org/test?foo"></a>
 *     </div>
 *     ```
 *
 * 3. Set the `href` attribute to a value found in a URL parameter of the targeted `a` element's `href` attribute:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="tracker.com"]', '?redirect')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="https://tracker.com/foo?redirect=https://example.org/"></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="https://example.org/"></a>
 *     </div>
 *     ```
 *
 * @added v1.10.25.
 */

export function hrefSanitizer(
    source: Source,
    selector: string,
    attribute = 'text',
) {
    if (!selector) {
        logMessage(source, 'Selector is required.');
        return;
    }

    // Regular expression to find not valid characters at the beginning and at the end of the string,
    // \x21-\x7e is a range that includes the ASCII characters from ! (hex 21) to ~ (hex 7E).
    // This range covers numbers, English letters, and common symbols.
    // \p{Letter} matches any kind of letter from any language.
    // It's required to fix Twitter case, 'textContent' of the link contains '…' at the end,
    // so it have to be removed, otherwise it will not work properly.
    const regexpNotValidAtStart = /^[^\x21-\x7e\p{Letter}]+/u;
    const regexpNotValidAtEnd = /[^\x21-\x7e\p{Letter}]+$/u;

    /**
     * Extracts text from an element based on the specified attribute.
     *
     * @param anchor The element from which to extract the text.
     * @param attr The attribute indicating how to extract the text.
     * @returns The extracted text.
     */
    const extractNewHref = (anchor: HTMLAnchorElement, attr: string): string => {
        if (attr === 'text') {
            if (!anchor.textContent) {
                return '';
            }
            return anchor.textContent
                .replace(regexpNotValidAtStart, '')
                .replace(regexpNotValidAtEnd, '');
        }
        if (attr.startsWith('?')) {
            try {
                const url = new URL(anchor.href, document.location.href);
                return url.searchParams.get(attr.slice(1)) || '';
            } catch (ex) {
                logMessage(
                    source,
                    `Cannot retrieve the parameter '${attr.slice(1)}' from the URL '${anchor.href}`,
                );
                return '';
            }
        }
        if (attr.startsWith('[') && attr.endsWith(']')) {
            return anchor.getAttribute(attr.slice(1, -1)) || '';
        }
        return '';
    };

    /**
     * Validates a URL, if valid return URL,
     * otherwise return null.
     *
     * @param text The URL to be validated
     * @returns URL for valid URL, otherwise null.
     */
    const getValidURL = (text: string): string | null => {
        if (!text) {
            return null;
        }
        try {
            const { href, protocol } = new URL(text, document.location.href);
            if (protocol !== 'http:' && protocol !== 'https:') {
                logMessage(source, `Protocol not allowed: "${protocol}", from URL: "${href}"`);
                return null;
            }
            return href;
        } catch {
            return null;
        }
    };

    /**
     * Checks if the given element is a sanitizable anchor element.
     *
     * @param element The element to check.
     * @returns True if the element is a sanitizable anchor element, false otherwise.
     */
    const isSanitizableAnchor = (element: Element): element is HTMLAnchorElement => {
        return element.nodeName.toLowerCase() === 'a' && element.hasAttribute('href');
    };

    /**
     * Sanitizes the href attribute of elements matching the given selector.
     *
     * @param elementSelector The CSS selector to match the elements.
     */
    const sanitize = (elementSelector: string): void => {
        let elements;
        try {
            elements = document.querySelectorAll(elementSelector);
        } catch (e) {
            logMessage(source, `Invalid selector "${elementSelector}"`);
            return;
        }

        elements.forEach((elem) => {
            try {
                if (!isSanitizableAnchor(elem)) {
                    return;
                }
                const newHref = extractNewHref(elem, attribute);
                const newValidHref = getValidURL(newHref);
                if (!newValidHref) {
                    logMessage(source, `Invalid URL: ${newHref}`);
                    return;
                }
                const oldHref = elem.href; // Required to log the original URL.

                elem.setAttribute('href', newValidHref);

                if (newValidHref !== oldHref) {
                    logMessage(source, `Sanitized "${oldHref}" to "${newValidHref}".`);
                }
            } catch (ex) {
                logMessage(source, `Failed to sanitize ${elem}.`);
            }
        });
        hit(source);
    };

    const run = () => {
        sanitize(selector);
        observeDOMChanges(() => sanitize(selector), true);
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
        run();
    }
}

hrefSanitizer.names = [
    'href-sanitizer',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'href-sanitizer.js',
    'ubo-href-sanitizer.js',
    'ubo-href-sanitizer',
];

hrefSanitizer.injections = [
    observeDOMChanges,
    hit,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
];
