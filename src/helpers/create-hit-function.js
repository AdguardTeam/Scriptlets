import { stringToFunc } from './string-utils';

/**
 * Takes source and creates hit function from hitStr
 * Then binds to this function ruleText
 * @param hitStr - function string representation
 * @param ruleText - ruleText
 * @return {Function} returns function
 */
export const createHitFunction = (hitStr, ruleText) => {
    const func = stringToFunc(hitStr);
    return ruleText ? func.bind(null, ruleText) : func;
};
