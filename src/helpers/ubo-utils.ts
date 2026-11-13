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
