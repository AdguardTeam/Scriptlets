/* eslint-disable no-console, no-underscore-dangle */
/**
 * Hit used only for debug purposes now
 * @param {Source} source
 * @param {String} message optional message
 */
export const hit = (source, message) => {
    if (source.verbose !== true) {
        return;
    }

    try {
        const log = console.log.bind(console);
        const trace = console.trace.bind(console);

        const prefix = source.ruleText || '';

        if (message) {
            log(`${prefix} message:\n${message}`);
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
    if (typeof window.__debugScriptlets === 'function') {
        window.__debugScriptlets(source);
    }
};
