/**
 * Parses named options of a uBO scriptlet, which follow its positional arguments
 * as key-value pairs, e.g. `reload, 1, domain, example.org` of `trusted-set-cookie`.
 * As in uBO, a value which consists of digits only is converted to a number,
 * so e.g. `reload, 0` disables the option, and a key without a value is ignored.
 *
 * @param args Arguments of the scriptlet after its positional ones.
 *
 * @returns Options by their keys, without a prototype, so a key cannot change it.
 */
export const parseUboOptions = (args: unknown[]): Record<string, unknown> => {
    const options: Record<string, unknown> = Object.create(null);

    for (let i = 0; i + 1 < args.length; i += 2) {
        const key = args[i];
        const rawValue = args[i + 1];
        if (typeof key !== 'string' || key === '') {
            continue;
        }
        options[key] = typeof rawValue === 'string' && /^\d+$/.test(rawValue)
            ? parseInt(rawValue, 10)
            : rawValue;
    }

    return options;
};

/**
 * Converts a pattern argument of a uBO scriptlet to a regular expression, as uBO `patternToRegex()` does:
 * - an empty pattern matches any text, i.e. is `/^/`;
 * - a regular expression literal, e.g. `/ads?/gi`, is used with its own flags only, so `flags` are ignored;
 * - other text is matched literally with `flags`, e.g. `gms` for all its occurrences,
 *   and as the whole text if `verbatim` is set, e.g. a node name.
 *
 * Unlike uBO, which matches any text by an invalid regular expression, it returns `null` for it,
 * so that a rule with an invalid pattern is not applied to every text.
 *
 * @param pattern Pattern argument of the scriptlet.
 * @param flags Flags of the regular expression of a literal pattern, e.g. `gms`.
 * @param verbatim If true, a literal pattern has to match the whole text.
 *
 * @returns Regular expression, or `null` if the pattern is an invalid regular expression.
 */
export const uboPatternToRegExp = (pattern: string, flags = '', verbatim = false): RegExp | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const REGEXP_LITERAL = /^\/(.+)\/([gimsu]*)$/;
    const SPECIAL_CHARS_REGEXP = /[.*+?^${}()|[\]\\]/g;

    if (pattern === '') {
        return /^/;
    }

    const match = REGEXP_LITERAL.exec(pattern);
    if (match === null) {
        const escaped = pattern.replace(SPECIAL_CHARS_REGEXP, '\\$&');
        return new RegExp(verbatim ? `^${escaped}$` : escaped, flags);
    }

    try {
        return new RegExp(match[1], match[2]);
    } catch {
        return null;
    }
};

/**
 * Parses a regular expression replacement of uBO scriptlets, e.g. `/ads?/no_ads/g` of `repl:/ads?/no_ads/g`,
 * exactly as uBO `parseReplaceFn()` does with its `ArglistParser`, using `/` as the separator:
 * - a separator escaped by an odd number of backslashes, e.g. `\/`, is a part of the pattern or the replacement,
 *   and the escaping backslash is removed from it;
 * - whitespaces around the pattern and the replacement are trimmed;
 * - a pattern or a replacement wrapped in quotes, e.g. `/"ads"/x/`, is used without the quotes,
 *   if the separator follows the closing quote;
 * - the flags follow the last separator, which is required.
 *
 * @param directive Replacement directive, which starts with `/`.
 *
 * @returns Regular expression and replacement,
 * or `null` if the directive is invalid, e.g. without a pattern, the last separator, or with an invalid pattern.
 */
