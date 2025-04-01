import {
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
    logMessage,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-addEventListener
 *
 * @description
 * Prevents adding event listeners for the specified events and callbacks.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-defuserjs-
 *
 * Related ABP snippet:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/prevent-listener.js
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('prevent-addEventListener'[, typeSearch[, listenerSearch[, additionalArgName, additionalArgValue]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `typeSearch` — optional, string or regular expression matching the type (event name);
 *   defaults to match all types; invalid regular expression will cause exit and rule will not work
 * - `listenerSearch` — optional, string or regular expression matching the listener function body;
 *   defaults to match all listeners; invalid regular expression will cause exit and rule will not work
 * - `additionalArgName` — optional, string, name of the additional argument to match;
 *   currently only `elements` is supported;
 * - `additionalArgValue` — optional, value corresponding to the additional argument name;
 *   for `elements` it can be a CSS selector or one of the following values:
 *     - `window`
 *     - `document`
 *
 * ### Examples
 *
 * 1. Prevent all `click` listeners
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-addEventListener', 'click')
 *     ```
 *
 * 1. Prevent 'click' listeners with the callback body containing `searchString`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-addEventListener', 'click', 'searchString')
 *     ```
 *
 *     For instance, this listener will not be called:
 *
 *     ```javascript
 *     el.addEventListener('click', () => {
 *         window.test = 'searchString';
 *     });
 *     ```
 *
 * 1. Prevent 'click' listeners with the callback body containing `foo` and only if the element has the class `bar`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-addEventListener', 'click', 'foo', 'elements', '.bar')
 *     ```
 *
 *     For instance, this listener will not be called:
 *
 *     ```javascript
 *     const el = document.querySelector('.bar');
 *     el.addEventListener('click', () => {
 *         window.test = 'foo';
 *     });
 *     ```
 *
 *     This listener will be called:
 *
 *     ```javascript
 *     const el = document.querySelector('.xyz');
 *     el.addEventListener('click', () => {
 *         window.test = 'foo';
 *     });
 *     ```
 *
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function preventAddEventListener(source, typeSearch, listenerSearch, additionalArgName, additionalArgValue) {
    const typeSearchRegexp = toRegExp(typeSearch);
    const listenerSearchRegexp = toRegExp(listenerSearch);

    let elementToMatch;
    if (additionalArgName) {
        if (additionalArgName !== 'elements') {
            logMessage(source, `Invalid "additionalArgName": ${additionalArgName}\nOnly "elements" is supported.`);
            return;
        }

        if (!additionalArgValue) {
            logMessage(source, '"additionalArgValue" is required.');
            return;
        }

        elementToMatch = additionalArgValue;
    }

    /**
     * Checks if an element matches the specified selector or element type.
     *
     * @param {any} element - The element to check
     * @returns {boolean}
     */
    const elementMatches = (element) => {
        // If elementToMatch is undefined, it means that the scriptlet was called without the `elements` argument
        // so it should match all elements
        if (elementToMatch === undefined) {
            return true;
        }
        if (elementToMatch === 'window') {
            return element === window;
        }
        if (elementToMatch === 'document') {
            return element === document;
        }
        if (element && element.matches && element.matches(elementToMatch)) {
            return true;
        }
        return false;
    };

    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(type, listener, ...args) {
        let shouldPrevent = false;
        if (validateType(type) && validateListener(listener)) {
            shouldPrevent = typeSearchRegexp.test(type.toString())
                && listenerSearchRegexp.test(listenerToString(listener))
                && elementMatches(this);
        }

        if (shouldPrevent) {
            hit(source);
            return undefined;
        }

        // Avoid illegal invocations due to lost context
        // https://github.com/AdguardTeam/Scriptlets/issues/271
        let context = this;
        if (this && this.constructor?.name === 'Window' && this !== window) {
            context = window;
        }
        return nativeAddEventListener.apply(context, [type, listener, ...args]);
    }

    const descriptor = {
        configurable: true,
        set: () => {},
        get: () => addEventListenerWrapper,
    };
    // https://github.com/AdguardTeam/Scriptlets/issues/215
    // https://github.com/AdguardTeam/Scriptlets/issues/143
    Object.defineProperty(window.EventTarget.prototype, 'addEventListener', descriptor);
    Object.defineProperty(window, 'addEventListener', descriptor);
    Object.defineProperty(document, 'addEventListener', descriptor);
}

export const preventAddEventListenerNames = [
    'prevent-addEventListener',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'addEventListener-defuser.js',
    'ubo-addEventListener-defuser.js',
    'aeld.js',
    'ubo-aeld.js',
    'ubo-addEventListener-defuser',
    'ubo-aeld',
    'abp-prevent-listener',
];

// eslint-disable-next-line prefer-destructuring
preventAddEventListener.primaryName = preventAddEventListenerNames[0];

preventAddEventListener.injections = [
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
    logMessage,
];
