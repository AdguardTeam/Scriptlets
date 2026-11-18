import { backupRegExpValues, restoreRegExpValues } from './regexp-utils';
import { toRegExp } from './string-utils';
import { uboPatternToRegExp } from './ubo-utils';

/**
 * Pattern of the `matches` option of JSON scriptlets, e.g. `json-prune`, which the JSON text of a value
 * has to match, so that the value is processed, as uBO `json-edit` does.
 */
export type JsonTextMatch = {
    /**
     * False if the pattern is an invalid regular expression, so the rule is not applied.
     */
    isValid: boolean;

    /**
     * Pattern of the rule, for logs.
     */
    pattern: string;

    /**
     * String which the text has to contain, or a regular expression to test the text with,
     * or `null` if there is no pattern, so every value is processed.
     */
    matcher: string | RegExp | null;
};

/**
 * Parses the `matches` option of AdGuard syntax of JSON scriptlets, i.e. `matches` followed by its value
 * in the extra arguments, which follow the positional ones, e.g. `'matches', '/"adPlacements"/'`.
 * The value is a string which the text has to contain, or a regular expression with its own flags,
 * as `stack`, see `toRegExp()`, which removes escapes of quotes from a string, e.g. `it\'s` is `it's`.
 * An empty value, or no option, matches every value. If the option is set several times, its last value is used.
 *
 * Requires `toRegExp` in the injections of the scriptlet.
 *
 * @param extraArgs Arguments of the scriptlet after its positional ones.
 *
 * @returns Pattern which the text has to match.
 */
export const getAdgJsonTextMatch = (extraArgs: unknown[]): JsonTextMatch => {
    // !IMPORTANT: Do not move constants outside of this function
    const MATCHES_OPTION = 'matches';
    // `toRegExp()` reads only a value which starts with it as a regular expression
    const REGEXP_START_MARKER = '/';
    const ESCAPED_SINGLE_QUOTE_REGEXP = /\\'/g;
    const ESCAPED_DOUBLE_QUOTE_REGEXP = /\\"/g;

    let pattern = '';
    for (let i = 0; i + 1 < extraArgs.length; i += 1) {
        if (extraArgs[i] === MATCHES_OPTION) {
            pattern = String(extraArgs[i + 1]);
            i += 1;
        }
    }

    if (pattern === '') {
        return { isValid: true, pattern, matcher: null };
    }

    // A string is matched as a string, as `toRegExp()` matches it, but without a regular expression,
    // which would change `RegExp.$1` of the page
    if (!pattern.startsWith(REGEXP_START_MARKER)) {
        return {
            isValid: true,
            pattern,
            matcher: pattern
                .replace(ESCAPED_SINGLE_QUOTE_REGEXP, "'")
                .replace(ESCAPED_DOUBLE_QUOTE_REGEXP, '"'),
        };
    }

    try {
        return { isValid: true, pattern, matcher: toRegExp(pattern) };
    } catch {
        return { isValid: false, pattern, matcher: null };
    }
};

/**
 * Parses the `matches` option of uBO `json-edit`, i.e. the value of `matches` of its named options,
 * see `parseUboOptions()`, as uBO `initPattern()` does: a string which the text has to contain,
 * or a regular expression literal with its own flags, e.g. `/^.{1000,}/`. As in uBO, an empty value,
 * or `0`, which `parseUboOptions()` converts to a number, matches every value, and a value which consists
 * of other digits is a string, e.g. `123`.
 *
 * Unlike uBO, which throws for an invalid regular expression, so the scriptlet is not run, it returns
 * an invalid pattern, so the rule is not applied, which the scriptlet logs.
 *
 * Requires `uboPatternToRegExp` in the injections of the scriptlet.
 *
 * @param rawPattern Value of the `matches` option.
 *
 * @returns Pattern which the text has to match.
 */
export const getUboJsonTextMatch = (rawPattern: unknown): JsonTextMatch => {
    // !IMPORTANT: Do not move constants outside of this function
    // the same as of `uboPatternToRegExp()`
    const REGEXP_LITERAL = /^\/(.+)\/([gimsu]*)$/;

    if (!rawPattern) {
        return { isValid: true, pattern: '', matcher: null };
    }

    const pattern = String(rawPattern);
    // A string is matched as a string, as uBO does, which does not change `RegExp.$1` of the page
    if (REGEXP_LITERAL.exec(pattern) === null) {
        return { isValid: true, pattern, matcher: pattern };
    }

    const regexp = uboPatternToRegExp(pattern);
    return { isValid: regexp !== null, pattern, matcher: regexp };
};

/**
 * Checks whether a value is a text which the pattern of the `matches` option matches, e.g. the argument
 * of `JSON.parse()`. A value which is not a string, e.g. an object, has no text to test, so it is not
 * matched, and the rule does not process it. An error of testing, e.g. of `RegExp.prototype.test`
 * or `String.prototype.indexOf` which another rule has replaced, is not thrown to the page,
 * and the text is not matched then.
 * `RegExp.$1`, …, `RegExp.$9` of the page are restored after a regular expression has matched the text,
 * as by `matchStackTrace()`, as the page may read them after it has called the intercepted method.
 *
 * Requires `backupRegExpValues` and `restoreRegExpValues` in the injections of the scriptlet.
 *
 * @param matcher String which the text has to contain, or a regular expression.
 * @param value Value to test.
 * @param testRegexp Function which tests the text, saved when the rule runs, see `getRegexpTester()`.
 *
 * @returns True if the value is a matched text.
 */
export const isJsonTextMatched = (
    matcher: string | RegExp,
    value: unknown,
    testRegexp: (regexp: RegExp, text: string) => boolean,
): boolean => {
    if (typeof value !== 'string') {
        return false;
    }

    if (typeof matcher === 'string') {
        try {
            return value.indexOf(matcher) !== -1;
        } catch {
            return false;
        }
    }

    const regExpValues = backupRegExpValues();
    let isMatched = false;
    try {
        // a regular expression with `g` or `y` flag continues from its last match otherwise
        matcher.lastIndex = 0;
        isMatched = testRegexp(matcher, value);
    } catch {
        return false;
    }

    if (isMatched) {
        restoreRegExpValues(regExpValues);
    }
    return isMatched;
};
