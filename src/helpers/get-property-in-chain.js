/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} [chain]
 */

/**
 * Check is property exist in base object recursively
 *
 * If property doesn't exist in base object
 * defines this property and returns base, property name and remaining part of property chain
 *
 * @param {Object} base
 * @param {string} chain
 * @returns {Chain}
 */
function getPropertyInChain(base, chain) {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        return { base, prop: chain };
    }
    const prop = chain.slice(0, pos);
    const own = base[prop];
    chain = chain.slice(pos + 1);
    if (own !== undefined) {
        return getPropertyInChain(own, chain);
    }

    Object.defineProperty(base, prop, { configurable: true });
    return { base: own, prop, chain };
}

export default getPropertyInChain;
