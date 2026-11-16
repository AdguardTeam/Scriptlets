import { logMessage } from './log-message';
import { toRegExp } from './string-utils';
import { parseUboOptions, uboPatternToRegExp } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of the replacement of the text of a response, shared by `trusted-replace-fetch-response`
 * and `trusted-replace-xhr-response`, which are parsed once, by `getAdgResponseTextReplacement()`
 * or `getUboResponseTextReplacement()`, and applied by `replaceResponseText()`.
 */
export interface ResponseTextReplacement {
    /**
     * Regular expression of the text to replace, or `null` to only log the requests.
     */
    pattern: RegExp | null;

    /**
     * Text to replace with, may contain `$1` etc.
     */
    replacement: string;

    /**
     * Regular expression which the text of the response has to match to be replaced, or `null` for any text.
     */
    includes: RegExp | null;

    /**
     * If true, the original and the modified text of the responses are logged.
     */
    shouldLogContent: boolean;

    /**
     * If true, as in uBO, the response is not replaced if its text has not changed,
     * otherwise, as in AdGuard syntax, it is replaced if its text matches the pattern.
     */
    isUnchangedReturned: boolean;
}

/**
 * Parses the text arguments of AdGuard `trusted-replace-fetch-response` and `trusted-replace-xhr-response`,
 * as before the options have been added:
 * - `pattern` — `*` for the whole text, a string, or a regular expression, see `toRegExp()`;
 *   an empty one with an empty `replacement` only logs the requests;
 * - `replacement` — text to replace with;
 * - `verbose` — `true` logs the original and the modified text.
 *
 * Extra arguments may be the option `includes`, followed by a string or a regular expression, see `toRegExp()`,
 * which the text of the response has to match, e.g. `'includes', 'adPlacements'`.
 *
 * Requires `logMessage`, `toRegExp` and `parseUboOptions`, with their dependencies, in the injections
 * of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param verbose `true` to log the content.
 * @param args Options which follow `verbose`, e.g. `['includes', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if an argument is invalid, which is logged.
 */
export const getAdgResponseTextReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    verbose: unknown,
    args: unknown[],
): ResponseTextReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const ALL_TEXT_MARKER = '*';
    const ALL_TEXT_REGEXP = /(\n|.)*/;

    // Only allow pattern as empty string for logging purposes
    if (pattern === '' && replacement !== '') {
        logMessage(source, 'Pattern argument should not be empty string');
        return null;
    }

    let patternRegexp: RegExp | null = null;
    if (pattern === ALL_TEXT_MARKER) {
        patternRegexp = ALL_TEXT_REGEXP;
    } else if (pattern !== '') {
        try {
            patternRegexp = toRegExp(pattern);
        } catch {
            // Such a rule did not replace any response before either
            logMessage(source, `Invalid pattern: ${pattern}`);
            return null;
        }
    }

    const options = parseUboOptions(args);
    let includes: RegExp | null = null;
    if (options.includes !== undefined) {
        try {
            includes = toRegExp(`${options.includes}`);
        } catch {
            logMessage(source, `Invalid includes: ${options.includes}`);
            return null;
        }
    }

    return {
        pattern: patternRegexp,
        replacement,
        includes,
        shouldLogContent: verbose === 'true',
        isUnchangedReturned: false,
    };
};

/**
 * Parses the text arguments of uBO `trusted-replace-fetch-response.js` and `trusted-replace-xhr-response.js`,
 * converted to AdGuard syntax, as uBO does:
 * - `pattern` — a string, matched literally once, or a regular expression with its own flags,
 *   see `uboPatternToRegExp()`; `*` is matched as the text `.*`, as uBO escapes the `.*` it is replaced with;
 *   an empty pattern does nothing in `trusted-replace-fetch-response.js`, but matches the beginning of the text
 *   in `trusted-replace-xhr-response.js`, so the replacement is prepended to the text, see `isEmptyPatternApplied`;
 * - `replacement` — text to replace with;
 * - named options follow `propsToMatch`: `includes, value` is a string or a regular expression which the text
 *   of the response has to match.
 *
 * Unlike uBO, which matches any text by an invalid regular expression of `pattern` or `includes`,
 * the rule with such one is not applied, which is logged.
 *
 * Requires `logMessage`, `parseUboOptions` and `uboPatternToRegExp` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param args Named options which follow `propsToMatch`, e.g. `['includes', 'ads']`.
 * @param isEmptyPatternApplied If true, an empty pattern matches the beginning of the text,
 * otherwise the rule with it is not applied.
 *
 * @returns Settings of the replacement, or `null` if the rule is not applied, e.g. with an invalid argument,
 * which is logged.
 */
export const getUboResponseTextReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    args: unknown[],
    isEmptyPatternApplied: boolean,
): ResponseTextReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const ALL_TEXT_MARKER = '*';
    const UBO_ALL_TEXT_PATTERN = '.*';

    if (pattern === '' && !isEmptyPatternApplied) {
        return null;
    }

    const patternRegexp = uboPatternToRegExp(pattern === ALL_TEXT_MARKER ? UBO_ALL_TEXT_PATTERN : pattern);
    if (patternRegexp === null) {
        logMessage(source, `Invalid regular expression of pattern: ${pattern}`);
        return null;
    }

    const options = parseUboOptions(args);
    let includes: RegExp | null = null;
    // As in uBO, an empty `includes` or `0` matches any text
    if (options.includes) {
        includes = uboPatternToRegExp(`${options.includes}`);
        if (includes === null) {
            logMessage(source, `Invalid regular expression of includes: ${options.includes}`);
            return null;
        }
    }

    return {
        pattern: patternRegexp,
        replacement,
        includes,
        shouldLogContent: false,
        isUnchangedReturned: true,
    };
};

/**
 * Replaces the text of a response by the settings parsed by `getAdgResponseTextReplacement()`
 * or `getUboResponseTextReplacement()`, and logs it if needed.
 *
 * Requires `logMessage`, `getRegexpTester` and `getNativeRegexpTest` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the replacement, with a pattern.
 * @param pattern Regular expression of the text to replace, i.e. `pattern` of the settings.
 * @param text Text of the response.
 * @param testRegexp Function which tests a text by a regular expression, see `getRegexpTester()`.
 *
 * @returns Replaced text, or `null` if the response is not replaced, e.g. as it does not include
 * the text of `includes`, or it does not match the pattern.
 */
export const replaceResponseText = (
    source: Source,
    settings: ResponseTextReplacement,
    pattern: RegExp,
    text: string,
    testRegexp: (regexp: RegExp, text: string) => boolean,
): string | null => {
    const {
        replacement,
        includes,
        shouldLogContent,
        isUnchangedReturned,
    } = settings;

    if (includes !== null) {
        includes.lastIndex = 0;
        if (!testRegexp(includes, text)) {
            return null;
        }
    }

    pattern.lastIndex = 0;
    if (!isUnchangedReturned && !testRegexp(pattern, text)) {
        return null;
    }

    if (shouldLogContent) {
        logMessage(source, `Original text content: ${text}`);
    }
    // The pattern is shared by all responses, so a sticky one would continue from the previous match otherwise
    pattern.lastIndex = 0;
    const modifiedText = text.replace(pattern, replacement);
    if (shouldLogContent) {
        logMessage(source, `Modified text content: ${modifiedText}`);
    }

    if (isUnchangedReturned && modifiedText === text) {
        return null;
    }

    return modifiedText;
};
