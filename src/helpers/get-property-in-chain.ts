import { isEmptyObject } from './object-utils';

/**
 * Check if the property exists in the base object (recursively)
 *
 * If property doesn't exist in base object,
 * defines this property as 'undefined'
 * and returns base, property name and remaining part of property chain
 *
 * @param base object that owns chain
 * @param chain chain of owner properties
 * @returns chain info object
 */
export function getPropertyInChain(base: ChainBase, chain: string): ChainInfo {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        return { base, prop: chain };
    }
    const prop = chain.slice(0, pos);

    // https://github.com/AdguardTeam/Scriptlets/issues/128
    if (base === null) {
        // if base is null, return 'null' as base.
        // it's needed for triggering the reason logging while debugging
        return { base, prop, chain };
    }

    const nextBase = base[prop];
    chain = chain.slice(pos + 1);

    if ((base instanceof Object || typeof base === 'object') && isEmptyObject(base)) {
        // for empty objects in chain
        return { base, prop, chain };
    }

    if (nextBase === null) {
        return { base, prop, chain };
    }

    if (nextBase !== undefined) {
        return getPropertyInChain(nextBase, chain);
    }

    Object.defineProperty(base, prop, { configurable: true });
    return { base, prop, chain };
}
