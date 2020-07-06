/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} [chain]
 */

/**
 * Check is property exist in base object recursively
 *
 * If property doesn't exist in base object,
 * defines this property (for addProp = true)
 * and returns base, property name and remaining part of property chain
 *
 * @param {Object} base
 * @param {string} chain
 * @param {boolean} [addProp=true]
 * defines is nonexistent base property should be assigned as 'undefined'
 * @param {boolean} [lookThrough=false]
 * should the method look through it's props in order to wildcard
 * @param {Array} [output=[]] result acc
 * @returns {Chain[]} array of objects
 */
export function getPropertyInChain(base, chain, addProp = true, lookThrough = false, output = []) {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        // for paths like 'a.b.*' every final nasted prop should be processed
        if (chain === '*') {
            Object.keys(base).forEach((key) => {
                output.push({ base, prop: key });
            });
        } else {
            output.push({ base, prop: chain });
        }

        return output;
    }

    const prop = chain.slice(0, pos);

    const shouldLookThrough = (prop === '[]' && Array.isArray(base))
        || (prop === '*' && base instanceof Object);

    if (shouldLookThrough) {
        const nextProp = chain.slice(pos + 1);
        const baseKeys = Object.keys(base);

        baseKeys.forEach((key) => {
            const item = base[key];
            return getPropertyInChain(item, nextProp, addProp, lookThrough, output);
        });
    }

    const own = base[prop];
    chain = chain.slice(pos + 1);
    if (own !== undefined) {
        return getPropertyInChain(own, chain, addProp, lookThrough, output);
    }

    if (addProp) {
        Object.defineProperty(base, prop, { configurable: true });
        output.push({ base: own, prop, chain });
    }

    return output;
}
