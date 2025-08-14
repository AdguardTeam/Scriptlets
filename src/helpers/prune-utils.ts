import { hit } from './hit';
import { getWildcardPropertyInChain } from './get-wildcard-property-in-chain';
import { logMessage } from './log-message';
import { toRegExp } from './string-utils';
import { matchStackTrace } from './match-stack';
import { type ArbitraryObject, type ChainBase } from '../../types/types';
import { type Source } from '../scriptlets';

/**
 * Checks if pruning is required
 *
 * @param source required, scriptlet properties
 * @param root object which should be pruned or logged
 * @param prunePaths array with objects containing string of property chain as a path to remove and optional value
 * @param requiredPaths array with objects containing string of property chain
 * @param stack string which should be matched by stack trace
 * @param nativeObjects reference to native objects, required for a trusted-prune-inbound-object to fix infinite loop
 * which must be all present for the pruning to occur
 * @returns true if pruning is required
 */
export function isPruningNeeded(
    source: Source,
    root: ChainBase,
    prunePaths: { path: string; value?: any }[],
    requiredPaths: { path: string; value?: any }[],
    stack: string,
    nativeObjects: any,
): boolean | undefined {
    if (!root) {
        return false;
    }

    const { nativeStringify } = nativeObjects;

    let shouldProcess;

    const prunePathsToCheck = prunePaths.map((obj) => {
        return obj.path;
    });
    const requiredPathsToCheck = requiredPaths.map((obj) => {
        return obj.path;
    });

    // Only log hostname and matched JSON payload if only second argument is present
    if (prunePathsToCheck.length === 0 && requiredPathsToCheck.length > 0) {
        const rootString = nativeStringify(root);
        const matchRegex = toRegExp(requiredPathsToCheck.join(''));
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

    for (let i = 0; i < requiredPathsToCheck.length; i += 1) {
        const requiredPath = requiredPathsToCheck[i];
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
    prunePaths: { path: string; value?: any }[],
    requiredPaths: { path: string; value?: any }[],
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
            const pathToCheck = path.path;
            const valueToCheck = path.value;
            const ownerObjArr = getWildcardPropertyInChain(root, pathToCheck, true, [], valueToCheck);
            // Iterate in reverse order to avoid index issues when removing elements from an array
            for (let i = ownerObjArr.length - 1; i >= 0; i -= 1) {
                const ownerObj = ownerObjArr[i];
                if (ownerObj === undefined || !ownerObj.base) {
                    continue;
                }

                hit(source);

                if (!Array.isArray(ownerObj.base)) {
                    delete ownerObj.base[ownerObj.prop];
                    continue;
                }

                try {
                    const index = Number(ownerObj.prop);
                    if (Number.isNaN(index)) {
                        continue;
                    }

                    // Delete operator leaves "undefined" in the array and it sometimes causes issues
                    ownerObj.base.splice(index, 1);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error while deleting array element', error);
                }
            }
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
    const VALUE_MARKER = '.[=].';
    const REGEXP_START_MARKER = '/';

    const validPropsString = typeof props === 'string'
        && props !== undefined
        && props !== '';

    if (validPropsString) {
        /**
         * Safari 15 does not support lookbehind, so we need to use a custom splitter.
         *
         * Legacy approach (for engines with lookbehind) that this replaces:
         *
         *   // Regular expression to split the properties string by spaces,
         *   // but it should not split if there is space inside value, like in:
         *   // 'foo.[=]./foo bar baz/ bar' or 'foo.[=]./foo bar \/ baz/ bar'
         *   // const splitRegexp = /(?<!\.\[=\]\.\/(?:[^/]|\\.)*)\s+/;
         *
         * @param str splitted string
         * @returns array of parts
         */
        // We ignore the rule here because we need to define the function inside the function,
        // so that we do not have to import it additionally from the scriptlets,
        // also we need to use the VALUE_MARKER variable.
        // eslint-disable-next-line no-inner-declarations
        function splitProps(str: string) {
            const parts: string[] = [];
            let current = '';
            let i = 0;
            let insideRegex = false;
            let escapeActive = false;

            while (i < str.length) {
                const ch = str[i];

                if (!insideRegex) {
                    // split on whitespace (treat runs of whitespace as a single separator)
                    if (
                        ch === ' '
                        || ch === '\n'
                        || ch === '\t'
                        || ch === '\r'
                        || ch === '\f'
                        || ch === '\v'
                    ) {
                        // skip consecutive whitespace
                        while (i < str.length && /\s/.test(str[i])) {
                            i += 1;
                        }
                        if (current !== '') {
                            parts.push(current);
                            current = '';
                        }
                        continue;
                    }

                    // detect VALUE_MARKER followed by '/'
                    if (str.startsWith(VALUE_MARKER, i)) {
                        current += VALUE_MARKER;
                        i += VALUE_MARKER.length;
                        if (str[i] === '/') {
                            // enter regex mode and consume opening '/'
                            insideRegex = true;
                            escapeActive = false;
                            current += '/';
                            i += 1;
                            continue;
                        }
                        // no regex begins; continue as normal
                        continue;
                    }

                    current += ch;
                    i += 1;
                    continue;
                }

                // inside regex body: copy until we hit an unescaped '/'
                current += ch;
                if (ch === '\\') {
                    escapeActive = !escapeActive;
                } else if (ch === '/' && !escapeActive) {
                    insideRegex = false;
                    escapeActive = false;
                } else {
                    escapeActive = false;
                }
                i += 1;
            }

            if (current !== '') {
                parts.push(current);
            }

            return parts;
        }

        const rawParts = splitProps(props);
        const parts = rawParts.map((part) => {
            const splitPart = part.split(VALUE_MARKER);
            const path = splitPart[0];
            let value = splitPart[1] as any;
            if (value !== undefined) {
                if (value === 'true') {
                    value = true;
                } else if (value === 'false') {
                    value = false;
                } else if (value.startsWith(REGEXP_START_MARKER)) {
                    value = toRegExp(value);
                } else if (typeof value === 'string' && /^\d+$/.test(value)) {
                    value = parseFloat(value);
                }
                return { path, value };
            }
            return { path };
        });
        return parts;
    }

    return [];
};
