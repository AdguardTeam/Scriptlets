import { isArbitraryObject } from './object-utils';
import { nativeIsNaN } from './number-utils';
import { ArbitraryObject } from '../../types/types';

/**
 * Matches an arbitrary value by matcher value.
 * Supported value types and corresponding matchers:
 * - string – exact string, part of the string or regexp pattern. Empty string `""` to match an empty string.
 * - number, boolean, null, undefined – exact value,
 * - object – partial of the object with the values as mentioned above,
 *         i.e by another object, that includes property names and values to be matched,
 * - array – partial of the array with the values to be included in the incoming array,
 *         without considering the order of values,
 * - function – not supported.
 *
 * @param value arbitrary value
 * @param matcher value matcher
 * @returns true, if incoming value matches the matcher value
 */
export function isValueMatched(value: unknown, matcher: unknown): boolean {
    if (typeof value === 'function') {
        return false;
    }

    if (nativeIsNaN(value)) {
        return nativeIsNaN(matcher);
    }

    if (
        value === null
        || typeof value === 'undefined'
        || typeof value === 'number'
        || typeof value === 'boolean'
    ) {
        return value === matcher;
    }

    if (typeof value === 'string') {
        if (typeof matcher === 'string' || matcher instanceof RegExp) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            return isStringMatched(value, matcher);
        }
        return false;
    }

    if (Array.isArray(value) && Array.isArray(matcher)) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return isArrayMatched(value, matcher);
    }

    if (isArbitraryObject(value) && isArbitraryObject(matcher)) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return isObjectMatched(value, matcher);
    }

    return false;
}

/**
 * Matches string by substring or regexp pattern.
 *
 * @param str incoming string
 * @param matcher string matcher
 * @returns true, if incoming string includes the matcher or matches the regexp pattern
 */
export function isStringMatched(str: string, matcher: string | RegExp): boolean {
    if (typeof matcher === 'string') {
        if (matcher === '') {
            return str === matcher;
        }
        return str.includes(matcher);
    }

    if (matcher instanceof RegExp) {
        return matcher.test(str);
    }

    return false;
}

/**
 * Matches incoming object by partial of the object, i.e by another object,
 * that includes property names and values to be matched.
 *
 * @param obj incoming object
 * @param matcher object matcher
 * @returns true, if incoming object includes all properties and corresponding values from the matcher
 */
export function isObjectMatched(obj: ArbitraryObject, matcher: ArbitraryObject): boolean {
    const matcherKeys = Object.keys(matcher);
    for (let i = 0; i < matcherKeys.length; i += 1) {
        const key = matcherKeys[i];

        const value = obj[key];
        if (!isValueMatched(value, matcher[key])) {
            return false;
        }

        continue;
    }

    return true;
}

/**
 * Matches array by partial of the array with the values to be included in the incoming array,
 * without considering the order of values.
 *
 * @param array incoming array
 * @param matcher array matcher
 * @returns true, if incoming array includes all values from the matcher
 */
export function isArrayMatched(array: unknown[], matcher: unknown[]): boolean {
    if (array.length === 0) {
        return matcher.length === 0;
    }

    // Empty array matcher matches empty array, which is not the case after the previous check
    if (matcher.length === 0) {
        return false;
    }

    for (let i = 0; i < matcher.length; i += 1) {
        const matcherValue = matcher[i];
        const isMatching = array.some((arrItem) => isValueMatched(arrItem, matcherValue));
        if (!isMatching) {
            return false;
        }

        continue;
    }

    return true;
}
