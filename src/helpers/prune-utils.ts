import { hit } from './hit';
import { getWildcardPropertyInChain } from './get-wildcard-property-in-chain';
import { logMessage } from './log-message';
import { toRegExp } from './string-utils';
import { matchStackTrace } from './match-stack';

/**
 * Checks if prunning is required
 *
 * @param source required, scriptlet properties
 * @param root object which should be pruned or logged
 * @param prunePaths array with string of space-separated property chains to remove
 * @param requiredPaths array with string of space-separated propertiy chains
 * @param stack string which should be matched by stack trace
 * @param nativeObjects reference to native objects, required for a trusted-prune-inbound-object to fix infinite loop
 * which must be all present for the pruning to occur
 * @returns true if prunning is required
 */
export function isPruningNeeded(
    source: Source,
    root: ChainBase,
    prunePaths: string[],
    requiredPaths: string[],
    stack: string,
    nativeObjects: any,
): boolean | undefined {
    if (!root) {
        return false;
    }

    const { nativeStringify } = nativeObjects;

    let shouldProcess;

    // Only log hostname and matched JSON payload if only second argument is present
    if (prunePaths.length === 0 && requiredPaths.length > 0) {
        const rootString = nativeStringify(root);
        const matchRegex = toRegExp(requiredPaths.join(''));
        const shouldLog = matchRegex.test(rootString);
        if (shouldLog) {
            logMessage(
                source,
                `${window.location.hostname}\n${nativeStringify(root, null, 2)}\nStack trace:\n${new Error().stack}`,
                true,
            );
            if (root && typeof root === 'object') {
                logMessage(source, root, true, false);
            }
            shouldProcess = false;
            return shouldProcess;
        }
    }

    if (stack && !matchStackTrace(stack, new Error().stack || '')) {
        shouldProcess = false;
        return shouldProcess;
    }

    const wildcardSymbols = ['.*.', '*.', '.*', '.[].', '[].', '.[]'];

    for (let i = 0; i < requiredPaths.length; i += 1) {
        const requiredPath = requiredPaths[i];
        const lastNestedPropName = requiredPath.split('.').pop();
        const hasWildcard = wildcardSymbols.some((symbol) => requiredPath.includes(symbol));

        // if the path has wildcard, getPropertyInChain should 'look through' chain props
        const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);

        // Do not prune if details is an empty Array
        // https://github.com/AdguardTeam/Scriptlets/issues/345
        if (!details.length) {
            shouldProcess = false;
            return shouldProcess;
        }

        // start value of 'shouldProcess' due to checking below
        shouldProcess = !hasWildcard;

        for (let j = 0; j < details.length; j += 1) {
            const hasRequiredProp = typeof lastNestedPropName === 'string'
                && details[j].base[lastNestedPropName] !== undefined;
            if (hasWildcard) {
                // if there is a wildcard,
                // at least one (||) of props chain should be present in object
                shouldProcess = hasRequiredProp || shouldProcess;
            } else {
                // otherwise each one (&&) of them should be there
                shouldProcess = hasRequiredProp && shouldProcess;
            }
        }
    }

    return shouldProcess;
}

/**
 * Prunes properties of 'root' object
 *
 * @param source required, scriptlet properties
 * @param root object which should be pruned or logged
 * @param prunePaths array with string of space-separated properties to remove
 * @param requiredPaths array with string of space-separated properties
 * @param stack string which should be matched by stack trace
 * @param nativeObjects reference to native objects, required for a trusted-prune-inbound-object to fix infinite loop
 * which must be all present for the pruning to occur
 * @returns pruned root
 */
export const jsonPruner = (
    source: Source,
    root: ChainBase,
    prunePaths: string[],
    requiredPaths: string[],
    stack: string,
    nativeObjects: any,
): ArbitraryObject => {
    const { nativeStringify } = nativeObjects;
    if (prunePaths.length === 0 && requiredPaths.length === 0) {
        logMessage(
            source,
            `${window.location.hostname}\n${nativeStringify(root, null, 2)}\nStack trace:\n${new Error().stack}`,
            true,
        );
        if (root && typeof root === 'object') {
            logMessage(source, root, true, false);
        }
        return root;
    }

    try {
        if (isPruningNeeded(source, root, prunePaths, requiredPaths, stack, nativeObjects) === false) {
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

/**
 * Checks if props is a string and returns array of properties
 * or empty array if props is not a string
 *
 * @param props string of space-separated properties or undefined
 * @returns array of properties or empty array if props is not a string
 */
export const getPrunePath = (props: unknown) => {
    const validPropsString = typeof props === 'string'
        && props !== undefined
        && props !== '';

    return validPropsString
        ? props.split(/ +/)
        : [];
};
