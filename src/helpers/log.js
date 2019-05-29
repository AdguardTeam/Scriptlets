/* eslint-disable no-console */
/**
 * Takes source, message and logs when scriptlet is applied
 * @param source
 * @param message
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
    }
};