export const parseUboReplaceDirective = (directive: string): { regexp: RegExp; replacement: string } | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const SEPARATOR = '/';
    const SEPARATOR_CODE = SEPARATOR.charCodeAt(0);
    const QUOTE_CODES = [0x22, 0x27, 0x60];
    const WHITESPACE_START_REGEXP = /^\s+/;
    const WHITESPACE_END_REGEXP = /(?:^|\S)(\s+)$/;
    const ODD_TRAILING_ESCAPE_REGEXP = /(?:^|[^\\])(?:\\\\)*\\$/;
    const TRAILING_ESCAPES_REGEXP = /\\+$/;

    if (directive.charCodeAt(0) !== SEPARATOR_CODE) {
        return null;
    }

    // State of uBO `ArglistParser`, the separator of which is changed to a quote while a quoted value is parsed
    const state = {
        actualSeparatorCode: SEPARATOR_CODE,
        actualSeparatorChar: SEPARATOR,
        quoteBeg: 0,
        argBeg: 0,
        argEnd: 0,
        separatorBeg: 0,
        separatorEnd: 0,
        transform: false,
    };

    const leftWhitespaceCount = (s: string): number => {
        const match = WHITESPACE_START_REGEXP.exec(s);
        return match === null ? 0 : match[0].length;
    };

    const rightWhitespaceCount = (s: string): number => {
        const match = WHITESPACE_END_REGEXP.exec(s);
        return match === null ? 0 : match[1].length;
    };

    const indexOfNextArgSeparator = (pattern: string, separatorCode: number): void => {
        state.argBeg = separatorCode !== SEPARATOR_CODE ? state.quoteBeg + 1 : state.quoteBeg;
        state.argEnd = state.argBeg;
        state.transform = false;
        if (separatorCode !== state.actualSeparatorCode) {
            state.actualSeparatorCode = separatorCode;
            state.actualSeparatorChar = String.fromCharCode(separatorCode);
        }
        while (state.argEnd < pattern.length) {
            const pos = pattern.indexOf(state.actualSeparatorChar, state.argEnd);
            if (pos === -1) {
                state.argEnd = pattern.length;
                return;
            }
            if (!ODD_TRAILING_ESCAPE_REGEXP.test(pattern.slice(0, pos))) {
                state.argEnd = pos;
                return;
            }
            state.transform = true;
            state.argEnd = pos + 1;
        }
    };

    const nextArg = (pattern: string, beg: number): void => {
        const len = pattern.length;
        state.quoteBeg = beg + leftWhitespaceCount(pattern.slice(beg));
        const quoteCode = pattern.charCodeAt(state.quoteBeg);
        if (QUOTE_CODES.includes(quoteCode)) {
            indexOfNextArgSeparator(pattern, quoteCode);
            if (state.argEnd !== len) {
                const quoteEnd = state.argEnd + 1;
                state.separatorBeg = quoteEnd;
                state.separatorEnd = quoteEnd + leftWhitespaceCount(pattern.slice(quoteEnd));
                if (state.separatorEnd === len) {
                    return;
                }
                if (pattern.charCodeAt(state.separatorEnd) === SEPARATOR_CODE) {
                    state.separatorEnd += 1;
                    return;
                }
            }
        }
        indexOfNextArgSeparator(pattern, SEPARATOR_CODE);
        state.separatorBeg = state.argEnd;
        state.separatorEnd = state.argEnd;
        if (state.separatorBeg < len) {
            state.separatorEnd += 1;
        }
        state.argEnd -= rightWhitespaceCount(pattern.slice(0, state.separatorBeg));
    };

    // Removes the backslash which escapes the separator, but not the escaped backslashes before it
    const normalizeArg = (arg: string): string => {
        const char = state.actualSeparatorChar;
        let rest = arg;
        let out = '';
        let pos = rest.lastIndexOf(char);
        while (pos !== -1) {
            out = rest.slice(pos) + out;
            rest = rest.slice(0, pos);
            const match = TRAILING_ESCAPES_REGEXP.exec(rest);
            if (match !== null) {
                // eslint-disable-next-line no-bitwise
                const tail = (match[0].length & 1) !== 0 ? match[0].slice(0, -1) : match[0];
                out = tail + out;
                rest = rest.slice(0, -match[0].length);
            }
            pos = rest.lastIndexOf(char);
        }
        return out === '' ? rest : rest + out;
    };

    nextArg(directive, 1);
    let pattern = directive.slice(state.argBeg, state.argEnd);
    if (state.transform) {
        pattern = normalizeArg(pattern);
    }
    if (pattern === '') {
        return null;
    }

    nextArg(directive, state.separatorEnd);
    let replacement = directive.slice(state.argBeg, state.argEnd);
    if (state.separatorEnd === state.separatorBeg) {
        return null;
    }
    if (state.transform) {
        replacement = normalizeArg(replacement);
    }

    const flags = directive.slice(state.separatorEnd);
    try {
        return { regexp: new RegExp(pattern, flags), replacement };
    } catch {
        return null;
    }
};

