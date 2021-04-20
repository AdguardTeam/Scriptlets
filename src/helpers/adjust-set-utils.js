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
    const parsedDelay = parseInt(delay, 10);
    const delayMatch = nativeIsNaN(parsedDelay)
        ? 1000 // default scriptlet value
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
    const parsedBoost = parseFloat(boost);
    let boostMultiplier = nativeIsNaN(parsedBoost) || !nativeIsFinite(parsedBoost)
        ? 0.05 // default scriptlet value
        : parsedBoost;
    if (boostMultiplier < 0.02) {
        boostMultiplier = 0.02;
    }
    if (boostMultiplier > 50) {
        boostMultiplier = 50;
    }
    return boostMultiplier;
};
