/* eslint-disable no-console */
import { hit } from '../helpers';

/**
 * @scriptlet log-setTimeout
 *
 * @description
 * Logs all setTimeout call to the console.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#settimeout-loggerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("log-setTimeout")
 * ```
 */
export function logSetTimeout(source) {
    const log = console.log.bind(console);
    const nativeSetTimeout = window.setTimeout;
    function setTimeoutWrapper(callback, timeout, ...args) {
        hit(source);
        log(`setTimeout("${callback.toString()}", ${timeout})`);
        return nativeSetTimeout.apply(window, [callback, timeout, ...args]);
    }
    window.setTimeout = setTimeoutWrapper;
}

logSetTimeout.names = [
    'log-setTimeout',
    'setTimeout-logger.js',
    'ubo-setTimeout-logger.js',
];

logSetTimeout.injections = [hit];
