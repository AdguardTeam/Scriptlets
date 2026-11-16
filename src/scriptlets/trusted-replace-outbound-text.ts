import {
    hit,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStrPattern,
    getPropertyInChain,
    getMethodOwner,
    getWildcardPropertyInChain,
    logMessage,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    toRegExp,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    getFunctionProxyProperty,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgOutboundTextReplacement,
    getUboOutboundTextReplacement,
    replaceOutboundText,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-outbound-text
 *
 * @description
 * Replace the text in the outbound function call.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/21e1ee30ee36c1b9a7a3c9f43ac97e52d8e79661
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 * ```text
 * example.org#%#//scriptlet('trusted-replace-outbound-text', methodPath[, textToReplace[, replacement[, decodeMethod[, stack[, logContent[, ...options]]]]]])
 * ```
 * <!-- markdownlint-enable line-length -->
 *
 * - `methodPath` — required, the name of the function to trap, it must have an object as an argument.
 *   Call with only `methodPath` as an argument will log all text content of the specified function to console,
 *   but only if function call returns a string, otherwise it will log information that content is not a string.
 * - `textToReplace` — optional, string or regular expression which should be replaced.
 *   By default it's set to `''`. If it's not set to other value and `logContent` is set, it will log the original content.
 *   If it is an invalid regular expression, the rule is not applied.
 * - `replacement` — optional, string which replace the matched text.
 *   By default it's set to '', so matched content will removed.
 * - `decodeMethod` — optional, string which specifies the method used to decode the content.
 *   For now supported value is 'base64'. By default it's set to `''` and no decoding is performed.
 *   If it's set and `logContent` is also set and `textToReplace` and `replacement` are not set,
 *   then it will log the decoded content.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 *   If it is an invalid regular expression, the rule is not applied.
 * - `logContent` — optional, if set to any value, the original and modified content will be logged.
 *   By default it's set to '' and no content will be logged.
 * - `options` — optional, pairs of a name and a value which follow `logContent`, with the same meaning as in uBO:
 *     - `condition, value` — string or regular expression which the text, after it is decoded, has to match
 *       to be replaced, e.g. `'condition', '/"ads":\[/'`. If it is an invalid regular expression,
 *       the rule is not applied.
 *
 * > Logging content may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-replace-outbound-text, atob, /.+/, , condition, /www|cloudfront/)`:
 *
 * ```text
 * example.org##+js(trusted-replace-outbound-text, propChain[, pattern[, replacement[, ...options]]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `pattern` — a regular expression may have only the flags `gimsu`;
 *   if it is empty, the text is logged
 * - `replacement` — text, or `json:` followed by JSON of a value, e.g. `json:"text"`
 * - options are pairs of a name and a value which follow `replacement`:
 *     - `condition, value` — string or regular expression which the text, after it is decoded, has to match
 *     - `encoding, base64` — the text is decoded before it is replaced, and encoded again after that
 * - base64 text is decoded if `atob()` decodes it, and returned as it is if it has not been replaced
 * - a rule with an invalid regular expression is not applied
 *
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Replace `foo` with 'bar' from the payload of the atob call:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar')
 *     ```
 *
 *     For instance, the following call will return `bar`
 *
 *     ```html
 *     const text = btoa('foo');
 *     atob(text);
 *     ```
 *
 * 1. Replace `disable_ads:false` with 'disable_ads:true' from the payload of the `Array.prototype.join` if content is encoded in base64:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', 'disable_ads:false', 'disable_ads:true', 'base64')
 *     ```
 *
 *     For instance, the following call will return `ZGlzYWJsZV9hZHM6dHJ1ZQ==` which is `'disable_ads:true'` after decoding
 *
 *     ```html
 *     const arrayBase64 = ['ZGlzYWJsZV9h','ZHM6ZmFsc2U=']; // `ZGlzYWJsZV9hZHM6ZmFsc2U=` after decoding is `disable_ads:false`
 *     arrayBase64.join('');
 *     ```
 *
 * 1. Replace `"loadAds":true` with `"loadAds":false` from the payload of the JSON.stringify if the stack trace contains `testStackFunction`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction')
 *     ```
 *
 *     For instance, the following call will return `'{"loadAds":false,"content":"bar"}'`
 *
 *     ```html
 *     const testStackFunction = () => JSON.stringify({ loadAds: true, content: 'bar' });
 *     testStackFunction();
 *     ```
 *
 * 1. Call with `decodeMethod` and `logContent` arguments will log original and decoded text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', '', '', 'base64', '', 'true')
 *     ```
 *
 * 1. Call with only first argument will log text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob')
 *     ```
 *
 * 1. Call with `logContent` argument will log original and modified text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar', '', '', 'true')
 *     ```
 *
 * 1. Replace any text from the payload of the `atob` call with an empty string if it contains `www` or `cloudfront`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', '/.+/', '', '', '', '', 'condition', '/www|cloudfront/')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v1.11.1.
 */
/* eslint-enable max-len */
export function trustedReplaceOutboundText(
    source: Source,
    methodPath: string,
    textToReplace = '',
    replacement = '',
    ...extraArgs: string[]
) {
    let outboundTextReplacement;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix,
    // and uBO arguments, i.e. named options instead of `decodeMethod`, `stack` and `logContent`
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        outboundTextReplacement = getUboOutboundTextReplacement(
            source,
            typeof methodPath === 'string' ? unescapeUboArgument(methodPath) as string : '',
            typeof textToReplace === 'string' ? unescapeUboArgument(textToReplace) as string : '',
            typeof replacement === 'string' ? unescapeUboArgument(replacement) as string : '',
            extraArgs.map(unescapeUboArgument),
        );
    } else {
        const decodeMethod = typeof extraArgs[0] !== 'undefined' ? extraArgs[0] : '';
        const stack = typeof extraArgs[1] !== 'undefined' ? extraArgs[1] : '';
        const logContent = typeof extraArgs[2] !== 'undefined' ? extraArgs[2] : '';
        outboundTextReplacement = getAdgOutboundTextReplacement(
            source,
            methodPath,
            textToReplace,
            replacement,
            decodeMethod,
            stack,
            logContent,
            extraArgs.slice(3),
        );
    }

    if (outboundTextReplacement === null) {
        return;
    }

    replaceOutboundText(source, outboundTextReplacement);
}

export const trustedReplaceOutboundTextNames = [
    'trusted-replace-outbound-text',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-replace-outbound-text.js',
    'ubo-trusted-replace-outbound-text',
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceOutboundText.primaryName = trustedReplaceOutboundTextNames[0];

trustedReplaceOutboundText.injections = [
    hit,
    matchStackTrace,
    addStackTraceMessageLine,
    isValidStrPattern,
    getPropertyInChain,
    getMethodOwner,
    getFunctionProxyProperty,
    logMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgOutboundTextReplacement,
    getUboOutboundTextReplacement,
    replaceOutboundText,
    // following helpers are needed for helpers above
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    toRegExp,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
];
