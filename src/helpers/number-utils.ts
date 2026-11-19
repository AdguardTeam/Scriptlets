/**
 * Determines whether the passed value is NaN
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
 *
 * @param num arbitrary value
 * @returns if provided value is NaN
 */
export const nativeIsNaN = (num: unknown): boolean => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isNaN || window.isNaN;
    return native(num);
};
/**
 * Checks whether a string consists of ASCII digits only, e.g. `117`, as `/^\d+$/` does, but without
 * a regular expression or a method of a string, e.g. `RegExp.prototype.test` or `String.prototype.charCodeAt`,
 * which another rule may hook, e.g. `abort-current-inline-script`, so that it throws while the rule runs.
 * Characters are compared by operators, which call no method.
 *
 * @param value String to check.
 * @returns True if the string is not empty and has only the digits `0`–`9`.
 */
export const isDigits = (value: string): boolean => {
    if (value === '') {
        return false;
    }
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] < '0' || value[i] > '9') {
            return false;
        }
    }
    return true;
};

/**
 * Determines whether the passed value is a finite number
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
 *
 * @param num arbitrary value
 * @returns if provided value is finite
 */
export const nativeIsFinite = (num: unknown): num is number => {
    // eslint-disable-next-line no-restricted-properties
    const native = Number.isFinite || window.isFinite;
    return native(num);
};

/**
 * Parses string for a number, if possible, otherwise returns null.
 *
 * @param rawString arbitrary string
 * @returns number or null if string not parsable
 */
export const getNumberFromString = (rawString: string): number | null => {
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
 * @param min range minimum
 * @param max range maximum
 * @returns random number
 */
export function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}
