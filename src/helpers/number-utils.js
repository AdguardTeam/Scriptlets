/**
 * Determines whether the passed value is NaN
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
 *
 * @param {any} num arbitrary value
 * @returns {boolean} if provided value is NaN
 */
export const nativeIsNaN = (num) => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isNaN || window.isNaN;
    return native(num);
};

/**
 * Determines whether the passed value is a finite number
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
 *
 * @param {any} num arbitrary value
 * @returns {boolean} if provided value is finite
 */
export const nativeIsFinite = (num) => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isFinite || window.isFinite;
    return native(num);
};

/**
 * Parses string for a number, if possible, otherwise returns null.
 *
 * @param {any} rawString arbitrary string
 * @returns {number|null} number or null if string not parsable
 */
export const getNumberFromString = (rawString) => {
    const parsedDelay = parseInt(rawString, 10);
    const validDelay = nativeIsNaN(parsedDelay)
        ? null
        : parsedDelay;
    return validDelay;
};

/**
 * Generate a random integer between two values, inclusive
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values_inclusive
 *
 * @param {number} min range minimum
 * @param {number} max range maximum
 * @returns {number} random number
 */
export function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}
