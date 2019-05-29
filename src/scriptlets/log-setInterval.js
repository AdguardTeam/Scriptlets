/* eslint-disable no-console */
import { createLogFunction } from '../helpers';

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const log = createLogFunction(source);
    const nativeSetInterval = window.setInterval;
    const nativeConsole = console.log.bind(console);
    function setIntervalWrapper(callback, timeout, ...args) {
        log();
        nativeConsole(`setInterval("${callback.toString()}", ${timeout})`);
        return nativeSetInterval.apply(window, [callback, timeout, ...args]);
    }
    window.setInterval = setIntervalWrapper;
}

logSetInterval.names = [
    'log-setInterval',
    'setInterval-logger.js',
];

logSetInterval.injections = [createLogFunction];
