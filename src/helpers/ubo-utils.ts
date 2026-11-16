import { wrapConstantValue } from './noop-utils';

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
 * or a promise which is resolved or rejected with it, for `function`, `callback`, `resolved` and `rejected`,
 * see `wrapConstantValue()`, which is required in the injections of the scriptlet as well.
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

    // `as` of uBO is the same as `valueWrapper` of `set-constant`, e.g. `as, function` is `asFunction`
    const wrappers: Record<string, string> = {
        function: 'asFunction',
        callback: 'asCallback',
        resolved: 'asResolved',
        rejected: 'asRejected',
    };
    const wrapper = typeof options.as === 'string' && Object.prototype.hasOwnProperty.call(wrappers, options.as)
        ? wrappers[options.as]
        : '';
    return wrapConstantValue(value, wrapper);
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

/**
 * Returns a function which looks like a native one, as uBO `set-constant` does for `noopFunc`, `trueFunc`
 * and `falseFunc`: its `name` is the name of the property, and its `toString()` returns e.g.
 * `function adsEnabled() { [native code] }`, which cannot be redefined or deleted.
 *
 * @param fn Function to cloak.
 * @param name Name of the property which is set to the function.
 *
 * @returns Cloaked function.
 */
export const cloakUboFunction = (fn: Function, name: string): Function => {
    Object.defineProperty(fn, 'name', { value: name });
    return new Proxy(fn, {
        defineProperty(target, prop, descriptor) {
            if (prop !== 'toString') {
                return Reflect.defineProperty(target, prop, descriptor);
            }
            return true;
        },
        deleteProperty(target, prop) {
            if (prop !== 'toString') {
                return Reflect.deleteProperty(target, prop);
            }
            return true;
        },
        get(target, prop, receiver) {
            if (prop === 'toString') {
                // As in uBO, the function is bound, so its own `toString()` returns a native code as well
                return function toString() {
                    return `function ${name}() { [native code] }`;
                }.bind(null); // eslint-disable-line no-extra-bind
            }
            return Reflect.get(target, prop, receiver);
        },
    });
};

/**
 * Generates the content of a response of uBO scriptlets, e.g. `trusted-prevent-xhr.js`, exactly as uBO
 * `generateContentFn()` does:
 * - `true` is a random text of 10 characters, `emptyObj` is `{}`, `emptyArr` is `[]` and `emptyStr` is empty;
 * - `length:min-max` or `length:value` is a random text of this length, at most 500000, which consists of random
 *   alphanumeric parts separated by spaces, or an empty one if the directive is not exactly in this format;
 * - `join:` followed by a separator of 2 characters joins the content of the directives which it separates,
 *   e.g. `join:||true||emptyObj` is a random text followed by `{}`;
 * - `war:` is empty, as in uBO, which has disabled it for security reasons, see
 *   https://github.com/gorhill/uBlock/commit/150df125fd and https://github.com/gorhill/uBlock/commit/73ef1b23f7,
 *   while before it was the content of a web accessible resource of uBO, which AdGuard does not have;
 * - any other directive is the content as it is in trusted scriptlets, and empty in other ones.
 *
 * @param directive Directive of the content, e.g. `emptyObj`.
 * @param isTrusted If true, a directive which is not a keyword is the content as it is.
 *
 * @returns Content of the response.
 */
// A function declaration keeps its name in the built code, so that it can call itself for `join:`
export function generateUboContent(directive: string, isTrusted: boolean): string {
    // !IMPORTANT: Do not move constants outside of this function
    const LENGTH_REGEXP = /^length:(\d+)(?:-(\d+))?$/;
    const MAX_LENGTH = 500000;
    const RANDOM_LENGTH = 10;

    const randomize = (length: number): string => {
        const chunks: string[] = [];
        let textSize = 0;
        do {
            const chunk = Math.random().toString(36).slice(2);
            chunks.push(chunk);
            textSize += chunk.length;
        } while (textSize < length);
        return chunks.join(' ').slice(0, length);
    };

    if (directive === 'true') {
        return randomize(RANDOM_LENGTH);
    }
    if (directive === 'emptyObj') {
        return '{}';
    }
    if (directive === 'emptyArr') {
        return '[]';
    }
    if (directive === 'emptyStr') {
        return '';
    }
    if (directive.startsWith('length:')) {
        const match = LENGTH_REGEXP.exec(directive);
        if (match === null) {
            return '';
        }
        const min = parseInt(match[1], 10);
        const extent = Math.max(parseInt(match[2], 10) || 0, min) - min;
        const length = Math.min(min + extent * Math.random(), MAX_LENGTH);
        // eslint-disable-next-line no-bitwise
        return randomize(length | 0);
    }
    if (directive.startsWith('war:')) {
        // Disabled in uBO for security reasons, see the description of the function
        return '';
    }
    if (directive.startsWith('join:')) {
        return directive.slice(7)
            .split(directive.slice(5, 7))
            .map((part) => generateUboContent(part, isTrusted))
            .join('');
    }
    return isTrusted ? directive : '';
}
