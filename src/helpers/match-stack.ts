import { toRegExp } from './string-utils';
import { shouldAbortInlineOrInjectedScript } from './script-source-utils';
import { getNativeRegexpTest } from './regexp-utils';

/**
 * Checks if the stackTrace contains stackRegexp
 * https://github.com/AdguardTeam/Scriptlets/issues/82
 *
 * @param stackMatch - input stack value to match
 * @param stackTrace - script error stack trace
 * @returns if the stackTrace contains stackRegexp
 */
export const matchStackTrace = (stackMatch: string | undefined, stackTrace: string): boolean => {
    if (!stackMatch || stackMatch === '') {
        return true;
    }

    if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
        return true;
    }

    const stackRegexp = toRegExp(stackMatch);
    const refinedStackTrace = stackTrace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
};
