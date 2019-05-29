/* eslint-disable no-console, no-underscore-dangle */
/**
 * Hit used only for debug purposes now
 * @param {Source} source
 */
export const hit = (source) => {
    // This is necessary for unit-tests only!
    if (typeof window.__debugScriptlets === 'function') {
        window.__debugScriptlets(source);
    }
};
