/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
 * Get string before regexp first match
 * @param {string} str
 * @param {RegExp} rx
 */
export const getBeforeRegExp = (str, rx) => {
    const index = str.search(rx);
    return str.substring(0, index);
};

export const startsWith = (str, prefix) => {
    return str && str.indexOf(prefix) === 0;
};

export const endsWith = (str, prefix) => {
    return str && str.indexOf(prefix) === str.length - 1;
};

export const substringAfter = (str, separator) => {
    if (!str) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? '' : str.substring(index + separator.length);
};

export const substringBefore = (str, separator) => {
    if (!str || !separator) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? str : str.substring(0, index);
};

/**
 * Wrap str in single qoutes and replaces single quotes to doudle one
 * @param {string} str
 */
export const wrapInSingleQuotes = (str) => {
    if ((str[0] === '\'' && str[str.length - 1] === '\'')
        || (str[0] === '"' && str[str.length - 1] === '"')) {
        str = str.substring(1, str.length - 1);
    }
    // eslint-disable-next-line no-useless-escape
    str = str.replace(/\'/g, '"');

    return `'${str}'`;
};

/**
 * Returns substring enclosed in the widest braces
 * @param {string} str
 */
export const getStringInBraces = (str) => {
    const firstIndex = str.indexOf('(');
    const lastIndex = str.lastIndexOf(')');
    return str.substring(firstIndex + 1, lastIndex);
};
