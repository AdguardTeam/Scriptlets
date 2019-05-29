/* eslint-disable no-console */
import { createLogFunction } from '../helpers';

/**
 * Logs add event listener calls
 *
 * @param {Source} source
 */
export function logAddEventListener(source) {
    const log = createLogFunction(source);
    const nativeConsole = console.log.bind(console);
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
    function addEventListenerWrapper(eventName, callback, ...args) {
        nativeConsole(`addEventListener("${eventName}", ${callback.toString()})`);
        log();
        return nativeAddEventListener.apply(this, [eventName, callback, ...args]);
    }
    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}

logAddEventListener.names = [
    'log-addEventListener',
    'addEventListener-logger.js',
];

logAddEventListener.injections = [createLogFunction];
