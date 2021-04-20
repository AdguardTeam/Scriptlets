import { toRegExp } from './string-utils';

/**
 * Checks if the stackTrace contains stackRegexp
 * // https://github.com/AdguardTeam/Scriptlets/issues/82
 * @param {string|undefined} stackMatch - input stack value to match
 * @param {string} stackTrace - script error stack trace
 * @returns {boolean}
 */
export const matchStackTrace = (stackMatch, stackTrace) => {
    if (!stackMatch || stackMatch === '') {
        return true;
    }

    const stackRegexp = toRegExp(stackMatch);
    const refinedStackTrace = stackTrace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    return stackRegexp.test(refinedStackTrace);
};
