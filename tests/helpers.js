export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        try {
            delete window[prop];
        } catch (e) {
            try {
                // Safari does not allow to delete property
                window[prop] = null;
            } catch (e) {
                // some tests can not set property of window which has only a getter.
                // e.g. 'popAdsProp' and 'popns' for set-popads-dummy scriptlet
            }
        }
    });
};

/**
 * Returns random number from range inclusively min and max
 *
 * @param {number} min minimum range limit
 * @param {number} max maximum range limit
 * @returns {number}
 */
export const getRandomNumber = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// eslint-disable-next-line no-eval
const evalWrapper = eval;

/**
 * Runs scriptlet with given args
 *
 * @param {string} name scriptlet name
 * @param {Array|undefined} args array of scriptlet args
 * @param {boolean} [verbose=true]
 */
export const runScriptlet = (name, args, verbose = true) => {
    const params = {
        name,
        args,
        verbose,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

/**
 * Runs redirect
 *
 * @param {string} name redirect name
 * @param {boolean} [verbose=true]
 */
export const runRedirect = (name, verbose = true) => {
    const params = {
        name,
        verbose,
    };
    const resultString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resultString);
};

/**
 * Clear cookie by name
 *
 * @param {string} cName
 */
export const clearCookie = (cName) => {
    // Without "path=/;" cookie is not to be re-set with no value
    document.cookie = `${cName}=; path=/; max-age=0`;
};

export const isSafariBrowser = () => navigator.vendor === 'Apple Computer, Inc.';
