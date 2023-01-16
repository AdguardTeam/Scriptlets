/**
 * Noop function
 *
 * @returns {undefined} undefined
 */
export const noopFunc = () => { };

/**
 * Function returns noopFunc
 *
 * @returns {Function} noopFunc
 */
export const noopCallbackFunc = () => noopFunc;

/**
 * Function returns null
 *
 * @returns {null} null
 */
export const noopNull = () => null;

/**
 * Function returns true
 *
 * @returns {boolean} true
 */
export const trueFunc = () => true;

/**
 * Function returns false
 *
 * @returns {boolean} false
 */
export const falseFunc = () => false;

/**
 * Function returns this
 *
 * @returns {this} this object
 */
export function noopThis() {
    return this;
}

/**
 * Function returns empty string
 *
 * @returns {string} empty string
 */
export const noopStr = () => '';

/**
 * Function returns empty array
 *
 * @returns {Array} empty array
 */
export const noopArray = () => [];

/**
 * Function returns empty object
 *
 * @returns {Object} empty object
 */
export const noopObject = () => ({});

/**
 * Function throws an error
 *
 * @throws
 */
export const throwFunc = () => {
    throw new Error();
};

/**
 * Function returns Promise.reject()
 *
 * @returns {Promise} rejected Promise
 */
export const noopPromiseReject = () => Promise.reject();

/**
 * Returns Promise object that is resolved with specified props
 *
 * @param {string} [responseBody='{}'] value to set as responseBody
 * @param {string} [responseUrl=''] value to set as responseUrl
 * @param {string} [responseType='default'] value to set as responseType
 * @returns {Promise<Response>|undefined} resolved Promise or undefined if Response interface is not available
 */
export const noopPromiseResolve = (responseBody = '{}', responseUrl = '', responseType = 'default') => {
    if (typeof Response === 'undefined') {
        return;
    }

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

    // eslint-disable-next-line consistent-return
    return Promise.resolve(response);
};
