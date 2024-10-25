import {
    hit,
    logMessage,
    observeDocumentWithTimeout,
    nativeIsNaN,
    parseAttributePairs,
    getErrorMessage,
} from '../helpers/index';

import type { ParsedAttributePair } from '../helpers/attribute-utils';
import { Source } from '../../types/types';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-create-element
 *
 * @description
 * Creates an element with specified attributes and text content, and appends it to the specified parent element.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.com#%#//scriptlet('trusted-create-element', parentSelector, tagName[, attributePairs[, textContent[, cleanupDelayMs]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `parentSelector` — required, CSS selector of the parent element to append the created element to.
 * - `tagName` — required, tag name of the created element.
 * - `attributePairs` — optional, space-separated list of attribute name and value pairs separated by `=`.
 *   Value can be omitted. If value is set, it should be wrapped in quotes.
 *   If quotes are needed inside value, they should be escaped with backslash.
 *   Defaults to no attributes.
 * - `textContent` — optional, text content of the created element. Defaults to empty string.
 * - `cleanupDelayMs` — optional, delay in milliseconds before the created element is removed from the DOM.
 *   Defaults to no cleanup.
 *
 * ### Examples
 *
 * 1. Create a div element with a single attribute
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-create-element', 'body', 'div', 'data-cur="1"')
 *     ```
 *
 * 1. Create a div element with text content
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-create-element', 'body', 'div', '', 'Hello world!')
 *     ```
 *
 * 1. Create a button element with multiple attributes, including attribute without value, and text content
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-create-element', 'body', 'button', 'disabled aria-hidden="true" style="width: 0px"', 'Press here')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Create a button element with an attribute whose value contains quotes
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-create-element', 'body', 'button', 'data="a\\"quote"')
 *     ```
 *
 * 1. Create a paragraph element with text content and remove it after 5 seconds
 *
 *     ```adblock
 *     example.com#%#//scriptlet('trusted-create-element', '.container > article', 'p', '', 'Hello world!', '5000')
 *     ```
 *
 * @added v1.10.1.
 */
/* eslint-enable max-len */
export function trustedCreateElement(
    source: Source,
    parentSelector: string,
    tagName: string,
    attributePairs = '',
    textContent = '',
    cleanupDelayMs = NaN,
) {
    if (!parentSelector || !tagName) {
        return;
    }

    /**
     * Prevent infinite loops when creating iframes
     * because scriptlet is automatically injected into the newly created iframe.
     */
    const IFRAME_WINDOW_NAME = 'trusted-create-element-window';
    if (window.name === IFRAME_WINDOW_NAME) {
        return;
    }

    const logError = (prefix: string, error: unknown) => {
        logMessage(source, `${prefix} due to ${getErrorMessage(error)}`);
    };

    let element: HTMLElement;
    try {
        element = document.createElement(tagName);
        element.textContent = textContent;
    } catch (e) {
        logError(`Cannot create element with tag name '${tagName}'`, e);
        return;
    }

    let attributes: ParsedAttributePair[] = [];

    try {
        attributes = parseAttributePairs(attributePairs);
    } catch (e) {
        logError(`Cannot parse attributePairs param: '${attributePairs}'`, e);
        return;
    }

    attributes.forEach((attr) => {
        try {
            element.setAttribute(attr.name, attr.value);
        } catch (e) {
            logError(`Cannot set attribute '${attr.name}' with value '${attr.value}'`, e);
        }
    });

    let timerId: ReturnType<typeof setTimeout>;

    let elementCreated = false;
    let elementRemoved = false;

    /**
     * Finds parent element by `parentElSelector` and appends the `el` element to it.
     *
     * If `removeElDelayMs` is not `NaN`,
     * schedules the `el` element to be removed after `removeElDelayMs` milliseconds.
     *
     * @param parentElSelector CSS selector of the parent element.
     * @param el HTML element to append to the parent element.
     * @param removeElDelayMs Delay in milliseconds after which the `el` element is removed from the DOM.
     *
     * @returns True if the `el` element was successfully appended to the parent element, otherwise false.
     */
    const findParentAndAppendEl = (parentElSelector: string, el: HTMLElement, removeElDelayMs: number) => {
        let parentEl;
        try {
            parentEl = document.querySelector(parentElSelector);
        } catch (e) {
            logError(`Cannot find parent element by selector '${parentElSelector}'`, e);
            return false;
        }

        if (!parentEl) {
            logMessage(source, `No parent element found by selector: '${parentElSelector}'`);
            return false;
        }

        try {
            if (!parentEl.contains(el)) {
                parentEl.append(el);
            }
            if (el instanceof HTMLIFrameElement && el.contentWindow) {
                el.contentWindow.name = IFRAME_WINDOW_NAME;
            }
            elementCreated = true;
            hit(source);
        } catch (e) {
            logError(`Cannot append child to parent by selector '${parentElSelector}'`, e);
            return false;
        }

        if (!nativeIsNaN(removeElDelayMs)) {
            timerId = setTimeout(() => {
                el.remove();
                elementRemoved = true;
                clearTimeout(timerId);
            }, removeElDelayMs);
        }

        return true;
    };

    if (!findParentAndAppendEl(parentSelector, element, cleanupDelayMs)) {
        observeDocumentWithTimeout((mutations, observer) => {
            if (elementRemoved || elementCreated || findParentAndAppendEl(parentSelector, element, cleanupDelayMs)) {
                observer.disconnect();
            }
        });
    }
}

export const trustedCreateElementNames =[
    'trusted-create-element',
    // trusted scriptlets support no aliases
];

trustedCreateElement.injections = [
    hit,
    logMessage,
    observeDocumentWithTimeout,
    nativeIsNaN,
    parseAttributePairs,
    getErrorMessage,
];
