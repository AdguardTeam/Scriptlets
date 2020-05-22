/**
 * Checks if the stackTrace contains inputStackProp
 * // https://github.com/AdguardTeam/Scriptlets/issues/82
 * @param {string} inputStackProp - stack scriptlet parameter
 * @param {string} stackTrace - script error stack trace
 * @returns {boolean}
 */

export const matchStackTrace = (inputStackProp, stackTrace) => {
    stackTrace = stackTrace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    return inputStackProp.test(stackTrace);
};
