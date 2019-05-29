/* eslint-disable no-console */
import { hit, log } from '../helpers';

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const nativeSetInterval = window.setInterval;
    function setIntervalWrapper(callback, timeout, ...args) {
        hit(source);
        log(source, `setInterval("${callback.toString()}", ${timeout})`);
        return nativeSetInterval.apply(window, [callback, timeout, ...args]);
    }
    window.setInterval = setIntervalWrapper;
}

logSetInterval.names = [
    'hit-setInterval',
    'setInterval-logger.js',
];

logSetInterval.injections = [hit, log];
