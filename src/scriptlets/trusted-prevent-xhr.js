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

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-prevent-xhr
 *
 * @description
 * Prevents `xhr` calls if **all** given parameters match.
 *
 * Trusted version of [prevent-xhr](./about-scriptlets.md#prevent-xhr).
 * In addition to everything `prevent-xhr` supports, `trusted-prevent-xhr`
 * can return **arbitrary literal text** as the response body.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#no-xhr-ifjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-prevent-xhr'[, propsToMatch[, directive]])
 * ```
 *
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *       empty string or wildcard `*` for all `XMLHttpRequest.open()` calls match
 *         - colon-separated pairs `name:value` where
 *             - `name` is XMLHttpRequest object property name
 *             - `value` is string or regular expression for matching the value of the option
 *     passed to `XMLHttpRequest.open()` call
 * - `directive` — defaults to `false` for empty responseText,
 *   optional argument to set responseText and response of matched XMLHttpRequest's response; possible values:
 *     - `true` to randomize responseText and response, random alphanumeric string of 10 symbols
 *     - `emptyObj` to set responseText and response to `{}`
 *     - `emptyArr` to set responseText and response to `[]`
 *     - `emptyStr` to set responseText and response to an empty string
 *     - colon-separated pair `name:value` string value to customize responseText and response data where
 *         - `name` — only `length` supported for now
 *         - `value` — single number (e.g. `50`) or range on numbers (e.g. `100-300`), limited to 500000 characters
 *     - any other string is treated as **literal text** and returned as the response body as-is
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * 1. Log all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr', 'example.org')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and set literal response text
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr', 'example.org', '{"blocked":true}')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and randomize response text
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr', 'example.org', 'true')
 *     ```
 *
 * 1. Prevent XMLHttpRequests for specific url and set response to empty array
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr', 'example.org', 'emptyArr')
 *     ```
 *
 * 1. Prevent XMLHttpRequests and set response with fixed length
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prevent-xhr', 'example.org', 'length:100')
 *     ```
 *
 * @added unknown.
 */
/* eslint-enable max-len */
export function trustedPreventXhr(source, propsToMatch, directive) {
    createPreventXhrCore(source, propsToMatch, true, directive);
}

export const trustedPreventXhrNames = [
    'trusted-prevent-xhr',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedPreventXhr.primaryName = trustedPreventXhrNames[0];

trustedPreventXhr.injections = [
    createPreventXhrCore,
    generateResponseContent,
    hit,
    objectToString,
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
