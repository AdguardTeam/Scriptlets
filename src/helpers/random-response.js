import { getNumberFromString, nativeIsFinite } from './number-utils';

/**
 * Generate a random integer between two values, inclusive
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values_inclusive
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generate a random string, a length of the string is provided as an argument
 * @param {number} length
 * @returns {string}
 */
export function getRandomStrByLength(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=~';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Generate a random string
 * @param {string} customResponseText
 * @returns {string|null} random string or null if passed argument is invalid
 */
export function generateRandomResponse(customResponseText) {
    let customResponse = customResponseText;

    if (customResponse === 'true') {
        // Generate random alphanumeric string of 10 symbols
        customResponse = Math.random().toString(36).slice(-10);
        return customResponse;
    }

    customResponse = customResponse.replace('length:', '');
    const rangeRegex = /^\d+-\d+$/;
    // Return empty string if range is invalid
    if (!rangeRegex.test(customResponse)) {
        return null;
    }

    let rangeMin = getNumberFromString(customResponse.split('-')[0]);
    let rangeMax = getNumberFromString(customResponse.split('-')[1]);

    if (!nativeIsFinite(rangeMin) || !nativeIsFinite(rangeMax)) {
        return null;
    }

    // If rangeMin > rangeMax, swap variables
    if (rangeMin > rangeMax) {
        const temp = rangeMin;
        rangeMin = rangeMax;
        rangeMax = temp;
    }

    const LENGTH_RANGE_LIMIT = 500 * 1000;
    if (rangeMax > LENGTH_RANGE_LIMIT) {
        return null;
    }

    const length = getRandomIntInclusive(rangeMin, rangeMax);
    customResponse = getRandomStrByLength(length);
    return customResponse;
}
