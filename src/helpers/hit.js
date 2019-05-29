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

    log = console.log.bind(console);
    trace = console.trace.bind(console);

    if (message) {
        log(`${source.ruleText} message:\n${message}`);
    }

    log(`${source.ruleText} trace start`);
    if (trace) {
        trace();
    }
    log(`${source.ruleText} trace end`);

    // This is necessary for unit-tests only!
    if (typeof window.__debugScriptlets === 'function') {
        window.__debugScriptlets(source);
    }
};
