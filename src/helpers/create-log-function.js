/* eslint-disable no-new-func, prefer-spread, no-console */

/**
 * Takes source and returns log function if verbose is true
 * or returns hit function if verbose if false and hit function is provided
 * hit function is used only for the test purposes
 * @param {Source} source
 * @return {Function} returns log or hit function
 */
export const createLogFunction = (source) => {
    if (!source) {
        return () => {};
    }

    if (source.verbose === 'true') {
        return () => {
            console.log(`${source.ruleText} trace start`);
            if (console.trace) {
                console.trace();
            }
            console.log(`${source.ruleText} trace end`);
        };
    }

    /**
     * Attention!!!
     * For now source hit is used only for test purposes it can't be used for debug purposes in the
     * real products because it can be broken because of csp policy set up by our rules or by
     * website
     */
    if (!source.hit) {
        return () => {};
    }

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

    const func = stringToFunc(source.hit);
    return func.bind(null, source);
};
