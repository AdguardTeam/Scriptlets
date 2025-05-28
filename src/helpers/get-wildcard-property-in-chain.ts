import { type ChainBase, type ChainInfo } from '../../types/types';

/**
 * Checks if a given path exists in an object.
 *
 * @param baseObj - The base object to check the path against.
 * @param path - The path string to check, with segments separated by dots (`.`).
 * @param valueToCheck - The value of the matched key to check.
 * @returns `true` if the path exists in the object, `false` otherwise.
 */
export function isKeyInObject(baseObj: ChainBase, path: string, valueToCheck: any): boolean {
    const parts = path.split('.');

    /**
     * Checks if a given path of segments exists in the target object and optionally matches a value.
     *
     * @param targetObject - The object to check the path against.
     * @param pathSegments - An array of strings representing the path segments to check.
     * @returns `true` if the path exists and matches the value (if provided), otherwise `false`.
     */
    const check = (targetObject: ChainBase, pathSegments: string[]): boolean => {
        if (targetObject === undefined || targetObject === null) {
            return false;
        }

        if (pathSegments.length === 0) {
            if (valueToCheck !== undefined) {
                if (typeof targetObject === 'string' && valueToCheck instanceof RegExp) {
                    return valueToCheck.test(targetObject);
                }
                return targetObject === valueToCheck;
            }
            return true;
        }

        const current = pathSegments[0];
        const rest = pathSegments.slice(1);

        if (current === '*' || current === '[]') {
            if (Array.isArray(targetObject)) {
                return targetObject.some((item) => check(item, rest));
            }
            if (typeof targetObject === 'object' && targetObject !== null) {
                return Object.keys(targetObject).some((key) => check(targetObject[key], rest));
            }
        }
        if (Object.prototype.hasOwnProperty.call(targetObject, current)) {
            return check(targetObject[current], rest);
        }
        return false;
    };

    return check(baseObj, parts);
}

/**
 * Check if the property exists in the base object (recursively).
 * Similar to getPropertyInChain but upgraded for json-prune:
 * handle wildcard properties and does not define nonexistent base property as 'undefined'
 *
 * @param base object that owns chain
 * @param chain chain of owner properties
 * @param lookThrough should the method look through it's props in order to find wildcard
 * @param output result acc
 * @param valueToCheck value to check
 * @returns list of ChainInfo objects
 */
export function getWildcardPropertyInChain(
    base: ChainBase,
    chain: string,
    lookThrough = false,
    output: ChainInfo[] = [],
    valueToCheck?: any,
): ChainInfo[] {
    const pos = chain.indexOf('.');
    if (pos === -1) {
        // for paths like 'a.b.*' every final nested prop should be processed
        if (chain === '*' || chain === '[]') {
            // eslint-disable-next-line no-restricted-syntax
            for (const key in base) {
                // to process each key in base except inherited ones
                if (Object.prototype.hasOwnProperty.call(base, key)) {
                    if (valueToCheck !== undefined) {
                        // Check if the value of the key is equal to this which should be matched
                        const objectValue = base[key];
                        if (typeof objectValue === 'string' && valueToCheck instanceof RegExp) {
                            if (valueToCheck.test(objectValue)) {
                                output.push({ base, prop: key });
                            }
                        } else if (objectValue === valueToCheck) {
                            output.push({ base, prop: key });
                        }
                    } else {
                        output.push({ base, prop: key });
                    }
                }
            }
        } else if (valueToCheck !== undefined) {
            const objectValue = base[chain];
            if (typeof objectValue === 'string' && valueToCheck instanceof RegExp) {
                if (valueToCheck.test(objectValue)) {
                    output.push({ base, prop: chain });
                }
            } else if (base[chain] === valueToCheck) {
                output.push({ base, prop: chain });
            }
        } else {
            output.push({ base, prop: chain });
        }

        return output;
    }

    const prop = chain.slice(0, pos);

    const shouldLookThrough = (prop === '[]' && Array.isArray(base))
        || (prop === '*' && base instanceof Object)
        || (prop === '[-]' && Array.isArray(base))
        || (prop === '{-}' && base instanceof Object);

    if (shouldLookThrough) {
        const nextProp = chain.slice(pos + 1);
        const baseKeys = Object.keys(base);

        // If the property is a {-} or [-], then check all keys in the object
        // and if it matches, remove whole object
        if (prop === '{-}' || prop === '[-]') {
            const type = Array.isArray(base) ? 'array' : 'object';
            // Check if the type of the object is correct
            const shouldRemove = !!(prop === '{-}' && type === 'object') || !!(prop === '[-]' && type === 'array');
            if (!shouldRemove) {
                return output;
            }

            baseKeys.forEach((key) => {
                const item = base[key];
                if (isKeyInObject(item, nextProp, valueToCheck)) {
                    output.push({ base, prop: key });
                }
            });

            return output;
        }
        // if there is a wildcard prop in input chain (e.g. 'ad.*.src' for 'ad.0.src ad.1.src'),
        // each one of base keys should be considered as a potential chain prop in final path
        baseKeys.forEach((key) => {
            const item = base[key];
            getWildcardPropertyInChain(item, nextProp, lookThrough, output, valueToCheck);
        });
    }

    // If base is an Array check elements in array
    // https://github.com/AdguardTeam/Scriptlets/issues/345
    if (Array.isArray(base)) {
        base.forEach((key) => {
            const nextBase = key;
            if (nextBase !== undefined) {
                getWildcardPropertyInChain(nextBase, chain, lookThrough, output, valueToCheck);
            }
        });
    }

    const nextBase = base[prop];
    chain = chain.slice(pos + 1);
    if (nextBase !== undefined) {
        getWildcardPropertyInChain(nextBase, chain, lookThrough, output, valueToCheck);
    }

    return output;
}
