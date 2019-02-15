/**
 * Check is passed property available in base object
 * @param {Object} base
 * @param {string} property
 * @returns {{base: Object, property: string}|boolean}
 */
function getPropertyInChain(base, chain) {
    let pos = chain.indexOf('.');
    if (pos === -1) {
        return { base, prop: chain };
    }
    let prop = chain.slice(0, pos);
    let own = base[prop];
    chain = chain.slice(pos + 1);
    if (own !== undefined) {
        return getPropertyInChain(own, chain);
    }

    Object.defineProperty(base, prop, { configurable: true });
    return { base: own, prop, chain };
};

export default getPropertyInChain;