/**
 * Returns the value of a constant argument of trusted uBO scriptlets, exactly as uBO `validateConstantFn()` does
 * for a trusted source, e.g. for `trusted-replace-argument`:
 * - `undefined`, `false`, `true`, `null`, `''` or an empty string, `[]` or `emptyArr`, `{}` or `emptyObj`,
 *   `noopFunc`, `trueFunc`, `falseFunc` and `throwFunc`;
 * - an integer, but `undefined` if its absolute value is greater than 32767;
 * - `json:` followed by JSON, e.g. `json:"text"`, or JSON of an object with `value`, e.g. `{"value": "text"}`,
 *   but `undefined` if it is invalid;
 * - `undefined` for any other text.
 *
 * The `as` option wraps the value in a function which returns it, a function which returns such a function,
 * or a promise which is resolved or rejected with it, for `function`, `callback`, `resolved` and `rejected`.
 *
 * @param raw Constant argument.
 * @param options Named options of the scriptlet, e.g. `{ as: 'function' }`.
 *
 * @returns Value of the constant.
 */
export const getUboConstantValue = (raw: string, options: Record<string, unknown>): unknown => {
    // !IMPORTANT: Do not move constants outside of this function
    const MAX_INTEGER = 0x7FFF;
    const JSON_PREFIX = 'json:';

    let value: unknown;
    if (raw === 'undefined') {
        value = undefined;
    } else if (raw === 'false') {
        value = false;
    } else if (raw === 'true') {
        value = true;
    } else if (raw === 'null') {
        value = null;
    } else if (raw === "''" || raw === '') {
        value = '';
    } else if (raw === '[]' || raw === 'emptyArr') {
        value = [];
    } else if (raw === '{}' || raw === 'emptyObj') {
        value = {};
    } else if (raw === 'noopFunc') {
        value = function noopFunc() {};
    } else if (raw === 'trueFunc') {
        value = function trueFunc() {
            return true;
        };
    } else if (raw === 'falseFunc') {
        value = function falseFunc() {
            return false;
        };
    } else if (raw === 'throwFunc') {
        value = function throwFunc() {
            // As in uBO, an empty string is thrown
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw '';
        };
    } else if (/^-?\d+$/.test(raw)) {
        value = parseInt(raw, 10);
        if (Math.abs(Number(raw)) > MAX_INTEGER) {
            return undefined;
        }
    } else if (raw.startsWith(JSON_PREFIX)) {
        try {
            value = JSON.parse(raw.slice(JSON_PREFIX.length));
        } catch {
            return undefined;
        }
    } else if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
            value = JSON.parse(raw).value;
        } catch {
            return undefined;
        }
    }

    if (options.as === 'function') {
        return () => value;
    }
    if (options.as === 'callback') {
        return () => () => value;
    }
    if (options.as === 'resolved') {
        return Promise.resolve(value);
    }
    if (options.as === 'rejected') {
        return Promise.reject(value);
    }
    return value;
};

/**
 * Removes the escapes of `'` which the converter adds to the arguments of uBO rules, e.g. AGTree converts
 * `'it\'s'` or `it's` to `it\'s`, while uBO receives `it's`. `\"` is kept, as uBO keeps it as well,
 * e.g. in a script which is a replacement, unlike `fixQuotes()` of AdGuard arguments, which removes it too.
 *
 * @param arg Argument of a uBO rule converted to AdGuard syntax.
 *
 * @returns Argument without the escapes of `'`, or the argument as is if it is not a string.
 */
export const unescapeUboArgument = (arg: unknown): unknown => {
    // !IMPORTANT: Do not move constants outside of this function
    const ESCAPED_QUOTE_REGEXP = /\\'/g;
    return typeof arg === 'string' ? arg.replace(ESCAPED_QUOTE_REGEXP, "'") : arg;
};
