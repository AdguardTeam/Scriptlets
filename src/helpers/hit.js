/* eslint-disable no-console, no-underscore-dangle */
/**
 * Hit used only for debug purposes now
 * @param {Source} source
 * @param {string} [message] - optional message;
 * use LOG_MARKER = 'log: ' at the start of a message
 * for logging scriptlets
 */
export const hit = (source, message) => {
    if (source.verbose !== true) {
        return;
    }

    try {
        const log = console.log.bind(console);
        const trace = console.trace.bind(console);

        const prefix = source.ruleText || '';

        // Used to check if scriptlet uses 'hit' function for logging
        const LOG_MARKER = 'log: ';

        if (message) {
            if (message.indexOf(LOG_MARKER) === -1) {
                log(`${prefix} message:\n${message}`);
            } else {
                log(message.slice(LOG_MARKER.length));
            }
        }

        log(`${prefix} trace start`);
        if (trace) {
            trace();
        }
        log(`${prefix} trace end`);
    } catch (e) {
        // try catch for Edge 15
        // In according to this issue https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/14495220/
        // console.log throws an error
    }

    // This is necessary for unit-tests only!
    if (typeof window.__debug === 'function') {
        window.__debug(source);
    }
};
