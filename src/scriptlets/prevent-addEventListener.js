import {
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('prevent-addEventListener'[, eventSearch[, functionSearch]])
 * ```
 *
 * - `eventSearch` - optional, string or regex matching the event name. If not specified, the scriptlets prevents all event listeners
 * - `functionSearch` - optional, string or regex matching the event listener function body. If not set, the scriptlet prevents all event listeners with event name matching `eventSearch`
 *
 * **Examples**
 * 1. Prevent all `click` listeners:
 * ```
 *     example.org#%#//scriptlet('prevent-addEventListener', 'click')
 * ```

2. Prevent 'click' listeners with the callback body containing `searchString`.
 * ```
 *     example.org#%#//scriptlet('prevent-addEventListener', 'click', 'searchString')
 * ```
 *
 *     For instance, this listener will not be called:
 * ```javascript
 *     el.addEventListener('click', () => {
 *         window.test = 'searchString';
 *     });
 * ```
 */
/* eslint-enable max-len */
export function preventAddEventListener(source, eventSearch, funcSearch) {
    const eventSearchRegexp = toRegExp(eventSearch);
    const funcSearchRegexp = toRegExp(funcSearch);
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(type, listener, ...args) {
        let shouldPrevent = false;
        if (validateType(type) && validateListener(listener)) {
            shouldPrevent = eventSearchRegexp.test(type.toString())
                && funcSearchRegexp.test(listenerToString(listener));
        }

        if (shouldPrevent) {
            hit(source);
            return undefined;
        }

        return nativeAddEventListener.apply(this, [type, listener, ...args]);
    }

    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
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
];

preventAddEventListener.injections = [
    hit,
    toRegExp,
    validateType,
    validateListener,
    listenerToString,
];
