/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} [chain]
 */

/**
 * Check if the property exists in the base object (recursively).
 * Similar to getPropertyInChain but upgraded for json-prune:
 * handle wildcard properties and does not define nonexistent base property as 'undefined'
 *
 * @param {Object} base
 * @param {string} chain
 * @param {boolean} [lookThrough=false]
 * should the method look through it's props in order to wildcard
 * @param {Array} [output=[]] result acc
 * @returns {Chain[]} array of objects
 */
export function getWildcardPropertyInChain(base, chain, lookThrough = false, output = []) {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        // for paths like 'a.b.*' every final nested prop should be processed
        if (chain === '*' || chain === '[]') {
            // eslint-disable-next-line no-restricted-syntax
            for (const key in base) {
                // to process each key in base except inherited ones
                if (Object.prototype.hasOwnProperty.call(base, key)) {
                    output.push({ base, prop: key });
                }
            }
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

        // if there is a wildcard prop in input chain (e.g. 'ad.*.src' for 'ad.0.src ad.1.src'),
        // each one of base keys should be considered as a potential chain prop in final path
        baseKeys.forEach((key) => {
            const item = base[key];
            getWildcardPropertyInChain(item, nextProp, lookThrough, output);
        });
    }

    const nextBase = base[prop];
    chain = chain.slice(pos + 1);
    if (nextBase !== undefined) {
        getWildcardPropertyInChain(nextBase, chain, lookThrough, output);
    }

    return output;
}
