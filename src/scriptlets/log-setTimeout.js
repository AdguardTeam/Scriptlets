/* eslint-disable no-console */
import { log } from '../helpers';

/**
 * Logs setTimeout calls
 *
 * @param {Source} source
 */
export function logSetTimeout(source) {
    const nativeSetTimeout = window.setTimeout;
    function setTimeoutWrapper(callback, timeout, ...args) {
        log(source, `setTimeout("${callback.toString()}", ${timeout})`);
        return nativeSetTimeout.apply(window, [callback, timeout, ...args]);
    }
    window.setTimeout = setTimeoutWrapper;
}

logSetTimeout.names = [
    'log-setTimeout',
    'setTimeout-logger.js',
];

logSetTimeout.injections = [log];
