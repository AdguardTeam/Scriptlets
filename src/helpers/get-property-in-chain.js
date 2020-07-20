/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} [chain]
 */

/**
 * Check if the property exists in the base object (recursively)
 *
 * If property doesn't exist in base object,
 * defines this property as 'undefined'
 * and returns base, property name and remaining part of property chain
 *
 * @param {Object} base
 * @param {string} chain
 * @returns {Chain}
 */
export function getPropertyInChain(base, chain) {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        return { base, prop: chain };
    }
    const prop = chain.slice(0, pos);
    const nextBase = base[prop];
    chain = chain.slice(pos + 1);
    if (nextBase !== undefined) {
        return getPropertyInChain(nextBase, chain);
    }

    Object.defineProperty(base, prop, { configurable: true });
    return { base: nextBase, prop, chain };
}
