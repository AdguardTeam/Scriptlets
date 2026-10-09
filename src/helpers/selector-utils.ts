/**
 * Checks whether the given string is a valid CSS selector.
 * Selector is matched against an empty document fragment,
 * so the check does not traverse the page DOM.
 *
 * @param selector CSS selector to check.
 *
 * @returns True if the selector is valid, false otherwise.
 */
export const isValidSelector = (selector: string): boolean => {
    try {
        document.createDocumentFragment().querySelector(selector);
        return true;
    } catch {
        return false;
    }
};

/**
 * Checks whether the selector is empty, i.e. has only whitespaces and CSS comments,
 * e.g. a part of the selectors list after a trailing comma, or a commented out selector.
 *
 * @param selector Selector to check, e.g. a part of the list split by `splitSelectors()`.
 *
 * @returns True if the selector is empty, false otherwise.
 */
export const isEmptySelector = (selector: string): boolean => {
    // Unclosed comment lasts till the end of the selector
    const CSS_COMMENT_REGEXP = /\/\*[\s\S]*?(?:\*\/|$)/g;
    return selector.replace(CSS_COMMENT_REGEXP, '').trim() === '';
};

/**
 * Splits the string of selectors by the delimiter, e.g. comma or ` >>> ` combinator.
 * Delimiters are skipped if they are:
 * - inside `xpath(...)`, e.g. `xpath(//button[contains(text(), "Accept")])`;
 * - inside parentheses or square brackets of CSS selector, e.g. `:is(.accept, .agree)`;
 * - inside quoted strings, e.g. `[title="Accept, agree"]`;
 * - escaped in CSS selector, e.g. `#accept\,agree`;
 * - inside CSS comments, which start with `/*`.
 *
 * @param selectors String of CSS selectors and XPath expressions wrapped in `xpath(...)`.
 * @param delimiter Delimiter to split the string by.
 *
 * @returns Trimmed parts of the string.
 */
export const splitSelectors = (selectors: string, delimiter: string): string[] => {
    const XPATH_MARKER = 'xpath(';
    // `xpath(` starts an expression only at the beginning of a selector,
    // i.e. at the start of the string, after a comma or a whitespace
    const XPATH_START_PRECEDING_REGEXP = /[\s,]/;
    const CSS_COMMENT_START = '/*';
    const CSS_COMMENT_END = '*/';

    /**
     * Returns index after the end of the string literal which starts at the given index.
     *
     * @param start Index of the opening quote.
     * @param isEscapable Whether a backslash escapes the next character, as in CSS strings;
     * XPath string literals have no escape sequences, so a literal ends with the next same quote.
     *
     * @returns Index after the closing quote, or after the end of the string if the literal is not closed.
     */
    const skipStringLiteral = (start: number, isEscapable: boolean): number => {
        const quote = selectors[start];
        let i = start + 1;
        while (i < selectors.length && selectors[i] !== quote) {
            i += isEscapable && selectors[i] === '\\' ? 2 : 1;
        }
        return i + 1;
    };

    const parts: string[] = [];
    let partStart = 0;
    // Depth of parentheses inside `xpath(...)`, 0 outside of it
    let xpathDepth = 0;
    // Depth of parentheses and square brackets of CSS selector, e.g. `:is(...)` or `[...]`
    let cssDepth = 0;
    let i = 0;
    while (i < selectors.length) {
        const char = selectors[i];
        const isXpath = xpathDepth > 0;

        // Characters of CSS comment have no special meaning, e.g. `(` in `#accept/*(*/`.
        // XPath has no comments, and `/*` is its path step, e.g. in `//div/*`
        if (!isXpath && selectors.startsWith(CSS_COMMENT_START, i)) {
            const commentEnd = selectors.indexOf(CSS_COMMENT_END, i + CSS_COMMENT_START.length);
            i = commentEnd === -1 ? selectors.length : commentEnd + CSS_COMMENT_END.length;
            continue;
        }

        if (char === '"' || char === '\'') {
            i = skipStringLiteral(i, !isXpath);
            continue;
        }

        if (isXpath) {
            if (char === '(') {
                xpathDepth += 1;
            } else if (char === ')') {
                xpathDepth -= 1;
            }
            i += 1;
            continue;
        }

        if (char === '\\') {
            // Escaped character of CSS selector, e.g. comma in `#accept\,agree`
            i += 2;
            continue;
        }

        if (char === '(' || char === '[') {
            cssDepth += 1;
        } else if (char === ')' || char === ']') {
            cssDepth -= 1;
        } else if (cssDepth === 0 && selectors.startsWith(delimiter, i)) {
            parts.push(selectors.slice(partStart, i).trim());
            i += delimiter.length;
            partStart = i;
            continue;
        } else if (
            cssDepth === 0
            && selectors.startsWith(XPATH_MARKER, i)
            && (i === 0 || XPATH_START_PRECEDING_REGEXP.test(selectors[i - 1]))
        ) {
            xpathDepth = 1;
            i += XPATH_MARKER.length;
            continue;
        }

        i += 1;
    }
    parts.push(selectors.slice(partStart).trim());

    return parts;
};
