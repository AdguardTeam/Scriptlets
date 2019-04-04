/* eslint-disable no-new-func, no-console */

/**
 * Logs setInterval calls
 *
 * @param {Source} source
 */
export function logSetInterval(source) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};
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
