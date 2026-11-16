/**
 * Pattern of a property which a request of a uBO rule has to match, see `parseUboPropsToMatch()`.
 */
export interface UboPropNeedle {
    /**
     * Regular expression which the value of the property has to match, or `null` for any value.
     */
    regexp: RegExp | null;

    /**
     * False if the value must not match the regular expression, i.e. the pattern is negated by `!`.
     */
    expect: boolean;
}

/**
 * Parses `propsToMatch` of uBO scriptlets, e.g. of `trusted-replace-fetch-response.js`, as uBO
 * `parsePropertiesToMatchFn()` does, with the patterns parsed as uBO `initPattern()` with `canNegate`:
 * - properties are separated by whitespaces, and each one is `name:pattern`,
 *   or a pattern of the `implicit` property, e.g. `url`;
 * - only the text up to the second `:` is used, e.g. `url:https://example.org` is `url` with the pattern `https`,
 *   and a name with other characters than letters, digits, `_`, `$`, ` ` and `-`, e.g. `/https`,
 *   makes the whole text a pattern of the `implicit` property;
 * - a pattern is a regular expression literal with the flags `gimsu`, e.g. `/ads/i`, or a text which the value
 *   has to contain; `!` before it negates it, and an empty pattern matches any value;
 * - a later pattern of the same property replaces the earlier one.
 *
 * @param propsToMatch Properties to match, e.g. `/ads/ method:POST`.
 * @param implicit Name of the property of a pattern without a name, e.g. `url`, or empty to skip such patterns.
 *
 * @returns Patterns by the names of the properties, without a prototype,
 * or `null` if a pattern is an invalid regular expression, for which uBO does not apply the rule either.
 */
export const parseUboPropsToMatch = (
    propsToMatch: unknown,
    implicit = '',
): Record<string, UboPropNeedle> | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const SEPARATOR_REGEXP = /\s+/;
    const NAME_DIVIDER = ':';
    const NOT_NAME_CHARS_REGEXP = /[^$\w -]/;
    const NEGATION_MARKER = '!';
    const REGEXP_LITERAL = /^\/(.+)\/([gimsu]*)$/;
    const SPECIAL_CHARS_REGEXP = /[.*+?^${}()|[\]\\]/g;

    const needles: Record<string, UboPropNeedle> = Object.create(null);
    if (typeof propsToMatch !== 'string' || propsToMatch === '') {
        return needles;
    }

    const items = propsToMatch.split(SEPARATOR_REGEXP);
    for (let i = 0; i < items.length; i += 1) {
        const parts = items[i].split(NAME_DIVIDER);
        let name = parts[0];
        let pattern: string | undefined = parts[1];
        if (name === '') {
            continue;
        }
        if (pattern !== undefined && NOT_NAME_CHARS_REGEXP.test(name)) {
            name = `${name}${NAME_DIVIDER}${pattern}`;
            pattern = undefined;
        }
        if (pattern === undefined) {
            if (implicit === '') {
                continue;
            }
            pattern = name;
            name = implicit;
        }

        if (pattern === '') {
            needles[name] = { regexp: null, expect: true };
            continue;
        }

        const expect = !pattern.startsWith(NEGATION_MARKER);
        if (!expect) {
            pattern = pattern.slice(NEGATION_MARKER.length);
        }

        const match = REGEXP_LITERAL.exec(pattern);
        let regexp: RegExp;
        if (match === null) {
            // A text which the value has to contain, as by `String.prototype.includes()` of uBO
            regexp = new RegExp(pattern.replace(SPECIAL_CHARS_REGEXP, '\\$&'));
        } else {
            try {
                regexp = new RegExp(match[1], match[2]);
            } catch {
                return null;
            }
        }
        needles[name] = { regexp, expect };
    }

    return needles;
};

/**
 * Checks whether the properties of a request match the patterns parsed by `parseUboPropsToMatch()`,
 * as uBO `matchObjectPropertiesFn()` does: a property which the request does not have, i.e. `undefined`,
 * is skipped, and a value which is not a string is converted to JSON, or skipped if it cannot be.
 * Unlike uBO, the matching of a regular expression with `g` or `y` flag starts at the beginning of each value,
 * instead of where its previous match has ended.
 *
 * Requires `getRegexpTester` and `getNativeRegexpTest` in the injections of the scriptlet.
 *
 * @param needles Patterns by the names of the properties.
 * @param props Properties of the request, e.g. collected by `collateUboFetchArguments()`.
 * @param testRegexp Function which tests a text by a regular expression, see `getRegexpTester()`.
 *
 * @returns True if all the properties which the request has match their patterns.
 */
export const matchUboProps = (
    needles: Record<string, UboPropNeedle>,
    props: Record<string, unknown>,
    testRegexp: (regexp: RegExp, text: string) => boolean,
): boolean => {
    const names = Object.keys(needles);
    for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        const needle = needles[name];
        let value = props[name];
        if (value === undefined) {
            continue;
        }
        if (typeof value !== 'string') {
            try {
                value = JSON.stringify(value);
            } catch {
                // Skipped, as in uBO
            }
            if (typeof value !== 'string') {
                continue;
            }
        }
        if (needle.regexp === null) {
            continue;
        }
        needle.regexp.lastIndex = 0;
        if (testRegexp(needle.regexp, value as string) !== needle.expect) {
            return false;
        }
    }

    return true;
};

/**
 * Collects the properties of a `fetch()` call which uBO rules match, as uBO `collateFetchArgumentsFn()` does:
 * `url` of a resource which is not a `Request`, e.g. a string or a `URL`, or the properties of a clone of
 * the `Request`, which are overridden by the ones of the options.
 *
 * @param resource First argument of `fetch()`.
 * @param options Second argument of `fetch()`.
 * @param nativeRequestClone `Request.prototype.clone` saved when the scriptlet runs.
 *
 * @returns Properties of the call, without a prototype.
 */
export const collateUboFetchArguments = (
    resource: unknown,
    options: unknown,
    nativeRequestClone: (this: Request) => Request,
): Record<string, unknown> => {
    // !IMPORTANT: Do not move constants outside of this function
    const PROPS = [
        'body', 'cache', 'credentials', 'duplex', 'headers',
        'integrity', 'keepalive', 'method', 'mode', 'priority',
        'redirect', 'referrer', 'referrerPolicy', 'url',
    ];

    const out: Record<string, unknown> = Object.create(null);
    const collateKnownProps = (src: any) => {
        for (let i = 0; i < PROPS.length; i += 1) {
            const prop = PROPS[i];
            if (src[prop] !== undefined) {
                out[prop] = src[prop];
            }
        }
    };

    if (typeof resource !== 'object' || Object.prototype.toString.call(resource) !== '[object Request]') {
        out.url = `${resource}`;
    } else {
        let clone;
        try {
            clone = nativeRequestClone.call(resource as Request);
        } catch {
            // The properties of the request itself are collected then, as in uBO
        }
        collateKnownProps(clone || resource);
    }
    if (typeof options === 'object' && options !== null) {
        collateKnownProps(options);
    }

    return out;
};
