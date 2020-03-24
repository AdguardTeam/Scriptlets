/* eslint-disable no-console */
import { hit } from '../helpers';

/**
 * @scriptlet log-addEventListener
 *
 * @description
 * Logs all addEventListener calls to the console.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('log-addEventListener')
 * ```
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
    'aell.js',
    'ubo-aell.js',
];

logAddEventListener.injections = [hit];
