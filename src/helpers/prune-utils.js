import { hit } from './hit';
import { getWildcardPropertyInChain } from './get-wildcard-property-in-chain';
import { logMessage } from './log-message';
import { toRegExp } from './string-utils';

/**
 * Checks if prunning is required
 *
 * @param {Object} source required, scriptlet properties
 * @param {Object} root object which should be pruned or logged
 * @param {Array} prunePaths array with string of space-separated properties to remove
 * @param {Array} requiredPaths array with string of space-separated properties
 * which must be all present for the pruning to occur
 * @returns {boolean|undefined} true if prunning is required
 */
export function isPruningNeeded(source, root, prunePaths, requiredPaths) {
    if (!root) {
        return false;
    }

    let shouldProcess;

    // Only log hostname and matched JSON payload if only second argument is present
    if (prunePaths.length === 0 && requiredPaths.length > 0) {
        const rootString = JSON.stringify(root);
        const matchRegex = toRegExp(requiredPaths.join(''));
        const shouldLog = matchRegex.test(rootString);
        if (shouldLog) {
            logMessage(source, `${window.location.hostname}\n${JSON.stringify(root, null, 2)}`, true);
            if (root && typeof root === 'object') {
                logMessage(source, root, true, false);
            }
            shouldProcess = false;
            return shouldProcess;
        }
    }

    const wildcardSymbols = ['.*.', '*.', '.*', '.[].', '[].', '.[]'];

    for (let i = 0; i < requiredPaths.length; i += 1) {
        const requiredPath = requiredPaths[i];
        const lastNestedPropName = requiredPath.split('.').pop();
        const hasWildcard = wildcardSymbols.some((symbol) => requiredPath.includes(symbol));

        // if the path has wildcard, getPropertyInChain should 'look through' chain props
        const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);

        // start value of 'shouldProcess' due to checking below
        shouldProcess = !hasWildcard;

        for (let i = 0; i < details.length; i += 1) {
            if (hasWildcard) {
                // if there is a wildcard,
                // at least one (||) of props chain should be present in object
                shouldProcess = !(details[i].base[lastNestedPropName] === undefined)
                    || shouldProcess;
            } else {
                // otherwise each one (&&) of them should be there
                shouldProcess = !(details[i].base[lastNestedPropName] === undefined)
                    && shouldProcess;
            }
        }
    }

    return shouldProcess;
}

/**
 * Prunes properties of 'root' object
 *
 * @param {Object} source required, scriptlet properties
 * @param {Object} root object which should be pruned or logged
 * @param {Array} prunePaths array with string of space-separated properties to remove
 * @param {Array} requiredPaths array with string of space-separated properties
 * which must be all present for the pruning to occur
 * @returns {Object} pruned root
 */
export const jsonPruner = (source, root, prunePaths, requiredPaths) => {
    if (prunePaths.length === 0 && requiredPaths.length === 0) {
        logMessage(source, `${window.location.hostname}\n${JSON.stringify(root, null, 2)}`, true);
        if (root && typeof root === 'object') {
            logMessage(source, root, true, false);
        }
        return root;
    }

    try {
        if (isPruningNeeded(source, root, prunePaths, requiredPaths) === false) {
            return root;
        }

        // if pruning is needed, we check every input pathToRemove
        // and delete it if root has it
        prunePaths.forEach((path) => {
            const ownerObjArr = getWildcardPropertyInChain(root, path, true);
            ownerObjArr.forEach((ownerObj) => {
                if (ownerObj !== undefined && ownerObj.base) {
                    delete ownerObj.base[ownerObj.prop];
                    hit(source);
                }
            });
        });
    } catch (e) {
        logMessage(source, e);
    }

    return root;
};
