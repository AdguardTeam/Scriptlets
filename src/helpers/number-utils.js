/**
 * Determines whether the passed value is NaN
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
 * @param {*} num
 * @returns {boolean}
 */
export const nativeIsNaN = (num) => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isNaN || window.isNaN;
    return native(num);
};

/**
 * Determines whether the passed value is a finite number
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
 * @param {*} num
 * @returns {boolean}
 */
export const nativeIsFinite = (num) => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isFinite || window.isFinite;
    return native(num);
};

/**
 * Parses string for a number, if possible, otherwise returns null.
 * @param {*} rawString
 * @returns {number|null}
 */
export const getNumberFromString = (rawString) => {
    const parsedDelay = parseInt(rawString, 10);
    const validDelay = nativeIsNaN(parsedDelay)
        ? null
        : parsedDelay;
    return validDelay;
};
