import { startsWith } from './string-utils';

/**
 * Determines if type of script is inline or injected
 * and when it's one of them then return true, otherwise false
 * https://github.com/AdguardTeam/Scriptlets/issues/201
 * @param {string|undefined} stackMatch - input stack value to match
 * @param {string} stackTrace - script error stack trace
 * @returns {boolean}
 */
export const shouldAbortInlineOrInjectedScript = (stackMatch, stackTrace) => {
    const INLINE_SCRIPT_STRING = 'inlineScript';
    const INJECTED_SCRIPT_STRING = 'injectedScript';
    const INJECTED_SCRIPT_MARKER = '<anonymous>';
    const isInlineScript = (stackMatch) => stackMatch.indexOf(INLINE_SCRIPT_STRING) > -1;
    const isInjectedScript = (stackMatch) => stackMatch.indexOf(INJECTED_SCRIPT_STRING) > -1;

    if (!(isInlineScript(stackMatch) || isInjectedScript(stackMatch))) {
        return false;
    }

    let documentURL = window.location.href;
    const pos = documentURL.indexOf('#');
    // Remove URL hash
    // in Chrome, URL in stackTrace doesn't contain hash
    // so, it's necessary to remove it, otherwise location.href
    // will not match with location from stackTrace
    if (pos !== -1) {
        documentURL = documentURL.slice(0, pos);
    }
    const stackSteps = stackTrace.split('\n').slice(2).map((line) => line.trim());
    const stackLines = stackSteps.map((line) => {
        let stack;
        // Get stack trace URL
        // in Firefox stack trace looks like this: advanceTaskQueue@http://127.0.0.1:8080/scriptlets/tests/dist/qunit.js:1834:20
        // in Chrome like this: at Assert.throws (http://127.0.0.1:8080/scriptlets/tests/dist/qunit.js:3178:16)
        // so, first group "(.*?@)" is required for Firefox, second group contains URL
        const getStackTraceURL = /(.*?@)?(\S+)(:\d+):\d+\)?$/.exec(line);
        if (getStackTraceURL) {
            let stackURL = getStackTraceURL[2];
            if (startsWith(stackURL, '(')) {
                stackURL = stackURL.slice(1);
            }
            if (startsWith(stackURL, INJECTED_SCRIPT_MARKER)) {
                stackURL = INJECTED_SCRIPT_STRING;
                let stackFunction = getStackTraceURL[1] !== undefined
                    ? getStackTraceURL[1].slice(0, -1)
                    : line.slice(0, getStackTraceURL.index).trim();
                if (startsWith(stackFunction, 'at')) {
                    stackFunction = stackFunction.slice(2).trim();
                }
                stack = `${stackFunction} ${stackURL}`.trim();
            } else {
                stack = stackURL;
            }
        } else {
            stack = line;
        }
        return stack;
    });
    if (stackLines) {
        for (let index = 0; index < stackLines.length; index += 1) {
            if (isInlineScript(stackMatch) && documentURL === stackLines[index]) {
                return true;
            }
            if (isInjectedScript(stackMatch)
                && startsWith(stackLines[index], INJECTED_SCRIPT_STRING)) {
                return true;
            }
        }
    }
    return false;
};
