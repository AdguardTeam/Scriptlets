import {
    parseDelayArg,
    parseMatchArg,
    isValidMatchNumber,
    isValidMatchStr,
} from './string-utils';
import { nativeIsNaN } from './number-utils';

/**
 * Checks whether the passed arg is proper callback
 *
 * @param callback arbitrary callback
 * @returns if callback is valid
 */
export const isValidCallback = (callback: unknown): boolean => {
    // 'typeof' check is used instead of 'instanceof Function' because
    // 'instanceof' returns false for functions with a modified prototype
    // chain and for functions from another realm
    // https://github.com/AdguardTeam/Scriptlets/issues/561
    return typeof callback === 'function'
        // passing string as 'code' arg is not recommended
        // but it is possible and not restricted
        // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#parameters
        || typeof callback === 'string';
};

/**
 * Converts a timer/rAF callback into its string representation for
 * pattern matching and logging.
 *
 * Native `Function.prototype.toString` is applied to function callbacks
 * to get the genuine source text even if the callback's prototype chain
 * was modified or its own `toString` was overridden.
 * https://github.com/AdguardTeam/Scriptlets/issues/561
 *
 * @param callback arbitrary callback
 * @returns string representation of the callback; never throws
 */
export const callbackToString = (callback: unknown): string => {
    if (typeof callback === 'function') {
        return Function.prototype.toString.call(callback);
    }
    try {
        return String(callback);
    } catch (e) {
        // String() throws for objects with no primitive conversion,
        // e.g. Object.create(null)
        return Object.prototype.toString.call(callback);
    }
};

/**
 * Parses delay argument of setTimeout / setInterval methods into
 * rounded down number for number/string values or passes on for other types.
 * Needed for prevent-setTimeout and prevent-setInterval
 *
 * @param delay native method delay arg
 * @returns number as parsed delay or any input type if `delay` is not parsable
 */
export const parseRawDelay = <T>(delay: T): number | T => {
    const parsedDelay = Math.floor(parseInt(delay as string, 10));
    return typeof parsedDelay === 'number' && !nativeIsNaN(parsedDelay) ? parsedDelay : delay;
};

type PreventData = {
    callback: () => void;
    delay: unknown;
    matchCallback: string;
    matchDelay: string;
};

/**
 * Checks whether the actual delay matches the configured delay condition.
 *
 * @param isDelayRange whether the delay arg is a range
 * @param delayMinMatch minimum delay bound for range match, or null
 * @param delayMaxMatch maximum delay bound for range match, or null
 * @param delayMatch exact delay to match, or null
 * @param isInvertedDelayMatch whether to invert the delay match result
 * @param actualDelay parsed delay value from the intercepted call
 * @returns whether the delay matches the condition
 */
export const isPreventDelayMatched = (
    isDelayRange: boolean,
    delayMinMatch: number | null,
    delayMaxMatch: number | null,
    delayMatch: number | null,
    isInvertedDelayMatch: boolean,
    actualDelay: unknown,
): boolean => {
    if (isDelayRange) {
        // Invalid range (e.g. 'abc-100') — both bounds are null, never match
        if (delayMinMatch === null && delayMaxMatch === null) {
            return false;
        }
        if (typeof actualDelay !== 'number') {
            return false;
        }
        const aboveMin = delayMinMatch === null || actualDelay >= delayMinMatch;
        const belowMax = delayMaxMatch === null || actualDelay <= delayMaxMatch;
        return (aboveMin && belowMax) !== isInvertedDelayMatch;
    }
    if (delayMatch === null) {
        return true;
    }
    return (actualDelay === delayMatch) !== isInvertedDelayMatch;
};

/**
 * Checks whether 'callback' and 'delay' are matching
 * by given parameters 'matchCallback' and 'matchDelay'.
 * Used for prevent-setTimeout and prevent-setInterval.
 *
 * @param preventData set of data to determine if scriptlet should match
 * @param preventData.callback method's callback arg
 * @param preventData.delay method's delay arg
 * @param preventData.matchCallback scriptlets's callback arg
 * @param preventData.matchDelay scriptlets's delay arg
 * @returns if scriptlet should match
 */
export const isPreventionNeeded = ({
    callback,
    delay,
    matchCallback,
    matchDelay,
}: PreventData): boolean => {
    // if callback is has not valid type
    // scriptlet can not prevent it
    // so no need for more checking and do not call hit() later
    if (!isValidCallback(callback)) {
        return false;
    }
    if (
        !isValidMatchStr(matchCallback)
        || (matchDelay && !isValidMatchNumber(matchDelay))
    ) {
        return false;
    }

    const { isInvertedMatch, matchRegexp } = parseMatchArg(matchCallback);
    const {
        isInvertedDelayMatch,
        delayMatch,
        delayMinMatch,
        delayMaxMatch,
        isDelayRange,
    } = parseDelayArg(matchDelay);

    // Parse delay for decimal, string and non-number values
    // https://github.com/AdguardTeam/Scriptlets/issues/247
    const parsedDelay = parseRawDelay(delay);

    let shouldPrevent = false;
    // https://github.com/AdguardTeam/Scriptlets/issues/105
    const callbackStr = callbackToString(callback);
    if (!isDelayRange && delayMatch === null) {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch;
    } else if (!matchCallback) {
        shouldPrevent = isPreventDelayMatched(
            isDelayRange,
            delayMinMatch,
            delayMaxMatch,
            delayMatch,
            isInvertedDelayMatch,
            parsedDelay,
        );
    } else {
        shouldPrevent = matchRegexp.test(callbackStr) !== isInvertedMatch
            && isPreventDelayMatched(
                isDelayRange,
                delayMinMatch,
                delayMaxMatch,
                delayMatch,
                isInvertedDelayMatch,
                parsedDelay,
            );
    }
    return shouldPrevent;
};
