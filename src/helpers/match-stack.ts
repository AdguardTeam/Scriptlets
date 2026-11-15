import { toRegExp } from './string-utils';
import { shouldAbortInlineOrInjectedScript } from './script-source-utils';
import { getNativeRegexpTest, backupRegExpValues, restoreRegExpValues } from './regexp-utils';

/**
 * Adds the error message line to the stack trace if it has none, i.e. in Firefox and Safari,
 * so the stack trace starts with it in all browsers, like in Chrome.
 *
 * `matchStackTrace()` removes the first two lines of the stack trace as the scriptlet's own ones,
 * i.e. the error message line and the frame of the function which has created the error in Chrome,
 * so without the message line it would remove the frame of the caller of that function as well.
 * The stack trace should be passed through this helper if it is created by a function called by the page,
 * e.g. a wrapper of the intercepted method, not by a function called by the scriptlet, as a minifier
 * may inline such function into the wrapper.
 *
 * String methods are used instead of a regular expression, as it would change `RegExp.$1` and others,
 * which `matchStackTrace()` preserves for the page.
 *
 * @param stackTrace stack trace of an error created without a message, e.g. `new Error().stack`
 * @returns stack trace which starts with the error message line
 */
export const addStackTraceMessageLine = (stackTrace: string): string => {
    // Lines of stack frames start with 'at' only in Chrome, where the stack trace starts with the message line,
    // e.g. 'Error\n    at objectWrapper (...)', while in Firefox and Safari it starts with a frame,
    // e.g. 'objectWrapper@...'
    const V8_FRAME_PREFIX = 'at ';
    const lines = stackTrace.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].trim().startsWith(V8_FRAME_PREFIX)) {
            return stackTrace;
        }
    }

    return `Error\n${stackTrace}`;
};

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

    const regExpValues = backupRegExpValues();

    if (shouldAbortInlineOrInjectedScript(stackMatch, stackTrace)) {
        if (regExpValues.length && regExpValues[0] !== RegExp.$1) {
            restoreRegExpValues(regExpValues);
        }
        return true;
    }

    const stackRegexp = toRegExp(stackMatch);
    const refinedStackTrace = stackTrace
        .split('\n')
        .slice(2) // get rid of our own functions in the stack trace
        .map((line) => line.trim()) // trim the lines
        .join('\n');

    if (regExpValues.length && regExpValues[0] !== RegExp.$1) {
        restoreRegExpValues(regExpValues);
    }
    return getNativeRegexpTest().call(stackRegexp, refinedStackTrace);
};
