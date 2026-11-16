import {
    hit,
    objectToString,
    preventXhrBySettings,
    getAdgPreventXhrSettings,
    getUboPreventXhrSettings,
    parseUboPropsToMatch,
    matchUboProps,
    getRegexpTester,
    getNativeRegexpTest,
    generateUboContent,
    unescapeUboArgument,
    generateResponseContent,
    matchRequestProps,
    getXhrData,
    logMessage,
    toRegExp,
    isValidStrPattern,
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
 *         - `value` — single number (e.g. `50`) or range of numbers (e.g. `100-300`), values above 500000 are rejected
 *     - any other string is treated as **literal text** and returned as the response body as-is
 *     - `length:` can be combined with literal text in a single directive to
 *       repeat the text to the specified length, e.g.
 *       `'length:8000-10000 body ins.adsbygoogle'` or
 *       `'body ins.adsbygoogle length:8000-10000'`
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-prevent-xhr, /googlesyndication|doubleclick/, "dataset.probe='ready'")`:
 *
 * ```text
 * example.org##+js(trusted-prevent-xhr[, propsToMatch[, directive]])
 * ```
 *
 * They differ from the AdGuard syntax as follows, as in uBO:
 *
 * - `propsToMatch` is matched against the method and the URL passed to `XMLHttpRequest.open()` only:
 *     - a property without a name is the URL, e.g. `ads`, and other ones are `method:value`
 *     - a value is a text which the property has to contain, or a regular expression, e.g. `/ads/i`,
 *       and `!` before it negates it, e.g. `method:!POST`
 *     - an empty `propsToMatch` with a `directive` matches all requests, while `*` is a text
 * - requests are logged only if both `propsToMatch` and `directive` are empty
 * - `directive`:
 *     - `length:value` and `length:min-max` set a random text of this length, at most 500000,
 *       and cannot be combined with a text
 *     - `join:` followed by a separator of 2 characters joins the content of the directives which it separates,
 *       e.g. `join:||true||emptyObj`
 * - the response of a request with `json` as `responseType` is always `{}`
 * - the response headers are `date`, `content-type` of the response type and `content-length`
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
 * @added v2.5.0.
 */
/* eslint-enable max-len */
export function trustedPreventXhr(source: Source, propsToMatch?: string, directive?: string): void {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments
    const settings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboPreventXhrSettings(source, unescapeUboArgument(propsToMatch), unescapeUboArgument(directive), true)
        : getAdgPreventXhrSettings(source, propsToMatch, directive, true);

    if (settings === null) {
        return;
    }

    preventXhrBySettings(source, settings);
}

export const trustedPreventXhrNames = [
    'trusted-prevent-xhr',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-prevent-xhr.js',
    'ubo-trusted-prevent-xhr',
];

// eslint-disable-next-line prefer-destructuring
trustedPreventXhr.primaryName = trustedPreventXhrNames[0];

trustedPreventXhr.injections = [
    preventXhrBySettings,
    getAdgPreventXhrSettings,
    getUboPreventXhrSettings,
    parseUboPropsToMatch,
    matchUboProps,
    getRegexpTester,
    getNativeRegexpTest,
    generateUboContent,
    unescapeUboArgument,
    generateResponseContent,
    hit,
    objectToString,
    matchRequestProps,
    getXhrData,
    logMessage,
    toRegExp,
    isValidStrPattern,
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
