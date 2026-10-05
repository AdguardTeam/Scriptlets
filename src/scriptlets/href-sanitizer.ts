import {
    observeDOMChanges,
    hit,
    logMessage,
    isValidSelector,
    throttle,
    getUrlParamValue,
} from '../helpers';
import { type Source } from './scriptlets';

/**
 * Failure to sanitize the value extracted from the link, which has been logged,
 * unless no value has been found in the link sanitized by the rule, see `getNewHref`.
 */
type Failure = {
    /**
     * Whether the failure depends on the document base URL, e.g. relative value resolved against it
     * to a URL with not allowed protocol, so the value may be sanitized after the base URL is changed.
     */
    isBaseDependent: boolean;
};

/**
 * State of the processed link.
 */
type LinkState = {
    href: string;
    value: string;
    /**
     * Document base URL without hash, against which the link and the value have been resolved.
     */
    baseURL: string;
    /**
     * Failure to sanitize the value, or `null` if the link has been sanitized or left as is.
     */
    failure: Failure | null;
    /**
     * Last write on the link when the state has been saved, see `ScriptletWrite`. Another rule's href
     * is accepted only if it continues this write, not a new one started on top of a page edit.
     */
    write: ScriptletWrite | undefined;
};

/**
 * Last href in a chain of actual scriptlet writes. A page edit starts a new record,
 * so object identity also distinguishes a new redirect from a nested continuation.
 */
