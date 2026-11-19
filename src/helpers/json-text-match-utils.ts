import { isDigits } from './number-utils';
import { backupRegExpValues, restoreRegExpValues } from './regexp-utils';
import { toRegExp } from './string-utils';
import { uboPatternToRegExp } from './ubo-utils';

/**
 * Pattern of the `matches` option of JSON scriptlets, e.g. `json-prune`, which the JSON text of a value
 * has to match, so that the value is processed, as uBO `json-edit` does.
 */
export type JsonTextMatch = {
    /**
     * False if the pattern is an invalid regular expression, or the option has an invalid target,
     * so the rule is not applied.
     */
    isValid: boolean;

    /**
     * Pattern of the rule, or the option with an invalid target, for logs.
     */
    pattern: string;

    /**
     * String which the text has to contain, or a regular expression to test the text with,
     * or `null` if there is no pattern, so every value is processed.
     */
    matcher: string | RegExp | null;

    /**
     * What the pattern tests: an argument of the intercepted call, its `this`, or its result.
     */
    target: 'arg' | 'this' | 'result';

    /**
     * Index of the argument, for the `arg` target.
     */
    argIndex: number;
};

/**
 * Parses the `matches` option of AdGuard syntax of JSON scriptlets, i.e. `matches` followed by its value
 * in the extra arguments, which follow the positional ones, e.g. `'matches', '/"adPlacements"/'`.
 * The value is a string which the text has to contain, or a regular expression with its own flags,
 * as `stack`, see `toRegExp()`, which removes escapes of quotes from a string, e.g. `it\'s` is `it's`.
 * An empty value, or no option, matches every value. If the option is set several times, its last value is used.
 *
 * `matches` tests the first argument of the call, e.g. the text passed to `JSON.parse()`, as in uBO.
 * If `isTargetSupported` is set, e.g. for `trusted-json-set`, the name of the option may name another target,
 * as `jsonSource` does: `matches arg:N` for argument N, `matches this` for `this`, and `matches result`
 * for the result of the call. A target is invalid otherwise, e.g. for `json-prune`, which intercepts
 * only `JSON.parse()`, so a rule with it is not applied, instead of matching every value.
 *
 * Requires `toRegExp` in the injections of the scriptlet.
 *
 * @param extraArgs Arguments of the scriptlet after its positional ones.
 * @param isTargetSupported If true, the name of the option may name the target.
 *
 * @returns Pattern which the text has to match.
 */
export const getAdgJsonTextMatch = (extraArgs: unknown[], isTargetSupported = false): JsonTextMatch => {
    // !IMPORTANT: Do not move constants outside of this function
    const MATCHES_OPTION = 'matches';
    const ARG_TARGET_PREFIX = 'arg:';
    const THIS_TARGET = 'this';
    const RESULT_TARGET = 'result';
    // `toRegExp()` reads only a value which starts with it as a regular expression
    const REGEXP_START_MARKER = '/';
    const ESCAPED_SINGLE_QUOTE_REGEXP = /\\'/g;
    const ESCAPED_DOUBLE_QUOTE_REGEXP = /\\"/g;

    let option = '';
    let pattern = '';
    for (let i = 0; i + 1 < extraArgs.length; i += 1) {
        const arg = extraArgs[i];
        if (typeof arg === 'string' && (arg === MATCHES_OPTION || arg.startsWith(`${MATCHES_OPTION} `))) {
            option = arg;
            pattern = String(extraArgs[i + 1]);
            i += 1;
        }
    }

    let target: JsonTextMatch['target'] = 'arg';
    let argIndex = 0;
    const targetName = option.slice(MATCHES_OPTION.length).trim();
    if (targetName !== '') {
        if (isTargetSupported && targetName === THIS_TARGET) {
            target = 'this';
        } else if (isTargetSupported && targetName === RESULT_TARGET) {
            target = 'result';
        } else if (
            isTargetSupported
            && targetName.startsWith(ARG_TARGET_PREFIX)
            && isDigits(targetName.slice(ARG_TARGET_PREFIX.length))
        ) {
            argIndex = parseInt(targetName.slice(ARG_TARGET_PREFIX.length), 10);
        } else {
            return {
                isValid: false,
                pattern: option,
                matcher: null,
                target,
                argIndex,
            };
        }
    }

    if (pattern === '') {
        return {
            isValid: true,
            pattern,
            matcher: null,
            target,
            argIndex,
        };
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
            target,
            argIndex,
        };
    }

    try {
        return {
            isValid: true,
            pattern,
            matcher: toRegExp(pattern),
            target,
            argIndex,
        };
    } catch {
        return {
            isValid: false,
            pattern,
            matcher: null,
            target,
            argIndex,
        };
    }
};

/**
 * Parses the `matches` option of uBO `json-edit`, i.e. the value of `matches` of its named options,
 * see `parseUboOptions()`, as uBO `initPattern()` does: a string which the text has to contain,
 * or a regular expression literal with its own flags, e.g. `/^.{1000,}/`. As in uBO, an empty value,
 * or `0`, which `parseUboOptions()` converts to a number, matches every value, and a value which consists
 * of other digits is a string, e.g. `123`.
 *
 * It tests the first argument of the call, e.g. the text passed to `JSON.parse()`, as uBO does.
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
        return {
            isValid: true,
            pattern: '',
            matcher: null,
            target: 'arg',
            argIndex: 0,
        };
    }

    const pattern = String(rawPattern);
    // A string is matched as a string, as uBO does, which does not change `RegExp.$1` of the page
    if (REGEXP_LITERAL.exec(pattern) === null) {
        return {
            isValid: true,
            pattern,
            matcher: pattern,
            target: 'arg',
            argIndex: 0,
        };
    }

    const regexp = uboPatternToRegExp(pattern);
    return {
        isValid: regexp !== null,
        pattern,
        matcher: regexp,
        target: 'arg',
        argIndex: 0,
    };
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
