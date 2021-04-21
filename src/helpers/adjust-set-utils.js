import { nativeIsNaN, nativeIsFinite } from './number-utils';

export const shouldMatchAnyDelay = (delay) => {
    const ANY_DELAY_WILDCARD = '*';
    return delay === ANY_DELAY_WILDCARD;
};

/**
 * Handles input delay value
 * @param {*} delay
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
 * @param {*} inputDelay
 * @param {number} realDelay
 * @returns {boolean}
 */
export const isDelayMatched = (inputDelay, realDelay) => {
    return shouldMatchAnyDelay(inputDelay)
        || realDelay === getMatchDelay(inputDelay);
};

/**
 * Handles input boost value
 * @param {*} boost
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
