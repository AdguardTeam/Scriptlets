import {
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    forgeResponse,
    toRegExp,
    isValidStrPattern,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getFunctionProxyProperty,
    getThrownValueMessage,
    getRegexpTester,
    getNativeRegexpTest,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
    getAdgFetchResponseReplacement,
    getUboFetchResponseReplacement,
    replaceFetchResponses,
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    isDigits,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-fetch-response
 *
 * @description
 * Replaces response text content of `fetch` requests if **all** given parameters match.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-fetch-response'[, pattern, replacement[, propsToMatch[, verbose[, ...options]]]])
 * ```
 *
 * - `pattern` — optional, argument for matching contents of responseText that should be replaced.
 * If set, `replacement` is required. Possible values:
 *     - `*` to match all text content
 *     - non-empty string
 *     - regular expression
 *   By default only first occurrence is replaced. To replace all occurrences use `g` flag in RegExp - `/pattern/g`.
 * - `replacement` — optional, should be set if `pattern` is set. String to replace the response text content
 *   matched by `pattern`. Empty string to remove content. Defaults to empty string.
 * - `propsToMatch` — optional, string of space-separated properties to match; possible props:
 *     - string or regular expression for matching the URL passed to fetch call;
 *       empty string, wildcard `*` or invalid regular expression will match all fetch calls
 *     - colon-separated pairs `name:value` where
 *         <!-- markdownlint-disable-next-line line-length -->
 *         - `name` is [`init` option name](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
 *         - `value` is string or regular expression for matching the value of the option passed to fetch call;
 *           invalid regular expression will cause any value matching
 * <!-- markdownlint-disable-next-line line-length -->
 * - `verbose` — optional, boolean, if set to 'true' will log original and modified text content of fetch responses.
 *
 * - `options` — optional, pairs of a name and a value which follow `verbose`, with the same meaning as in uBO:
 *     - `includes, value` — string or regular expression which the response text content has to match
 *       to be replaced, e.g. `'includes', '"adPlacements"'`. If it is an invalid regular expression,
 *       the rule is not applied.
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Usage with no arguments will log fetch calls to browser console;
 * > it may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * > Scriptlet does nothing if response body can't be converted to text.
 *
 * > `fetch` is called once, so if it is rejected, e.g. by a network error, its rejection is passed to the page.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-replace-fetch-response, "adPlacements", "no_ads", player?, includes, adSlots)`:
 *
 * <!-- markdownlint-disable line-length -->
 * ```text
 * example.org##+js(trusted-replace-fetch-response, pattern, replacement[, propsToMatch[, ...options]])
 * ```
 * <!-- markdownlint-enable line-length -->
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `pattern` — a regular expression may have only the flags `gimsu`; `*` is matched as the text `.*`, as in uBO;
 *   if it is empty, the rule does nothing
 * - `propsToMatch` — properties are separated by whitespaces, a property without a name is matched against
 *   the URL, a value which starts with `!` must not match, and a property which the request does not have
 *   is ignored, as in uBO; only the properties which it names are read, each once, before native `fetch`
 *   reads them, so a getter of the page which returns another value on each read, e.g. of `body`,
 *   may give `fetch` another value than the matched one, while uBO calls `fetch` first,
 *   so only the value which it matches may differ
 * - options are pairs of a name and a value which follow `propsToMatch`:
 *     - `includes, value` — string or regular expression which the response text content has to match
 * - the original response is returned if its text content has not changed
 * - a rule with an invalid regular expression is not applied
 *
 * ### Examples
 *
 * 1. Log all fetch calls
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response')
 *     ```
 *
 * 1. Replace response text content of fetch requests with specific url
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', 'adb_detect:true', 'adb_detect:false', 'example.org')
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', 'example.org')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove all text content of fetch responses with specific request method
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'method:GET')
 *     ```
 *
 * 1. Replace response text content of fetch requests matching by URL regex and request methods
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/#EXT-X-VMAP-AD-BREAK[\s\S]*?/', '#EXT-X-ENDLIST', '/\.m3u8/ method:/GET|HEAD/')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Remove text content of all fetch responses for example.com
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '*', '', 'example.com')
 *     ```
 *
 * 1. Replace "foo" text content with "bar" of all fetch responses for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', 'foo', 'bar', 'example.com', 'true')
 *     ```
 *
 * 1. Replace all "noAds=false" text content with "noAds=true" of all fetch responses for example.com and log original and modified text content <!-- markdownlint-disable-line line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '/noAds=false/g', 'noAds=true', 'example.com', 'true')
 *     ```
 *
 * 1. Replace `"adPlacements"` with `"no_ads"` in the responses of requests to URLs which contain `player?`,
 *    if they contain `"adSlots"`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-fetch-response', '"adPlacements"', '"no_ads"', 'player?', '', 'includes', '"adSlots"')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */
export function trustedReplaceFetchResponse(
    source,
    pattern = '',
    replacement = '',
    propsToMatch = '',
    ...extraArgs
) {
    // do nothing if browser does not support fetch or Proxy (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
    if (typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined') {
        return;
    }

    let replacementSettings;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix,
    // and uBO arguments, i.e. named options instead of `verbose`
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        replacementSettings = getUboFetchResponseReplacement(
            source,
            typeof pattern === 'string' ? unescapeUboArgument(pattern) : '',
            typeof replacement === 'string' ? unescapeUboArgument(replacement) : '',
            typeof propsToMatch === 'string' ? unescapeUboArgument(propsToMatch) : '',
            extraArgs.map(unescapeUboArgument),
        );
    } else {
        const verbose = typeof extraArgs[0] !== 'undefined' ? extraArgs[0] : false;
        replacementSettings = getAdgFetchResponseReplacement(
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

    replaceFetchResponses(source, replacementSettings);
}

export const trustedReplaceFetchResponseNames = [
    'trusted-replace-fetch-response',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-replace-fetch-response.js',
    'ubo-trusted-replace-fetch-response',
    'ubo-trusted-rpfr.js',
    'ubo-trusted-rpfr',
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceFetchResponse.primaryName = trustedReplaceFetchResponseNames[0];

trustedReplaceFetchResponse.injections = [
    hit,
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    forgeResponse,
    getFunctionProxyProperty,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
    getAdgFetchResponseReplacement,
    getUboFetchResponseReplacement,
    replaceFetchResponses,
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    // following helpers are needed for helpers above
    getRegexpTester,
    getNativeRegexpTest,
    toRegExp,
    isValidStrPattern,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