type ScriptletWrite = {
    href: string;
};

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
 * example.org#%#//scriptlet('href-sanitizer', selector[, attribute[, transform]])
 * ```
 *
 * - `selector` — required, a CSS selector to match the elements to be sanitized,
 *   which should be anchor elements (`<a>`) with `href` attribute.
 * - `attribute` — optional, default to `text`:
 *     - `text` — use the text content of the matched element,
 *     - `[<attribute-name>]` copy the value from attribute `attribute-name` on the same element,
 *     - `?<parameter-name>` copy the value from URL parameter `parameter-name` of the same element's `href` attribute,
 *       `?` alone copies the value of the parameter with empty name, e.g. `?=https://example.org/`.
 * - `transform` — optional, defaults to no transforming. Possible values:
 *     - `base64decode` — decode the base64 string from specified attribute.
 *       `-base64` can be used as an alias.
 *     - `removeHash` — remove the hash from the URL.
 *     - `removeParam[:<parameters>]` — remove the specified parameters from the URL,
 *       where `<parameters>` is a comma-separated list of parameter names;
 *       if no parameter is specified, remove all parameters.
 *
 * > Note that in the case where the discovered value does not correspond to a valid URL with the appropriate
 * > HTTP or HTTPS protocols, the value will not be set. Relative URL is resolved against the document base URL.
 * > Link text is considered a URL only if it is an absolute URL or a path, i.e. it starts with `/`, `./`, `../`
 * > or `?` followed by a query, without whitespaces, so e.g. `Click here`, `Download`, `?`
 * > or `https://example.org/ (new)` is not set.
 * > Attribute, URL parameter and decoded base64 values follow URL parser rules, including relative URLs
 * > and spaces in paths or queries, e.g. `files/Annual Report.pdf` or `https://example.org/search?q=Report (1)`.
 * > Tab and newline characters are removed, as the URL parser does, but in link text only next to a URL
 * > delimiter, e.g. `/`, otherwise they separate text blocks, e.g. the URL and the title of a card.
 * > A value of only whitespaces is not set, and placeholder hash, i.e. `#` or `#!`, is not considered a URL,
 * > unless it is `href` of the link itself.
 * > For `base64decode` of `href` within the page, e.g. `#<base64>`, only its hash is decoded.
 *
 * > If the new URL is still matched by `selector` and contains another URL to sanitize,
 * > i.e. nested redirect in the same URL parameter or base64 encoded one in `href`, it is sanitized as well,
 * > up to 10 nested redirects at once, and the rest right after that.
 * > So `selector` should match all redirect URLs, e.g. of different tracking domains, but not the target URL,
 * > if it contains another URL to sanitize, e.g. a URL parameter with the same name or,
 * > for `base64decode` of `href`, a base64 encoded URL, e.g. return URL of the login page.
 * > Relative URL in the nested redirect is not followed, since it is relative to the redirect, not the page,
 * > except for a scheme-relative one, e.g. `//example.org/`, which is resolved against the redirect.
 *
 * > `removeHash` and `removeParam` do not remove anything from a link within the page, e.g. `#section`.
 * > If there is nothing to remove, the discovered value is set as is, the same as without `transform`.
 *
 * > `+` in the URL parameter is decoded as a whitespace, unless the parameter is a URL which is not encoded,
 * > e.g. `?url=https://example.org/c++/docs` is sanitized to `https://example.org/c++/docs`,
 * > or it is in the query of the URL, where it means a whitespace anyway.
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
 * 5. Remove the hash from the URL:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]', '[href]', 'removeHash')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="http://www.foo.com/out/#aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw=="></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="http://www.foo.com/out/"></a>
 *     </div>
 *     ```
 *
 * 6. Remove the all parameter(s) from the URL:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]', '[href]', 'removeParam')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="https://foo.com/123123?utm_source=nova&utm_medium=tg&utm_campaign=main"></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="https://foo.com/123123"></a>
 *     </div>
 *     ```
 *
 * 7. Remove the specified parameter(s) from the URL:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('href-sanitizer', 'a[href*="foo.com"]', '[href]', 'removeParam:utm_source,utm_medium')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>
 *         <a href="https://foo.com/123123?utm_source=nova&utm_medium=tg&utm_campaign=main"></a>
 *     </div>
 *
 *     <!-- after -->
 *     <div>
 *         <a href="https://foo.com/123123?utm_campaign=main"></a>
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

    // transform markers
    const BASE64_DECODE_TRANSFORM_MARKER = new Set([
        'base64decode',
        '-base64',
    ]);
    const REMOVE_HASH_TRANSFORM_MARKER = 'removeHash';
    const REMOVE_PARAM_TRANSFORM_MARKER = 'removeParam';
    // separator markers
    const MARKER_SEPARATOR = ':';
    const COMMA = ',';

    const isBase64DecodeTransform = BASE64_DECODE_TRANSFORM_MARKER.has(transform);
    const isRemoveHashTransform = transform === REMOVE_HASH_TRANSFORM_MARKER;
    const isRemoveParamTransform = transform === REMOVE_PARAM_TRANSFORM_MARKER
        || transform.startsWith(`${REMOVE_PARAM_TRANSFORM_MARKER}${MARKER_SEPARATOR}`);
    const isRemoveTransform = isRemoveHashTransform || isRemoveParamTransform;

    // Arguments are validated once, otherwise errors would be logged on each DOM change
    // '?' alone is the parameter with empty name, e.g. '?=https://example.org/'
    const isValidAttribute = attribute === 'text'
        || attribute.startsWith('?')
        || (attribute.length > 2 && attribute.startsWith('[') && attribute.endsWith(']'));
    if (!isValidAttribute) {
        logMessage(source, `Invalid attribute option: "${attribute}"`);
        return;
    }
    if (transform && !isBase64DecodeTransform && !isRemoveTransform) {
        logMessage(source, `Invalid transform option: "${transform}"`);
        return;
    }
    if (!isValidSelector(selector)) {
        logMessage(source, `Invalid selector "${selector}"`);
        return;
    }

    // Independently injected rules share their last actual write on the link itself.
    // The symbol property does not add HTML attributes or trigger DOM mutation observers.
    const writesKey = Symbol.for('adguard.href-sanitizer.writes');

    /**
     * Gets the last actual write shared by the rules processing this link.
     *
     * @param anchor The link element.
     * @returns The write record, or `undefined` if no rule has written to the link.
     */
    const getScriptletWrite = (anchor: Element): ScriptletWrite | undefined => {
        return (anchor as Element & { [writesKey]?: ScriptletWrite })[writesKey];
    };

    // Regular expression to find not valid characters at the beginning and at the end of the string,
    // \x21-\x7e is a range that includes the ASCII characters from ! (hex 21) to ~ (hex 7E).
    // This range covers numbers, English letters, and common symbols.
    // \p{Letter} matches any kind of letter from any language.
    // It's required to fix Twitter case, 'textContent' of the link contains '…' at the end,
    // so it have to be removed, otherwise it will not work properly.
    const regexpNotValidAtStart = /^[^\x21-\x7e\p{Letter}]+/u;
    const regexpNotValidAtEnd = /[^\x21-\x7e\p{Letter}]+$/u;

    // Whitespaces, including non-ASCII ones, e.g. no-break space, and control characters,
    // e.g. link text 'Click here' is not a URL, even though it would be resolved as a relative one
    // eslint-disable-next-line no-control-regex
    const regexpWhitespace = /[\s\x00-\x20\x7f]/;

    // Leading and trailing whitespaces and control characters, which are stripped by the URL parser
    // eslint-disable-next-line no-control-regex
    const regexpURLEdgeWhitespace = /^[\x00-\x20]+|[\x00-\x20]+$/g;

    // Tab and newline characters, which are removed from any part of the URL by the URL parser
    const regexpURLTabOrNewline = /[\t\n\r]/g;

    // Tab or newline in link text between characters which are not URL delimiters, e.g. between the URL
    // and the title of a card, 'https://example.org/news\nNews', unlike 'https://example.org/\npath'
    // or 'https://example.org/page\n?id=1'
    const regexpTextBlocks = /[^/?&=#.\-_\s][\t\n\r]+[^/?&=#.\-_\s]/;

    // Link text which is a relative URL path, i.e. it starts with '/', './', '../' or '?',
    // but it is not only '?', e.g. text of a help icon
    const regexpTextPath = /^(\.{0,2}\/|\?.)/;

    // Scheme-relative URL, e.g. '//example.org/page'
    const regexpSchemeRelative = /^\/\//;

    // Placeholder of the link handled by a script, e.g. '#' or '#!'
    const regexpHashPlaceholder = /^#!?$/;

    // Link text is the source of the new URL
    const isTextSource = attribute === 'text';

    // Link's own href is the source of the new URL
    const isHrefSource = attribute.toLowerCase() === '[href]';

    // URL parameter of the link's own href is the source of the new URL
    const isParamSource = attribute.startsWith('?');

    // Sanitized link may contain another URL to sanitize only if its value is taken from its own href,
    // i.e. nested redirect in the same URL parameter or base64 encoded one
    const canHaveNestedRedirects = isParamSource || (isHrefSource && isBase64DecodeTransform);

    // Selector to check whether the element is still matched by `selector`: `:scope` means the element itself
    // for `matches()`, but the root element for `document.querySelectorAll()`, i.e. `:root`,
    // while quoted strings, e.g. attribute values, are kept as is
    const matchesSelector = selector.replace(
        /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|:scope(?![\w-])/gi,
        (match, quoted) => quoted || ':root',
    );

    /**
     * Parses the URL in the same way as the link does, i.e. against the document base URL.
     *
     * @param url The URL to parse.
     * @param baseURL The base URL, defaults to the document base URL, or `null` to parse only an absolute URL.
     * @returns The parsed URL, or `null` if the URL is not valid.
     */
    const parseURL = (url: string, baseURL: string | null = document.baseURI): URL | null => {
        try {
            return baseURL === null ? new URL(url) : new URL(url, baseURL);
        } catch {
            return null;
        }
    };

    /**
     * Resolves the URL in the same way as the link does, i.e. against the document base URL.
     *
     * @param url The URL to resolve.
     * @param baseURL The base URL, defaults to the document base URL.
     * @returns The absolute URL, or `null` if the URL is not valid.
     */
    const resolveURL = (url: string, baseURL = document.baseURI): string | null => {
        const parsedURL = parseURL(url, baseURL);
        return parsedURL ? parsedURL.href : null;
    };

    /**
     * Gets the URL of the link resolved in the same way as the link does.
     * `href` property is not used, because for SVG `<a>` element it is not a string.
     *
     * @param anchor The link element.
     * @returns The absolute URL, or `href` attribute as is if it is not a valid URL.
     */
    const getLinkHref = (anchor: Element): string => {
        const href = anchor.getAttribute('href') || '';
        return resolveURL(href) || href;
    };

    /**
     * Removes whitespaces from the URL in the same way as the URL parser does.
     *
     * @param url The URL.
     * @returns The URL without leading and trailing whitespaces and control characters, and without tab
     * and newline characters.
     */
    const trimURL = (url: string): string => {
        return url.replace(regexpURLEdgeWhitespace, '').replace(regexpURLTabOrNewline, '');
    };

    /**
     * Extracts text from an element based on the specified attribute.
     *
     * @param anchor The element from which to extract the text.
     * @param attr The attribute indicating how to extract the text.
     * @returns The extracted text.
     */
    const extractNewHref = (anchor: Element, attr: string): string => {
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
                return getUrlParamValue(new URL(getLinkHref(anchor)), attr.slice(1));
            } catch (ex) {
                // empty value is logged by the caller only once, not on each DOM change
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
    const isValidURL = (url: string): boolean => parseURL(url, null) !== null;

    /**
     * Checks whether the URL is absolute, i.e. it is resolved to the same URL with and without the base URL,
     * e.g. 'https:page' is a valid URL without the base URL, but it is relative to the base URL with the same scheme.
     *
     * @param url The URL string to check.
     * @param resolvedURL The URL resolved against the document base URL.
     * @returns `true` if the string is an absolute URL, otherwise `false`.
     */
    const isAbsoluteURL = (url: string, resolvedURL: string): boolean => {
        const parsedURL = parseURL(url, null);
        return !!parsedURL && parsedURL.href === resolvedURL;
    };

    /**
     * Checks whether the protocol of the URL is allowed, i.e. HTTP or HTTPS.
     *
     * @param url The URL to check.
     * @returns `true` if the protocol is allowed, otherwise `false`.
     */
    const isAllowedProtocol = (url: URL): boolean => url.protocol === 'http:' || url.protocol === 'https:';

    /**
     * Gets the URL if its protocol is allowed, otherwise logs the protocol.
     *
     * @param url The URL to validate.
     * @returns The URL, or `null` if its protocol is not allowed.
     */
    const getValidHref = (url: URL): string | null => {
        if (!isAllowedProtocol(url)) {
            logMessage(source, `Protocol not allowed: "${url.protocol}", from URL: "${url.href}"`);
            return null;
        }
        return url.href;
    };

    /**
     * Checks if the given element is a sanitizable anchor element.
     *
     * @param element The element to check, HTML or SVG `<a>` element.
     * @returns True if the element is a sanitizable anchor element, false otherwise.
     */
    const isSanitizableAnchor = (element: Element): boolean => {
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
        // Not logged, since the value may contain other base64 strings, e.g. in other URL parameters,
        // and the failure to find URL in the whole value is logged by the caller
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
     * Removes the hash from the URL.
     * @param url URL to remove the hash from, it is changed in place
     */
    const removeHash = (url: URL): void => {
        // empty hash is kept, e.g. '/#' only scrolls the page, while '/' reloads it
        if (url.hash) {
            url.hash = '';
        }
    };

    /**
     * Removes the specified parameter from the URL.
     * @param url URL to remove the parameter from, it is changed in place
     * @param transformValue parameter value(s) to remove with marker
     */
    const removeParam = (url: URL, transformValue: string): void => {
        // get the parameter values to remove
        const paramNamesToRemoveStr = transformValue.split(MARKER_SEPARATOR)[1];

        if (!paramNamesToRemoveStr) {
            // empty query is removed as well, e.g. 'https://example.org/?'
            url.search = '';
            return;
        }

        const removeParams = paramNamesToRemoveStr.split(COMMA);
        removeParams.forEach((param) => {
            // query is serialized again on each deletion, so it is not changed if there is no such parameter
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
            }
        });
    };

    /**
     * Extracts the base64 part from a string.
     * If no base64 string is found, `null` is returned.
     * @param url String to extract the base64 part from.
     * @param canDecodeHashAfterQuery Whether the hash is decoded if the query has no base64 encoded URL.
     * @returns The base64 part of the string, or `null` if none is found.
     */
    const decodeBase64URL = (url: string, canDecodeHashAfterQuery: boolean) => {
        const { search, hash } = new URL(url, document.location.href);

        if (search.length > 0) {
            const decodedSearch = decodeSearchString(search);
            if (decodedSearch || !canDecodeHashAfterQuery) {
                return decodedSearch;
            }
        }

        // Hash is decoded if there is no query, or if it has no base64 encoded URL,
        // e.g. 'https://example.org/?ref=1#<base64>', see `canDecodeHashAfterQuery`
        if (hash.length > 0) {
            return decodeHashString(hash);
        }

        // failure to find URL in the whole value is logged by the caller
        return null;
    };

    /**
     * Decodes a base64 string from the given href.
     * If the href is a valid URL, the base64 string is decoded.
     * If the href is not a valid URL, the base64 string is decoded several times.
     * @param href The href to decode.
     * @param canDecodeHashAfterQuery Whether the hash of the URL is decoded if the query has no base64 encoded URL.
     * @returns The decoded base64 string.
     */
    const base64Decode = (href: string, canDecodeHashAfterQuery: boolean): string => {
        if (isValidURL(href)) {
            return decodeBase64URL(href, canDecodeHashAfterQuery) || '';
        }

        return decodeBase64SeveralTimes(href, DECODE_ATTEMPTS_NUMBER) || '';
    };

    /**
     * Creates the failure to sanitize the value and logs it.
     *
     * @param message The message to log, or empty string if nothing should be logged.
     * @param isBaseDependent Whether the failure depends on the document base URL, see `Failure`.
     * @returns The failure.
     */
    const fail = (message: string, isBaseDependent = false): Failure => {
        if (message) {
            logMessage(source, message);
        }
        return { isBaseDependent };
    };

    /**
     * Gets the new href from the value extracted from the link.
     *
     * @param linkHref The current URL of the link.
     * @param value The value extracted from the link.
     * @param isNested Whether the value is taken from href set by the rule, i.e. it is a nested redirect.
     * Then it is not logged that no value has been found, e.g. no parameter or nothing to decode,
     * since it means that there is nothing more to sanitize, while real failures, e.g. not allowed protocol,
     * are logged anyway.
     * @returns The new valid URL, the current URL of the link if it should be left as is, or the failure.
     */
    const getNewHref = (linkHref: string, value: string, isNested: boolean): string | Failure => {
        // Value of the nested redirect which is not a URL, e.g. parameter of the target with the same name,
        // means that there is nothing more to sanitize, so it is not logged, unlike e.g. not allowed protocol
        const notURLMessage = isNested ? '' : `Invalid URL: ${value}`;

        // Leading and trailing whitespaces and control characters, as well as tab and newline characters,
        // are removed by the URL parser, so the value of only them would be resolved to the document base URL
        const trimmedValue = trimURL(value);
        if (!trimmedValue) {
            return fail(isNested ? '' : `Failed to get value by "${attribute}" from ${linkHref}`);
        }

        if (isBase64DecodeTransform) {
            // Base64 string may contain whitespaces, which are ignored by decoding.
            // Decode the raw value first: resolving a bare base64 string would turn it into a page-relative URL.
            // For an in-page href, decode only its own hash, without inheriting the page query.
            let decodedHref: string;
            if (isHrefSource && trimmedValue.startsWith('#')) {
                decodedHref = regexpHashPlaceholder.test(trimmedValue) ? '' : decodeHashString(trimmedValue) || '';
            } else {
                // Hash of the nested redirect after the query without base64 encoded URL may be a part of the target,
                // e.g. its return URL, while the hash without query is decoded as a nested redirect
                decodedHref = base64Decode(value, !isNested);
                // A relative redirect URL, e.g. '/out?<base64>', needs resolving before its query can be decoded.
                if (!decodedHref && isHrefSource && !isValidURL(value)) {
                    decodedHref = base64Decode(linkHref, !isNested);
                }
            }
            if (!decodedHref) {
                // decoded value is empty, so the source value is logged
                return fail(isNested ? '' : `Failed to find URL by base64 decoding: ${value}`);
            }
            const decodedURL = parseURL(decodedHref);
            // Link which already points to the decoded URL is left as is without validation,
            // e.g. 'mailto:' link with the same encoded URL in the attribute
            if (decodedURL && decodedURL.href === linkHref) {
                return linkHref;
            }
            if (!decodedURL) {
                return fail(isNested ? '' : `Invalid URL: ${decodedHref}`);
            }
            return getValidHref(decodedURL) || fail(`Invalid URL: ${decodedHref}`);
        }

        // Visible text can contain prose or multiple text blocks. Explicit URL sources use the URL parser.
        if (isTextSource && (regexpWhitespace.test(trimmedValue) || regexpTextBlocks.test(value))) {
            return fail(notURLMessage);
        }

        // Value which cannot be resolved against the current base URL, e.g. relative one on 'data:' page,
        // may be resolved after the base URL is changed
        let newURL = parseURL(value);
        if (!newURL) {
            return fail(notURLMessage, true);
        }
        const isAbsolute = isAbsoluteURL(value, newURL.href);

        // Relative value of the nested redirect would be resolved by the redirect against its own URL,
        // not the document one, and it may be a parameter of the target, e.g. 'https://shop.example/?url=sale',
        // so only an absolute URL is followed, or a scheme-relative one, which is resolved against the redirect URL
        if (isNested && !isAbsolute) {
            const nestedURL = regexpSchemeRelative.test(trimmedValue) ? parseURL(value, linkHref) : null;
            if (!nestedURL) {
                return fail(notURLMessage);
            }
            newURL = nestedURL;
        }

        // Hash-only value, e.g. link within the page, has nothing to remove: it is resolved with the document
        // base URL, so remove transforms would remove its query or hash, and the link would lead to another page
        const isHashOnly = trimmedValue.startsWith('#');
        if (!isHashOnly) {
            if (isRemoveHashTransform) {
                removeHash(newURL);
            } else if (isRemoveParamTransform) {
                removeParam(newURL, transform);
            }
        }

        // Link which already points to the new URL is left as is without validation,
        // e.g. 'mailto:' link matched by a broad selector, which has nothing to remove,
        // or link within the page with the same text
        if (newURL.href === linkHref) {
            return linkHref;
        }

        // Placeholder of the link handled by a script, e.g. '#', is not a URL to sanitize,
        // and link text is a URL only if it is an absolute URL or a path,
        // e.g. not 'Download', 'www.example.com' or '#tag', which would be resolved as a relative URL
        const isTextNotURL = isTextSource && !regexpTextPath.test(trimmedValue) && !isAbsolute;
        if ((!isHrefSource && regexpHashPlaceholder.test(trimmedValue)) || isTextNotURL) {
            return fail(notURLMessage);
        }

        // Relative value is resolved against the document base URL, so the failure depends on it
        return getValidHref(newURL) || fail(`Invalid URL: ${value}`, !isAbsolute);
    };

    /**
     * Sanitizes the href attribute of the link once.
     *
     * @param anchor The link element.
     * @param linkHref The current URL of the link.
     * @param value The value extracted from the link.
     * @param isNested Whether the value is a nested redirect, see `getNewHref`.
     * @returns `true` if href has been changed, `false` if the link is left as is, or the failure.
     */
    const sanitizeLink = (anchor: Element, linkHref: string, value: string, isNested: boolean): boolean | Failure => {
        try {
            const newValidHref = getNewHref(linkHref, value, isNested);
            if (typeof newValidHref !== 'string') {
                return newValidHref;
            }

            // Compare with the resolved URL, so that relative href pointing to the same URL is not rewritten.
            // Do not re-set the same URL, because even such mutation wakes up observers of other rules,
            // and they may re-trigger each other infinitely
            if (linkHref === newValidHref) {
                return false;
            }

            const previousWrite = getScriptletWrite(anchor);
            // Continue the same chain only when transforming an href actually written by a scriptlet.
            // A page edit or a new external source (text/attribute) starts a new redirect chain.
            const write = (isHrefSource || isParamSource) && previousWrite?.href === anchor.getAttribute('href')
                ? previousWrite
                : { href: newValidHref };
            anchor.setAttribute('href', newValidHref);
            write.href = newValidHref;
            Object.defineProperty(anchor, writesKey, {
                value: write,
                configurable: true,
            });
            // original URL is logged
            logMessage(source, `Sanitized "${linkHref}" to "${newValidHref}".`);
            return true;
        } catch (ex) {
            return fail(`Failed to sanitize ${linkHref}.`);
        }
    };

    /**
     * Maximum number of nested redirects which are sanitized at once,
     * more nested redirects are sanitized in a scheduled continuation.
     */
    const MAX_NESTED_REDIRECTS = 10;

    /**
     * States of processed links, by their elements, see `isStateUnchanged`.
     * Such link is not processed again until its state is changed, since it has been already sanitized,
     * left as is, or it has failed to be sanitized, which has been logged, so the same failure is not logged
     * on each DOM change.
     */
    const linkStates = new WeakMap<Element, LinkState>();

    /**
     * Write records set by the rule, by their elements, if the value is taken from their own href,
     * see `canHaveNestedRedirects` and `sanitizeStep`.
     */
    const sanitizedWrites = new WeakMap<Element, ScriptletWrite>();

    /**
     * Elements which have already been logged as not sanitizable.
     */
    const loggedInvalidElements = new WeakSet<Element>();

    /**
     * Elements whose processing has thrown an error, which has already been logged.
     */
    const loggedFailedElements = new WeakSet<Element>();

    /**
     * Processes the element, so that its error, e.g. caused by the page, does not stop processing
     * of other elements or reconnecting the DOM observer. The error is logged only once for the element.
     *
     * @param elem The element to process.
     * @param process The function which processes the element.
     */
    const processSafely = (elem: Element, process: () => void): void => {
        try {
            process();
        } catch {
            if (!loggedFailedElements.has(elem)) {
                loggedFailedElements.add(elem);
                logMessage(source, `Failed to sanitize ${elem}.`);
            }
        }
    };

    /**
     * Whether sanitizing of links with more nested redirects than the limit is scheduled, see `sanitize`.
     */
    let isSanitizeScheduled = false;

    /**
     * Gets the document base URL without hash, since the hash does not affect resolving of a URL,
     * while it is changed often, e.g. by the page routing.
     *
     * @returns The document base URL without hash.
     */
    const getBaseURLWithoutHash = (): string => document.baseURI.split('#')[0];

    /**
     * Checks whether the URL is resolved to the same URL against both base URLs.
     *
     * @param url The URL to resolve.
     * @param oldBaseURL The previous document base URL without hash.
     * @param baseURL The current document base URL without hash.
     * @returns `true` if the resolved URL is the same, including the case when it cannot be resolved at all.
     */
    const isResolvedTheSame = (url: string, oldBaseURL: string, baseURL: string): boolean => {
        return resolveURL(url, oldBaseURL) === resolveURL(url, baseURL);
    };

    /**
     * Checks whether the link has been processed, and it is not changed since then.
     * Failures are retried when the source value, href, redirect chain or base-dependent resolution changes.
     * Successful rules also accept href written by another href-sanitizer rule on top of the write seen
     * by the rule, provided their own source value is unchanged, so dependent rules do not re-set href
     * infinitely. The write is compared by identity, since another rule which changes a page edit starts
     * a new write, even if its href is the same, and the page edit has to be corrected then.
     * URLs are resolved only if the base URL has been changed, e.g. by the page routing.
     * Link sanitized by 'base64decode' is processed again on each base URL change, since the decoded URL
     * may be relative to it, e.g. 'https:page', which is known only after decoding.
     *
     * @param state The state of the processed link.
     * @param anchor The link element.
     * @param value The value extracted from the link.
     * @param baseURL The document base URL without hash.
     * @returns `true` if the link has been processed and not changed since then.
     */
    const isStateUnchanged = (state: LinkState, anchor: Element, value: string, baseURL: string): boolean => {
        if (state.value !== value) {
            return false;
        }
        const href = anchor.getAttribute('href') || '';
        const write = getScriptletWrite(anchor);
        const isContinuedWrite = !!write && write === state.write && write.href === href;
        if (href !== state.href && (state.failure || !isContinuedWrite)) {
            return false;
        }
        if (state.failure) {
            const previousWrite = sanitizedWrites.get(anchor);
            if (previousWrite && previousWrite !== getScriptletWrite(anchor)) {
                return false;
            }
            return !state.failure.isBaseDependent
                || state.baseURL === baseURL
                || isResolvedTheSame(value, state.baseURL, baseURL);
        }
        if (state.baseURL === baseURL) {
            return true;
        }
        return !isBase64DecodeTransform
            && isResolvedTheSame(href, state.baseURL, baseURL)
            // empty value is not resolved, since it means that there is nothing to sanitize,
            // e.g. the link sanitized by '?param'
            && (!value || isResolvedTheSame(value, state.baseURL, baseURL));
    };

    /**
     * Sanitizes the link once and saves the result.
     *
     * @param anchor The link element.
     * @param value The value extracted from the link.
     * @param baseURL The document base URL without hash.
     * @returns Whether href has been changed, and the value extracted from the changed href
     * if it may contain a nested redirect, otherwise empty string.
     */
    const sanitizeStep = (
        anchor: Element,
        value: string,
        baseURL: string,
    ): { isChanged: boolean; nestedValue: string } => {
        const linkHref = getLinkHref(anchor);
        const previousWrite = sanitizedWrites.get(anchor);
        const currentWrite = getScriptletWrite(anchor);
        // Continue a redirect previously sanitized by this rule, including actual writes by cooperating rules.
        // A different href written by the page starts a new redirect, even if its extracted value is unchanged.
        const isNested = !!previousWrite
            && previousWrite === currentWrite
            && currentWrite.href === anchor.getAttribute('href');
        if (!isNested) {
            sanitizedWrites.delete(anchor);
        }

        const result = sanitizeLink(anchor, linkHref, value, isNested);
        const href = anchor.getAttribute('href') || '';
        if (typeof result !== 'boolean') {
            // Failure of the link sanitized by the rule is saved as well, so that it is not logged again,
            // e.g. not allowed protocol of the nested redirect
            linkStates.set(anchor, {
                href,
                value,
                baseURL,
                failure: result,
                write: getScriptletWrite(anchor),
            });
            return { isChanged: false, nestedValue: '' };
        }

        const newValue = result ? extractNewHref(anchor, attribute) : value;
        if (result && canHaveNestedRedirects) {
            sanitizedWrites.set(anchor, getScriptletWrite(anchor)!);
            if (newValue) {
                // state saved before the link has been changed must not match the link after that
                linkStates.delete(anchor);
                return { isChanged: true, nestedValue: newValue };
            }
        }
        linkStates.set(anchor, {
            href,
            value: newValue,
            baseURL,
            failure: null,
            write: getScriptletWrite(anchor),
        });
        return { isChanged: result, nestedValue: '' };
    };

    /**
     * Sanitizes the href attribute of elements matching the given selector.
     *
     * @param elementSelector The CSS selector to match the elements.
     */
    const sanitize = (elementSelector: string): void => {
        const baseURL = getBaseURLWithoutHash();
        let isChanged = false;
        // Links changed by the previous step, which may contain nested redirects, with their new values
        let nestedValues = new Map<Element, string>();

        /**
         * Sanitizes the link once, see `sanitizeStep`, and collects its nested redirect.
         *
         * @param anchor The link element.
         * @param value The value extracted from the link.
         */
        const sanitizeOnce = (anchor: Element, value: string): void => {
            const result = sanitizeStep(anchor, value, baseURL);
            isChanged = isChanged || result.isChanged;
            if (result.nestedValue) {
                nestedValues.set(anchor, result.nestedValue);
            }
        };

        // selector is validated before
        document.querySelectorAll(elementSelector).forEach((elem) => processSafely(elem, () => {
            if (!isSanitizableAnchor(elem)) {
                // Element is checked on each DOM change, since it may become sanitizable, e.g. if href is added,
                // but it is logged only once
                if (!loggedInvalidElements.has(elem)) {
                    loggedInvalidElements.add(elem);
                    logMessage(source, `${elem} is not a valid element to sanitize`);
                }
                return;
            }

            const value = extractNewHref(elem, attribute);
            const state = linkStates.get(elem);
            if (state && isStateUnchanged(state, elem, value, baseURL)) {
                // so that URLs are not resolved again on each DOM change until href or the base URL is changed
                state.href = elem.getAttribute('href') || '';
                state.baseURL = baseURL;
                return;
            }

            sanitizeOnce(elem, value);
        }));

        // Nested redirects, e.g. 'tracker?url=tracker?url=target' or base64 encoded ones, are sanitized at once,
        // since mutations made by the rule do not wake up its observer, but only while the link is still matched
        // by the selector, so that the target is not changed, see `matchesSelector`.
        // Link with more nested redirects than the limit, or not matched by the selector anymore, is not saved
        // as processed, so it is sanitized further on the next run, or when it is matched again
        for (let i = 1; i < MAX_NESTED_REDIRECTS && nestedValues.size > 0; i += 1) {
            const currentValues = nestedValues;
            nestedValues = new Map();
            currentValues.forEach((value, elem) => processSafely(elem, () => {
                if (elem.matches(matchesSelector)) {
                    sanitizeOnce(elem, value);
                }
            }));
        }

        // Link with more nested redirects than the limit is sanitized further after the current task,
        // since there may be no DOM change, e.g. on a static page; each run shortens the link, so it is finite
        if (nestedValues.size > 0 && !isSanitizeScheduled) {
            isSanitizeScheduled = true;
            setTimeout(() => {
                isSanitizeScheduled = false;
                sanitize(elementSelector);
            }, 0);
        }

        // Call hit only on actual change, otherwise idle observer would log on each unrelated mutation
        if (isChanged) {
            hit(source);
        }
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

// eslint-disable-next-line prefer-destructuring
hrefSanitizer.primaryName = hrefSanitizerNames[0];

hrefSanitizer.injections = [
    observeDOMChanges,
    hit,
    logMessage,
    isValidSelector,
    getUrlParamValue,
    // following helpers should be imported and injected
    // because they are used by helpers above
    throttle,
];
