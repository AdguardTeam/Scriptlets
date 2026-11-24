/**
 * Returns the elements matching a selector as `Kameleoon.API.Utils.querySelectorAll()` of the Kameleoon engine,
 * which `Core.runWhenElementPresent()` uses as well: the selector may contain `:eq(<index>)`
 * and `:contains("<text>")` of jQuery.
 *
 * The engine handles them with string operations rather than a parser, and its results are reproduced here,
 * as pages use the selectors which work with the engine, e.g.:
 * - the indexes of `:eq()` are all the numbers in the selector, e.g. `h2:eq(0)` is the third `h2`;
 * - `:eq()` selects in the elements matched by the part of the selector before it, and the next part
 *   is matched in the descendants of the selected element, also after `>`; the elements selected at last
 *   are returned in the order of the document if they match the selector without `:eq()` in the document;
 * - one `:contains()` is supported, the text must be quoted, and it filters the elements matched
 *   by the selector without it, wherever it is, e.g. `div:contains("x") span` gives the spans
 *   which contain `x`;
 * - unquoted values of attributes are quoted, e.g. `[data-name=a b]`, and an id which starts
 *   with a digit is escaped if it is at the start of the selector, e.g. `#1a`.
 *
 * The engine throws for some selectors, e.g. an unquoted text of `:contains()`, an invalid selector
 * with `:eq()`, or an attribute without a value before one with a value, e.g. `[a][b=c]`,
 * and recurses infinitely for `:eq` which is not followed by a number, e.g. `[title=":eq"]`;
 * an empty array is returned for them instead, as for an invalid selector without `:eq()`.
 * For all of them, and for an invalid selector, `onError` is called, so that the caller can tell them
 * from a selector which matches nothing yet, as `runWhenElementPresent()` of the engine stops then.
 *
 * @param selector CSS selector, which may contain `:eq()` and `:contains()`.
 * @param root Element, document or shadow root to query, the document if it is `null` or `undefined`.
 * @param onError Function called if the selector is invalid or not supported, e.g. if the engine throws for it.
 * @returns Matching elements, or an empty array if there are none or the selector is not supported.
 */
export function queryKameleoonSelector(selector: unknown, root?: unknown, onError?: () => void): Element[] {
    const doc = window.document;
    const reportError = () => {
        if (typeof onError === 'function') {
            onError();
        }
    };

    /**
     * Returns the elements matching a selector, as `Kameleoon.Utils.querySelectorAll()` of the engine,
     * and is called recursively for `:eq()`. Where the engine throws, it throws as well or returns
     * an empty array, which empties the result of the selector with `:eq()` as well.
     *
     * @param value Selector.
     * @param base Root to query.
     * @returns Matching elements.
     */
    const query = (value: string, base: any): Element[] => {
        let current = value;
        const container = base === null || base === undefined ? doc : base;
        let containedText: string | null = null;
        let found: ArrayLike<Element> = [];
        const result: Element[] = [];
        if (/#([0-9]+.*)(?: |$)/.test(current)) {
            // the engine escapes the character after the first one, which is the digit of an id only
            // if the selector starts with it
            const second = current.charAt(1);
            current = current.replace(`#${second}`, `#\\3${second} `);
        }
        if (current === '') {
            return result;
        }
        if (current.indexOf('[') !== -1 && current.indexOf("']") === -1 && current.indexOf('"]') === -1) {
            current.split(/(?=\.)|(?=#)|(?=\[)/).forEach((part) => {
                if (
                    part.charAt(0) === '['
                    && part.indexOf("']") === -1
                    && current.indexOf('"]') === -1
                    && current.indexOf('=') !== -1
                ) {
                    const pair = part.split(/=(.+)?/);
                    // throws, as the engine, if this attribute has no value
                    const attributeValue = pair[1].substring(0, pair[1].length - 1);
                    current = current.replace(part, `${pair[0]}='${attributeValue}']`);
                }
            });
        }
        if (current.indexOf(':contains') !== -1) {
            const match = current.match(/:contains\(['"]([\s\S]+)['"]\)/);
            if (!match) {
                // the engine throws for an unquoted text
                reportError();
                return result;
            }
            containedText = match[1];
            current = current.replace(match[0], '');
            if (current === '') {
                current = '*';
            }
        }
        if (container && container.querySelectorAll) {
            if (current.indexOf(':eq') !== -1) {
                const parts = current.split(/:eq\([0-9]+\)/g);
                const indexes = current.match(/(?!:eq\()[0-9]+/g) || [];
                let selected = container;
                for (let i = 0; i < parts.length; i += 1) {
                    parts[i] = parts[i].trim();
                    if (parts[i].charAt(0) === '>') {
                        parts[i] = parts[i].substring(1).trim();
                    }
                    if (selected === null || selected === undefined || parts[i] === '') {
                        break;
                    }
                    // a syntax error is thrown, as by the engine
                    selected = i > indexes.length - 1
                        ? selected.querySelectorAll(parts[i])
                        : selected.querySelectorAll(parts[i])[indexes[i]];
                }
                if (selected === null || selected === undefined) {
                    return result;
                }
                if (selected.length === undefined || selected.length === null) {
                    selected = [selected];
                }
                const withoutEq = current.replace(/:eq\([0-9]+\)/g, '');
                if (withoutEq === current) {
                    // the engine would call itself with the same selector infinitely
                    reportError();
                    return result;
                }
                const all = query(withoutEq, doc);
                const filtered: Element[] = [];
                for (let i = 0; i < all.length; i += 1) {
                    for (let j = 0; j < selected.length; j += 1) {
                        if (all[i] === selected[j]) {
                            filtered.push(selected[j]);
                            break;
                        }
                    }
                }
                found = filtered;
            } else {
                try {
                    found = container.querySelectorAll(current);
                } catch (e) {
                    // as `querySelectorAllHasError` of the engine
                    reportError();
                    found = [];
                }
            }
        }
        for (let i = 0; i < found.length; i += 1) {
            const element = found[i];
            if (containedText === null) {
                result.push(element);
            } else if (element.textContent && element.textContent.indexOf(containedText) !== -1) {
                result.push(element);
            }
        }
        return result;
    };

    if (typeof selector !== 'string') {
        // the engine throws for it
        reportError();
        return [];
    }
    try {
        return query(selector, root);
    } catch (e) {
        reportError();
        return [];
    }
}
