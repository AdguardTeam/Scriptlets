import {
    hit,
    objectToString,
    createPreventXhrCore,
    generateResponseContent,
    matchRequestProps,
    getXhrData,
    logMessage,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getRequestProps,
    getRandomIntInclusive,
    getRandomStrByLength,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @scriptlet prevent-xhr
 *
 * @description
 * Prevents `xhr` calls if **all** given parameters match.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-xhr-ifjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('prevent-xhr'[, propsToMatch[, randomize]])
 * ```
 *
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *       empty string or wildcard `*` for all `XMLHttpRequest.open()` calls match
 *         - colon-separated pairs `name:value` where
 *             - `name` is XMLHttpRequest object property name
 *             - `value` is string or regular expression for matching the value of the option
 *     passed to `XMLHttpRequest.open()` call
 * - `randomize` — defaults to `false` for empty responseText,
 *   optional argument to randomize responseText and response of matched XMLHttpRequest's response; possible values:
 *     - `true` to randomize responseText and response, random alphanumeric string of 10 symbols
 *     - `emptyObj` to set responseText and response to `{}`
 *     - `emptyArr` to set responseText and response to `[]`
 *     - `emptyStr` to set responseText and response to an empty string
 *     - colon-separated pair `name:value` string value to customize responseText and response data where
 *         - `name` — only `length` supported for now
 *         - `value` — single number (e.g. `50`) or range on numbers (e.g. `100-300`), limited to 500000 characters
 *
 * > Non-keyword values (e.g. literal text) are NOT passed through in the untrusted `prevent-xhr`
 * > scriptlet — they yield an empty string. Use `trusted-prevent-xhr` for literal-text passthrough.
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Log all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr')
 *     ```
 *
 * 1. Prevent all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', '*')
 *     example.org#%#//scriptlet('prevent-xhr', '')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'method:HEAD')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and specified request methods
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org method:/HEAD|GET/')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and randomize it's response text
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org', 'true')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and randomize it's response text with range
 *
 *     ```adblock
 *    example.org#%#//scriptlet('prevent-xhr', 'example.org', 'length:100-300')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and set response to empty object
 *
 *     ```adblock
 *     example.org#%#//scriptlet('prevent-xhr', 'example.org', 'emptyObj')
 *     ```
 *
 * @added v1.5.0.
 */
/* eslint-enable max-len */
export function preventXHR(source: Source, propsToMatch?: string, customResponseText?: string): void {
    createPreventXhrCore(source, propsToMatch, false, customResponseText);
}

export const preventXHRNames = [
    'prevent-xhr',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'no-xhr-if.js',
    'ubo-no-xhr-if.js',
    'ubo-no-xhr-if',
];

// eslint-disable-next-line prefer-destructuring
preventXHR.primaryName = preventXHRNames[0];

preventXHR.injections = [
    hit,
    objectToString,
    createPreventXhrCore,
    generateResponseContent,
    matchRequestProps,
    getXhrData,
    logMessage,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getNumberFromString,
    nativeIsFinite,
    nativeIsNaN,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getRequestProps,
    getRandomIntInclusive,
    getRandomStrByLength,
];
