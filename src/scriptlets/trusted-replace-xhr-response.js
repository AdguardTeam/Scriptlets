import {
    hit,
    logMessage,
    toRegExp,
    objectToString,
    matchRequestProps,
    getXhrData,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    isEmptyObject,
    interceptXhrResponses,
    getFunctionProxyProperty,
    matchStackTrace,
    addStackTraceMessageLine,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboPropsToMatch,
    matchUboProps,
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    getAdgXhrResponseReplacement,
    getUboXhrResponseReplacement,
    replaceXhrResponses,
    isDigits,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-xhr-response
 *
 * @description
 * Replaces response content of `xhr` requests if **all** given parameters match.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-xhr-response'[, pattern, replacement[, propsToMatch[, verbose[, ...options]]]])
 * ```
 *
 * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
 *   If set, `replacement` is required. Possible values:
 *     - `*` to match all text content
 *     - non-empty string
 *     - regular expression
 *   By default only first occurrence is replaced. To replace all occurrences use `g` flag in RegExp - `/pattern/g`.
 * - `replacement` — optional, should be set if `pattern` is set. String to replace matched content with.
 *   Empty string to remove content.
 * - `propsToMatch` — optional, string of space-separated properties to match for extra condition; possible props:
 *     - string or regular expression for matching the URL passed to `XMLHttpRequest.open()` call;
 *     - colon-separated pairs `name:value` where
 *         - `name` — string or regular expression for matching XMLHttpRequest property name
 *         - `value` — string or regular expression for matching the value of the option
 *           passed to `XMLHttpRequest.open()` call
 * - `verbose` — optional, boolean, if set to 'true' will log original and modified text content of XMLHttpRequests.
 * - `options` — optional, pairs of a name and a value which follow `verbose`, with the same meaning as in uBO:
 *     - `includes, value` — string or regular expression which the response text content has to match
 *       to be replaced, e.g. `'includes', '"adPlacements"'`. If it is an invalid regular expression,
 *       the rule is not applied.
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Usage with no arguments will log XMLHttpRequest objects to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > The response text content is replaced for any `responseType` except `document`, and the response
 * > has the `responseType` of the request, e.g. it is parsed as JSON for `json`.
 * > A request with `responseType` `document` is not modified.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-replace-xhr-response, "adPlacements", "no_ads", /player/, includes, adSlots)`:
 *
 * ```text
 * example.org##+js(trusted-replace-xhr-response, pattern, replacement[, propsToMatch[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `pattern` — a regular expression may have only the flags `gimsu`; `*` is matched as the text `.*`, as in uBO;
 *   if it is empty, the replacement is prepended to the response text content, as in uBO
 * - `propsToMatch` — the method and the URL passed to `XMLHttpRequest.open()` are matched, properties are
 *   separated by whitespaces, a property without a name is matched against the URL, and a value which starts
 *   with `!` must not match, as in uBO
 * - options are pairs of a name and a value which follow `propsToMatch`:
 *     - `includes, value` — string or regular expression which the response text content has to match
 * - only text responses are modified, i.e. with an empty `responseType` or `text`, as in uBO
 * - a rule with an invalid regular expression is not applied
 *
 * ### Examples
 *
 * 1. Log all XMLHttpRequests
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response')
 *     ```
 *
 * 1. Replace text content of XMLHttpRequests with specific url
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of XMLHttpRequests with specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'method:GET')
 *     ```
 *
 * 1. Replace text content of XMLHttpRequests matching by URL regex and request methods
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
 *     ```
 *
 *    <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of all XMLHttpRequests for example.com
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '*', '', 'example.com')
 *     ```
 *
 * 1. Replace "foo" text content with "bar" of all XMLHttpRequests for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', 'foo', 'bar', 'example.com', 'true')
 *     ```
 *
 * 1. Replace all "noAds=false" text content with "noAds=true" of all XMLHttpRequests for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '/noAds=false/g', 'noAds=true', 'example.com', 'true')
 *     ```
 *
 * 1. Replace `"adPlacements"` with `"no_ads"` in the responses of requests to URLs which contain `player`,
 *    if they contain `"adSlots"`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-xhr-response', '"adPlacements"', '"no_ads"', 'player', '', 'includes', '"adSlots"')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedReplaceXhrResponse(source, pattern = '', replacement = '', propsToMatch = '', ...extraArgs) {
    // do nothing if browser does not support Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof Proxy === 'undefined') {
        return;
    }

    let replacementSettings;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix,
    // and uBO arguments, i.e. named options instead of `verbose`
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        replacementSettings = getUboXhrResponseReplacement(
            source,
            typeof pattern === 'string' ? unescapeUboArgument(pattern) : '',
            typeof replacement === 'string' ? unescapeUboArgument(replacement) : '',
            typeof propsToMatch === 'string' ? unescapeUboArgument(propsToMatch) : '',
            extraArgs.map(unescapeUboArgument),
        );
    } else {
        const verbose = typeof extraArgs[0] !== 'undefined' ? extraArgs[0] : false;
        replacementSettings = getAdgXhrResponseReplacement(
            source,
            pattern,
            replacement,
            propsToMatch,
            verbose,
            extraArgs.slice(1),
        );
    }

    if (replacementSettings === null) {
        return;
    }

    replaceXhrResponses(source, replacementSettings);
}

export const trustedReplaceXhrResponseNames = [
    'trusted-replace-xhr-response',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-replace-xhr-response.js',
    'ubo-trusted-replace-xhr-response',
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceXhrResponse.primaryName = trustedReplaceXhrResponseNames[0];

trustedReplaceXhrResponse.injections = [
    hit,
    logMessage,
    objectToString,
    matchRequestProps,
    getXhrData,
    interceptXhrResponses,
    getFunctionProxyProperty,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboPropsToMatch,
    matchUboProps,
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    getAdgXhrResponseReplacement,
    getUboXhrResponseReplacement,
    replaceXhrResponses,
    // following helpers are needed for helpers above
    toRegExp,
    matchStackTrace,
    addStackTraceMessageLine,
    getMatchPropsData,
    getRequestProps,
    isValidParsedData,
    parseMatchProps,
    isValidStrPattern,
    isEmptyObject,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    getRegexpTester,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
