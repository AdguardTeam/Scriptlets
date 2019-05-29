/* eslint-disable no-console, no-underscore-dangle */

/**
 * Takes source and logs scriptlet application
 * @param {Source} source
 * @param {string} [message] will be printed in console
 */
export const log = (source, message) => {
    const nativeLog = console.log.bind(console);
    const nativeTrace = console.trace && console.trace.bind(console);
    if (message) {
        nativeLog(message);
    }
    if (source.verbose === true) {
        nativeLog(`${source.ruleText} trace start`);
        if (nativeTrace) {
            nativeTrace();
        }
        nativeLog(`${source.ruleText} trace end`);

        // This is necessary for unit-tests only!
        if (window.__debugScriptlets instanceof Function
            || typeof window.__debugScriptlets === 'function') {
            window.__debugScriptlets(source);
        }
    }
};
