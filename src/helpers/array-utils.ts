/**
 * Some browsers do not support Array.prototype.flat()
 * for example, Opera 42 which is used for browserstack tests
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
 *
 * @param input arbitrary array
 * @returns flattened array
 */
export const flatten = <T>(input: Array<T | T[]>): T[] => {
    const stack: Array<T | T[]> = [];
    input.forEach((el) => stack.push(el));
    const res: T[] = [];
    while (stack.length) {
        // pop value from stack
        const next = stack.pop();
        if (Array.isArray(next)) {
            // push back array items, won't modify the original input
            next.forEach((el) => stack.push(el));
        } else {
            res.push(next as T);
        }
    }
    // reverse to restore input order
    return res.reverse();
};

/**
 * Predicate method to check if the array item exists
 *
 * @param item arbitrary
 * @returns if item is truthy or not
 */
export const isExisting = (item: unknown): boolean => !!item;

/**
 * Converts NodeList to array
 *
 * @param {NodeList} nodeList arbitrary NodeList
 * @returns {Node[Array]} array of nodes
 */
export const nodeListToArray = (nodeList: NodeList): Node[] => {
    const nodes = [];
    for (let i = 0; i < nodeList.length; i += 1) {
        nodes.push(nodeList[i]);
    }
    return nodes;
};
