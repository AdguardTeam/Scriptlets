/* eslint-disable no-console */
import { createHitFunction } from '../helpers';

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const hit = createHitFunction(source);
    const nativeSetInterval = window.setInterval;
    const log = console.log.bind(console);
    function setIntervalWrapper(callback, timeout, ...args) {
        hit();
        log(`setInterval("${callback.toString()}", ${timeout})`);
        return nativeSetInterval.apply(window, [callback, timeout, ...args]);
    }
    window.setInterval = setIntervalWrapper;
}

logSetInterval.names = [
    'log-setInterval',
    'setInterval-logger.js',
];

logSetInterval.injections = [createHitFunction];
