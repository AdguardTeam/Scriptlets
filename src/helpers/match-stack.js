/**
 * Checks if the stackTrace contains stackRegexp
 * // https://github.com/AdguardTeam/Scriptlets/issues/82
 * @param {string} stackRegexp - stack regexp
 * @param {string} stackTrace - script error stack trace
 * @returns {boolean}
 */

export const matchStackTrace = (stackRegexp, stackTrace) => {
    stackTrace = stackTrace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    return stackRegexp.test(stackTrace);
};
