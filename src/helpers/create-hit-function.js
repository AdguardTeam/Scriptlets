import { stringToFunc } from './string-utils';

/**
 * takes source and creates hit function from source.hit
 * then binds to this function source
 * @param {Source} source
 * @return {Function} returns function
 */
export const createHitFunction = (source) => {
    const { hit } = source;
    const func = stringToFunc(hit);
    return func.bind(null, source);
};
