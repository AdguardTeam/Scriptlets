/* eslint-disable no-new-func */
import { toRegExp } from '../helpers/string-utils';

/**
 * Prevents adding event listeners
 *
 * @param {Source} source
 * @param {string|RegExp} [event] - event name or regexp matching event name
 * @param {string|RegExp} [funcStr] - string or regexp matching stringified handler function
 */
export function preventAddEventListener(source, event, funcStr) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    event = event ? toRegExp(event) : toRegExp('/.?/');
    funcStr = funcStr ? toRegExp(funcStr) : toRegExp('/.?/');

    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
    function addEventListenerWrapper(eventName, callback, ...args) {
        if (event.test(eventName.toString()) && funcStr.test(callback.toString())) {
            hit();
            return undefined;
        }
        return nativeAddEventListener.apply(this, [eventName, callback, ...args]);
    }

    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}

preventAddEventListener.names = [
    'prevent-addEventListener',
    'ubo-addEventListener-defuser.js',
];

preventAddEventListener.injections = [toRegExp];
