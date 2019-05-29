/* eslint-disable no-console */
import { log } from '../helpers';

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const nativeSetInterval = window.setInterval;
    function setIntervalWrapper(callback, timeout, ...args) {
        log(source, `setInterval("${callback.toString()}", ${timeout})`);
        return nativeSetInterval.apply(window, [callback, timeout, ...args]);
    }
    window.setInterval = setIntervalWrapper;
}

logSetInterval.names = [
    'log-setInterval',
    'setInterval-logger.js',
];

logSetInterval.injections = [log];
