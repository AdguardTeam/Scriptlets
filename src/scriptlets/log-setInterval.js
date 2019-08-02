/* eslint-disable no-console */
import { hit } from '../helpers';

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const log = console.log.bind(console);
    const nativeSetInterval = window.setInterval;
    function setIntervalWrapper(callback, timeout, ...args) {
        hit(source);
        log(`setInterval("${callback.toString()}", ${timeout})`);
        return nativeSetInterval.apply(window, [callback, timeout, ...args]);
    }
    window.setInterval = setIntervalWrapper;
}

logSetInterval.names = [
    'log-setInterval',
    'ubo-setInterval-logger.js',
];

logSetInterval.injections = [hit];
