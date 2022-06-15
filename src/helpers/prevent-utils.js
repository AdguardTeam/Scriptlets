import {
    parseDelayArg,
    parseMatchArg,
    isValidMatchNumber,
    isValidMatchStr,
} from './string-utils';

/**
 * Checks whether the passed arg is proper callback
 * @param {*} callback
 * @returns {boolean}
 */
export const isValidCallback = (callback) => {
    return callback instanceof Function
        // passing string as 'code' arg is not recommended
        // but it is possible and not restricted
        // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
        || typeof callback === 'string';
};

/**
 * Checks whether 'callback' and 'delay' are matching
 * by given parameters 'matchCallback' and 'matchDelay'.
 * Used for prevent-setTimeout and prevent-setInterval.
 * @param {Object} { callback, delay, matchCallback, matchDelay }
 * @returns {boolean}
 */
export const isPreventionNeeded = ({
    callback,
    delay,
    matchCallback,
    matchDelay,
}) => {
    // if callback is has not valid type
    // scriptlet can not prevent it
    // so no need for more checking and do not call hit() later
    if (!isValidCallback(callback)) {
        return false;
    }
    if (!isValidMatchStr(matchCallback)
        || (matchDelay && !isValidMatchNumber(matchDelay))) {
        return false;
    }

    const { isInvertedMatch, matchRegexp } = parseMatchArg(matchCallback);
    const { isInvertedDelayMatch, delayMatch } = parseDelayArg(matchDelay);

    let shouldPrevent = false;
    // https://github.com/AdguardTeam/Scriptlets/issues/105
    const callbackStr = String(callback);
    if (!delayMatch) {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
    } else if (!matchCallback) {
        shouldPrevent = (delay === delayMatch) !== isInvertedDelayMatch;
    } else {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch
            && (delay === delayMatch) !== isInvertedDelayMatch;
    }
    return shouldPrevent;
};
