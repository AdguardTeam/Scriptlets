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
