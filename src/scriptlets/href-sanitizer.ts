import {
    observeDOMChanges,
    hit,
    logMessage,
    throttle,
} from '../helpers/index';
import { Source } from '../../types/types';

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
 * example.org#%#//scriptlet('href-sanitizer', selector[, attribute, [ transform]])
 * ```
 *
 * - `selector` — required, a CSS selector to match the elements to be sanitized,
 *   which should be anchor elements (`<a>`) with `href` attribute.
 * - `attribute` — optional, default to `text`:
 *     - `text` — use the text content of the matched element,
 *     - `[<attribute-name>]` copy the value from attribute `attribute-name` on the same element,
 *     - `?<parameter-name>` copy the value from URL parameter `parameter-name` of the same element's `href` attribute.
 * - `transform` — optional, defaults to no transforming:
 *     - `base64decode` — decode the base64 string from specified attribute.
 *
 * > Note that in the case where the discovered value does not correspond to a valid URL with the appropriate
 * > http or https protocols, the value will not be set.
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
 * 4. Decode the base64 string from specified attribute:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]', '[href]', 'base64decode')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="http://www.foo.com/out/?aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw=="></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="http://example.com/?v=123"></a>
 *     </div>
 *     ```
 *
 * @added v1.10.25.
 */

export function hrefSanitizer(
    source: Source,
    selector: string,
    attribute = 'text',
    transform = '',
) {
    if (!selector) {
        logMessage(source, 'Selector is required.');
        return;
    }

    const BASE64_TRANSFORM_MARKER = 'base64decode';

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
     * Validates whether a given string is a URL.
     *
     * @param url The URL string to validate.
     * @returns `true` if the string is a valid URL, otherwise `false`.
     */
    const isValidURL = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
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
     * Recursively searches for the first valid URL within a nested object.
     *
     * @param obj The object to search for URLs.
     * @returns The first found URL as a string, or `null` if none are found.
     */
    const extractURLFromObject = (obj: Record<string, unknown>): string | null => {
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                continue;
            }

            const value = obj[key];

            if (typeof value === 'string' && isValidURL(value)) {
                return value;
            }

            if (typeof value === 'object' && value !== null) {
                const result = extractURLFromObject(value as Record<string, unknown>);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    };

    /**
     * Checks if the given content has object format.
     * @param content The content to check.
     * @returns `true` if the content has object format, `false` otherwise.
     */
    const isStringifiedObject = (content: string) => content.startsWith('{') && content.endsWith('}');

    /**
     * Decodes a base64 string several times. If the result is a valid URL, it is returned.
     * If the result is a JSON object, the first valid URL within the object is returned.
     * @param text The base64 string to decode.
     * @param times The number of times to decode the base64 string.
     * @returns Decoded base64 string or empty string if no valid URL is found.
     */
    const decodeBase64SeveralTimes = (text: string, times: number): string | null => {
        let result = text;
        for (let i = 0; i < times; i += 1) {
            try {
                result = atob(result);
            } catch (e) {
                // Not valid base64 string
                if (result === text) {
                    return '';
                }
            }
        }
        // if found valid URL, return it
        if (isValidURL(result)) {
            return result;
        }
        // if the result is an object, try to extract URL from it
        if (isStringifiedObject(result)) {
            try {
                const parsedResult = JSON.parse(result);
                return extractURLFromObject(parsedResult);
            } catch (ex) {
                return '';
            }
        }
        logMessage(source, `Failed to decode base64 string: ${text}`);
        return '';
    };

    // URL components markers
    const SEARCH_QUERY_MARKER = '?';
    const SEARCH_PARAMS_MARKER = '&';
    const HASHBANG_MARKER = '#!';
    const ANCHOR_MARKER = '#';
    // decode attempts for base64 string
    const DECODE_ATTEMPTS_NUMBER = 10;

    /**
     * Decodes the search string by removing the search query marker and decoding the base64 string.
     * @param search Search string to decode
     * @returns Decoded search string or empty string if no valid URL is found
     */
    const decodeSearchString = (search: string) => {
        const searchString = search.replace(SEARCH_QUERY_MARKER, '');
        let decodedParam;
        let validEncodedParam;
        if (searchString.includes(SEARCH_PARAMS_MARKER)) {
            const searchParamsArray = searchString.split(SEARCH_PARAMS_MARKER);
            searchParamsArray.forEach((param) => {
                decodedParam = decodeBase64SeveralTimes(param, DECODE_ATTEMPTS_NUMBER);
                if (decodedParam && decodedParam.length > 0) {
                    validEncodedParam = decodedParam;
                }
            });
            return validEncodedParam;
        }
        return decodeBase64SeveralTimes(searchString, DECODE_ATTEMPTS_NUMBER);
    };

    /**
     * Decodes the hash string by removing the hashbang or anchor marker and decoding the base64 string.
     * @param hash Hash string to decode
     * @returns Decoded hash string or empty string if no valid URL is found
     */
    const decodeHashString = (hash: string) => {
        let validEncodedHash = '';

        if (hash.includes(HASHBANG_MARKER)) {
            validEncodedHash = hash.replace(HASHBANG_MARKER, '');
        } else if (hash.includes(ANCHOR_MARKER)) {
            validEncodedHash = hash.replace(ANCHOR_MARKER, '');
        }

        return validEncodedHash ? decodeBase64SeveralTimes(validEncodedHash, DECODE_ATTEMPTS_NUMBER) : '';
    };

    /**
     * Extracts the base64 part from a string.
     * If no base64 string is found, `null` is returned.
     * @param url String to extract the base64 part from.
     * @returns The base64 part of the string, or `null` if none is found.
     */
    const decodeBase64URL = (url: string) => {
        const { search, hash } = new URL(url);

        if (search.length > 0) {
            return decodeSearchString(search);
        }

        if (hash.length > 0) {
            return decodeHashString(hash);
        }

        logMessage(source, `Failed to execute base64 from URL: ${url}`);
        return null;
    };

    /**
     * Decodes a base64 string from the given href.
     * If the href is a valid URL, the base64 string is decoded.
     * If the href is not a valid URL, the base64 string is decoded several times.
     * @param href The href to decode.
     * @returns The decoded base64 string.
     */
    const base64Decode = (href: string): string => {
        if (isValidURL(href)) {
            return decodeBase64URL(href) || '';
        }

        return decodeBase64SeveralTimes(href, DECODE_ATTEMPTS_NUMBER) || '';
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
                    logMessage(source, `${elem} is not a valid element to sanitize`);
                    return;
                }
                let newHref = extractNewHref(elem, attribute);

                // apply transform if specified
                if (transform) {
                    switch (transform) {
                        case BASE64_TRANSFORM_MARKER:
                            newHref = base64Decode(newHref);
                            break;
                        default:
                            logMessage(source, `Invalid transform option: "${transform}"`);
                            return;
                    }
                }

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

export const hrefSanitizerNames = [
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
