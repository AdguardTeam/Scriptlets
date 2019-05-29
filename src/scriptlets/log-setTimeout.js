/* eslint-disable no-console */
import { createLogFunction } from '../helpers';

/**
 * Logs setTimeout calls
 *
 * @param {Source} source
 */
export function logSetTimeout(source) {
    const log = createLogFunction(source);
    const nativeSetTimeout = window.setTimeout;
    const nativeConsole = console.log.bind(console);
    function setTimeoutWrapper(callback, timeout, ...args) {
        log();
        nativeConsole(`setTimeout("${callback.toString()}", ${timeout})`);
        return nativeSetTimeout.apply(window, [callback, timeout, ...args]);
    }
    window.setTimeout = setTimeoutWrapper;
}

logSetTimeout.names = [
    'log-setTimeout',
    'setTimeout-logger.js',
];

logSetTimeout.injections = [createLogFunction];
