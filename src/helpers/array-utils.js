/**
 * Some browsers do not support Array.prototype.flat()
 * for example, Opera 42 which is used for browserstack tests
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
 *
 * @param {Array} input arbitrary array
 * @returns {Array} flattened array
 */
export const flatten = (input) => {
    const stack = [];
    input.forEach((el) => stack.push(el));
    const res = [];
    while (stack.length) {
        // pop value from stack
        const next = stack.pop();
        if (Array.isArray(next)) {
            // push back array items, won't modify the original input
            next.forEach((el) => stack.push(el));
        } else {
            res.push(next);
        }
    }
    // reverse to restore input order
    return res.reverse();
};

/**
 * Predicate method to check if the array item exists
 *
 * @param {any} item arbitrary
 * @returns {boolean} if item is truthy or not
 */
export const isExisting = (item) => !!item;
