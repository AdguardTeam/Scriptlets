/**
 * Noop function
 * @return {undefined} undefined
 */
export const noopFunc = () => { };

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
 * Function returns Promise.reject()
 */
export const noopPromiseReject = () => Promise.reject(); // eslint-disable-line compat/compat

/**
 * Returns Promise object that is resolved with a response
 */
export const noopPromiseResolve = (responseBody = '{}') => {
    // eslint-disable-next-line compat/compat
    const response = new Response(responseBody, {
        status: 200,
        statusText: 'OK',
    });
    // eslint-disable-next-line compat/compat
    return Promise.resolve(response);
};
