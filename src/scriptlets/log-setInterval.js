/* eslint-disable no-console */
import { hit } from '../helpers';

/**
 * @scriptlet log-setInterval
 *
 * @description
 * Logs all setInterval calls to the console
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#setinterval-loggerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("log-setInterval")
 * ```
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
    'setInterval-logger.js',
    'ubo-setInterval-logger.js',
];

logSetInterval.injections = [hit];
