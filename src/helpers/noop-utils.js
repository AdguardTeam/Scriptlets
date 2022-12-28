/**
 * Noop function
 * @return {undefined} undefined
 */
export const noopFunc = () => { };

/**
 * Function return noopFunc
 * @returns {Function}
 */
export const noopCallbackFunc = () => noopFunc;

/**
 * Function returns null
 * @return {null} null
 */
export const noopNull = () => null;

/**
 * Function returns true
 * @return {boolean} true
 */
export const trueFunc = () => true;

/**
 * Function returns false
 * @return {boolean} false
 */
export const falseFunc = () => false;

/**
 * Function returns this
 */
export function noopThis() {
    return this;
}

/**
 * Function returns empty string
 * @return {string} empty string
 */
export const noopStr = () => '';

/**
 * Function returns empty array
 * @return {Array} empty array
 */
export const noopArray = () => [];

/**
 * Function returns empty object
 * @return {Object} empty object
 */
export const noopObject = () => ({});

/**
 * Function throws an error
 * @throws
 */
export const throwFunc = () => {
    throw new Error();
};

/**
 * Function returns Promise.reject()
 */
export const noopPromiseReject = () => Promise.reject(); // eslint-disable-line compat/compat

/**
 * Returns Promise object that is resolved  value of response body
 * @param {string} [url=''] value of response url to set on response object
 * @param {string} [response='default'] value of response type to set on response object
 */
export const noopPromiseResolve = (responseBody = '{}', responseUrl = '', responseType = 'default') => {
    if (typeof Response === 'undefined') {
        return;
    }
    // eslint-disable-next-line compat/compat
    const response = new Response(responseBody, {
        status: 200,
        statusText: 'OK',
    });

    // Mock response' url & type to avoid adb checks
    // https://github.com/AdguardTeam/Scriptlets/issues/216
    Object.defineProperties(response, {
        url: { value: responseUrl },
        type: { value: responseType },
    });

    // eslint-disable-next-line compat/compat, consistent-return
    return Promise.resolve(response);
};
