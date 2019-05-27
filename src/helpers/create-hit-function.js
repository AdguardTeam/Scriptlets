import { stringToFunc } from './string-utils';

/**
 * Takes source and creates hit function from hitStr
 * Then binds to this function ruleText
 * @param {Source} source
 * @return {Function} returns function
 */
export const createHitFunction = (source) => {
    const { hit, ruleText } = source;
    const func = stringToFunc(hit);
    return ruleText ? func.bind(null, ruleText) : func;
};
