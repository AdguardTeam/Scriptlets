import {
    hit,
    logMessage,
    toRegExp,
    parseMatchArg,
} from '../helpers';
import { type Source } from './scriptlets';

/**
 * @scriptlet prevent-innerHTML
 *
 * @description
 * Conditionally prevents assignment to `innerHTML` property
 * and can replace the value returned by the getter.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#prevent-innerhtmljs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-innerHTML'[, selector[, pattern[, replacement]]])
 * ```
 *
 * - `selector` — optional, CSS selector to match element. If not specified, matches all elements.
 * - `pattern` — optional, string or regular expression to match against the assigned/returned value.
 *   Prepend with `!` to invert the match. If not specified, matches all values.
 * - `replacement` — optional, replacement value to return from getter when pattern matches.
 *   If not specified, the getter returns the original value unchanged (setter-only mode).
 *   If specified, enables getter manipulation mode. Possible values:
 *     - empty string — `''`,
 *     - custom text.
 *
 * ### Examples
 *
 * 1. Prevent any `innerHTML` assignment
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML')
 *     ```
 *
 * 1. Prevent `innerHTML` assignment on elements matching selector
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', '#ads')
 *     ```
 *
 * 1. Prevent `innerHTML` assignment when the value contains "ad"
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', '', 'ad')
 *     ```
 *
 * 1. Prevent `innerHTML` assignment on specific element when value matches regex
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', 'div.ads', '/banner|sponsor/')
 *     ```
 *
 * 1. Prevent `innerHTML` assignment when value does NOT match pattern (inverted match)
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', '', '!allowed-content')
 *     ```
 *
 * 1. Replace innerHTML getter value with empty string when it contains "delete window"
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', '', 'delete window', '')
 *     ```
 *
 * 1. Replace innerHTML getter value with custom text when pattern matches
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-innerHTML', 'div.code', '/evil-script/', 'safe-replacement')
 *     ```
 *
 * @added v2.2.14.
 */
export function preventInnerHTML(source: Source, selector = '', pattern = '', replacement?: string): void {
    const { isInvertedMatch, matchRegexp } = parseMatchArg(pattern);

    const nativeDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (nativeDescriptor === undefined) {
        return;
    }

    /**
     * Determines whether the innerHTML assignment should be prevented.
     *
     * @param element Element being assigned to.
     * @param value Value being assigned.
     *
     * @returns True if assignment should be prevented.
     */
    const shouldPrevent = (element: Element, value: string): boolean => {
        if (selector !== '') {
            if (typeof element.matches !== 'function') {
                return false;
            }

            try {
                if (element.matches(selector) === false) {
                    return false;
                }
            } catch (e) {
                // Invalid selector, do not prevent
                logMessage(source, `prevent-innerHTML: invalid selector "${selector}"`, true);
                return false;
            }
        }

        const patternMatches = matchRegexp.test(String(value));

        return isInvertedMatch ? !patternMatches : patternMatches;
    };

    Object.defineProperty(Element.prototype, 'innerHTML', {
        configurable: true,
        enumerable: true,
        get() {
            const value = nativeDescriptor.get
                ? nativeDescriptor.get.call(this)
                : nativeDescriptor.value;

            // If replacement is specified, check if we should replace the getter value
            if (replacement !== undefined && shouldPrevent(this, value)) {
                hit(source);
                logMessage(source, 'Replaced innerHTML getter value');
                return replacement;
            }

            return value;
        },
        set(value: string) {
            if (shouldPrevent(this, value)) {
                hit(source);
                logMessage(source, 'Prevented innerHTML assignment');
                return;
            }

            if (nativeDescriptor.set) {
                nativeDescriptor.set.call(this, value);
            }
        },
    });
}

export const preventInnerHTMLNames = [
    'prevent-innerHTML',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'prevent-innerHTML.js',
    'ubo-prevent-innerHTML.js',
    'ubo-prevent-innerHTML',
];

// eslint-disable-next-line prefer-destructuring
preventInnerHTML.primaryName = preventInnerHTMLNames[0];

preventInnerHTML.injections = [
    hit,
    logMessage,
    toRegExp,
    parseMatchArg,
];
