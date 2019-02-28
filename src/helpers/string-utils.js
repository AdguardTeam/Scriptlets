/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
export const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts search string to the regexp
 * @param {string} str search string
 * @returns {RegExp}
 */
export const toRegExp = (str) => {
    if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
    }
    return new RegExp(escapeRegExp(str));
};
