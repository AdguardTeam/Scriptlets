import { nativeIsNaN, nativeIsFinite } from './number-utils';

export const shouldMatchAnyDelay = (delay: string) => delay === '*';

/**
 * Handles input delay value
 *
 * @param delay matchDelay argument of adjust-* scriptlets
 * @returns proper number delay value
 */
export const getMatchDelay = (delay: string): number => {
    const DEFAULT_DELAY = 1000;
    const parsedDelay = parseInt(delay, 10);
    const delayMatch = nativeIsNaN(parsedDelay)
        ? DEFAULT_DELAY // default scriptlet value
        : parsedDelay;
    return delayMatch;
};

/**
 * Checks delay match condition
 *
 * @param inputDelay matchDelay argument of adjust-* scriptlets
 * @param realDelay delay argument of setTimeout/setInterval
 * @returns  if given delays match
 */
export const isDelayMatched = (inputDelay: string, realDelay: number): boolean => {
    return shouldMatchAnyDelay(inputDelay)
        || realDelay === getMatchDelay(inputDelay);
};

/**
 * Handles input boost value
 *
 * @param boost boost argument of adjust-* scriptlets
 * @returns proper number boost multiplier value
 */
export const getBoostMultiplier = (boost: string): number => {
    const DEFAULT_MULTIPLIER = 0.05;
    // https://github.com/AdguardTeam/Scriptlets/issues/262
    const MIN_MULTIPLIER = 0.001;
    const MAX_MULTIPLIER = 50;
    const parsedBoost = parseFloat(boost);
    let boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost)
        ? DEFAULT_MULTIPLIER // default scriptlet value
        : parsedBoost;
    if (boostMultiplier < MIN_MULTIPLIER) {
        boostMultiplier = MIN_MULTIPLIER;
    }
    if (boostMultiplier > MAX_MULTIPLIER) {
        boostMultiplier = MAX_MULTIPLIER;
    }
    return boostMultiplier;
};
