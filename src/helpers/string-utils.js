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
 *
 * @example
 * const str = 'function(name) { console.log(name) }';
 * const newFunc = stringToFunc(str);
 * newFunc('John Doe'); // console output 'John Doe'
 *
 * @returns {Function}
 */
export const stringToFunc = (str) => {
    /**
     * Returns arguments of the function
     * @source https://github.com/sindresorhus/fn-args
     * @param {function|string} [func] function or string
     * @returns {string[]}
     */
    const getFuncArgs = func => func.toString()
        .match(/(?:\((.*)\))|(?:([^ ]*) *=>)/)
        .slice(1, 3)
        .find(capture => typeof capture === 'string')
        .split(/, */)
        .filter(arg => arg !== '')
        .map(arg => arg.replace(/\/\*.*\*\//, ''));

    /**
    * Returns body of the function
    * @param {function|string} [func] function or string
    * @returns {string}
    */
    const getFuncBody = (func) => {
        const regexp = /(?:(?:\((?:.*)\))|(?:(?:[^ ]*) *=>))\s?({?[\s\S]*}?)/;
        const funcString = func.toString();
        return funcString.match(regexp)[1];
    };

    let body = '';
    let args = '';
    const hitArgs = getFuncArgs(str);
    if (hitArgs.length > 0) {
        body = getFuncBody(str);
        args = hitArgs;
    }

    if (args && body) {
        return Function.apply(null, args.concat(body));
    }

    return str ? new Function(`(${str})()`) : () => { };
};
