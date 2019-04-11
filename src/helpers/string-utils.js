/* eslint-disable no-new-func, prefer-spread */
/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
export const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts search string to the regexp
 * TODO think about nested dependencies, but be careful with dependency loops
 * @param {string} str search string
 * @returns {RegExp}
 */
export const toRegExp = (str) => {
    if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
};

/**
 * Converts string to function
 * @param {string} str string should be turned into function
 * @param {string[]} [args] array of parameters;
 * @param {string} [body] function body stringified
 * @return {function} return function build from arguments or noop function
 */
// eslint-disable-next-line arrow-body-style
export const stringToFunc = (str, args, body) => {
    if (args && body) {
        return Function.apply(null, args.concat(body));
    }

    return str ? new Function(str) : () => {};
};
