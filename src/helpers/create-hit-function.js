/* eslint-disable no-new-func, prefer-spread */

/**
 * takes source and creates hit function from source.hit
 * then binds to this function source
 * @param {Source} source
 * @return {Function} returns function
 */
export const createHitFunction = (source) => {
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
    const stringToFunc = (str) => {
        if (!str) {
            return () => {};
        }
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

        return new Function(`(${str})()`);
    };

    const { hit } = source;
    const func = stringToFunc(hit);
    return func.bind(null, source);
};
