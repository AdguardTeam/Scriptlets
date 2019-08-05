/* eslint-disable no-console */
import { hit } from '../helpers';

/**
 * Logs add event listener calls
 *
 * @param {Source} source
 */
export function logAddEventListener(source) {
    const log = console.log.bind(console);
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
    function addEventListenerWrapper(eventName, callback, ...args) {
        hit(source);
        log(`addEventListener("${eventName}", ${callback.toString()})`);
        return nativeAddEventListener.apply(this, [eventName, callback, ...args]);
    }
    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}

logAddEventListener.names = [
    'log-addEventListener',
    'addEventListener-logger.js',
    'ubo-addEventListener-logger.js',
];

logAddEventListener.injections = [hit];
