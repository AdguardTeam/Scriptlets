import { nativeIsNaN, nativeIsFinite } from './number-utils';

export const shouldMatchAnyDelay = (delay) => delay === '*';

/**
 * Handles input delay value
 *
 * @param {any} delay matchDelay argument of adjust-* scriptlets
 * @returns {number} proper number delay value
 */
export const getMatchDelay = (delay) => {
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
 * @param {any} inputDelay matchDelay argument of adjust-* scriptlets
 * @param {number} realDelay delay argument of setTimeout/setInterval
 * @returns {boolean} if given delays match
 */
export const isDelayMatched = (inputDelay, realDelay) => {
    return shouldMatchAnyDelay(inputDelay)
        || realDelay === getMatchDelay(inputDelay);
};

/**
 * Handles input boost value
 *
 * @param {any} boost boost argument of adjust-* scriptlets
 * @returns {number} proper number boost multiplier value
 */
export const getBoostMultiplier = (boost) => {
    const DEFAULT_MULTIPLIER = 0.05;
    const MIN_MULTIPLIER = 0.02;
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
