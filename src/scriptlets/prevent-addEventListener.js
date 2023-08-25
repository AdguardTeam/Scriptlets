import {
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
} from '../helpers/index';

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
 * ```text
 * example.org#%#//scriptlet('prevent-addEventListener'[, typeSearch[, listenerSearch]])
 * ```
 *
 * - `typeSearch` — optional, string or regular expression matching the type (event name);
 *   defaults to match all types; invalid regular expression will cause exit and rule will not work
 * - `listenerSearch` — optional, string or regular expression matching the listener function body;
 *   defaults to match all listeners; invalid regular expression will cause exit and rule will not work
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
 * @added v1.0.4.
 */
/* eslint-enable max-len */
export function preventAddEventListener(source, typeSearch, listenerSearch) {
    const typeSearchRegexp = toRegExp(typeSearch);
    const listenerSearchRegexp = toRegExp(listenerSearch);

    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(type, listener, ...args) {
        let shouldPrevent = false;
        if (validateType(type) && validateListener(listener)) {
            shouldPrevent = typeSearchRegexp.test(type.toString())
                && listenerSearchRegexp.test(listenerToString(listener));
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

preventAddEventListener.names = [
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

preventAddEventListener.injections = [
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
];
