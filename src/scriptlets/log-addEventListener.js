/* eslint-disable no-console */
import { hit, log } from '../helpers';

/**
 * Logs add event listener calls
 *
 * @param {Source} source
 */
export function logAddEventListener(source) {
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
    function addEventListenerWrapper(eventName, callback, ...args) {
        hit(source);
        log(source, `addEventListener("${eventName}", ${callback.toString()})`);
        return nativeAddEventListener.apply(this, [eventName, callback, ...args]);
    }
    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}

logAddEventListener.names = [
    'hit-addEventListener',
    'addEventListener-logger.js',
];

logAddEventListener.injections = [hit, log];
