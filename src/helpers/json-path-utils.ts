import { getJsonSetValue, parseJsonSetArgumentValue } from './json-set-utils';
import { getThrownValueMessage } from './get-error-message';
import { logMessage } from './log-message';
import { matchStackTrace } from './match-stack';
import { logJsonContent } from './prune-utils';
import { parseKeywordValue } from './parse-keyword-value';
import { toRegExp } from './string-utils';
import { type Source } from '../scriptlets';

type JsonPathMutationMode = 'append' | 'merge' | 'remove' | 'set';
type JsonPathFilterOperator =
    | 'contains'
    | 'ends_with'
    | 'equal'
    | 'exists'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'
    | 'not_equal'
    | 'regex'
    | 'starts_with';
type JsonPathSyntaxMode = 'jsonpath' | 'legacy';

type JsonPathSelector = {
    steps: JsonPathStep[];
};

/**
 * Selector which has to match a number of nodes in the range for the command to be applied,
 * i.e. the part of the expression before `;$` or `{min,max};$`.
 */
type JsonPathPrecondition = {
    guards: JsonPathFilter[];
    max: number;
    min: number;
    selector: JsonPathSelector;
};

/**
 * Query to apply to a processed value, with its mutation, which is built from its value when the query is parsed,
 * so an invalid one rejects all the queries, and otherwise only when the query matches, see `JsonPathCache`.
 */
type JsonPathCommand = {
    mutation: JsonPathMutation | null;
    query: JsonPathParsedQuery;
};

/**
 * Query which is parsed once for a rule, see `JsonPathCache`, without its mutation, which is built from `valuePart`
 * for each processed value, so e.g. time keywords are resolved, and a JSON value is parsed, for each of them.
 */
type JsonPathParsedQuery = {
    guards: JsonPathFilter[];
    /**
     * True once the mutation has been built from the value of the query, which may fail for a reason which
     * is not of the query, e.g. `Date` of the page which throws for `$now$`, so it is checked until it succeeds.
     */
    isValueChecked: boolean;
    /**
     * True for a value `call([...])`, for which nodes are visited depth-first, as in uBO.
     */
    isCall: boolean;
    /**
     * True for an expression with `v2:` prefix, in which a filter tests the children of each node,
     * also of an object, and leading filters are steps, not guards.
     */
    isV2: boolean;
    mode: JsonPathMutationMode;
    preconditions: JsonPathPrecondition[];
    selector: JsonPathSelector;
    valuePart: string;
};

/**
 * Queries of a rule parsed by `jsonPath()`, by their text, which a scriptlet creates once, when it runs,
 * by `Object.create(null)`, so that they are not parsed again for each processed value,
 * e.g. on each call of an intercepted method, and passes to `jsonPath()`. A query which cannot be parsed
 * is `null`, so the rule is rejected without parsing it again.
 */
export type JsonPathCache = Record<string, JsonPathParsedQuery | null>;

type JsonPathMutation = {
    /**
     * Called for each matched node instead of assigning a value to it, e.g. by `call([...])`.
     */
    invoke?: (parent: any, key: number | string) => boolean;
    mode: JsonPathMutationMode;
    updater?: (currentValue: any) => any;
};

type JsonPathPropertyMatcher = RegExp | string;

type JsonPathStep = {
    filter?: JsonPathFilter;
    indexes?: number[];
    mode: 'computed-index' | 'filter' | 'index' | 'property' | 'slice' | 'wildcard';
    properties?: JsonPathPropertyMatcher[];
    recursive: boolean;
    slice?: {
        end?: number;
        start?: number;
        step?: number;
    };
    subtractLength?: number;
};

type JsonPathLogicalOperator = 'and' | 'or';

/**
 * Filter which compares the values selected by its selector, which is parsed with the expression,
 * so an invalid one, e.g. a regular expression of keys, rejects the expression before any query is applied.
 * A selector which starts with `$` is evaluated against the root of the document, as in RFC 9535 and uBO,
 * e.g. `$.flag` of `$.items[?$.flag]`, and one which starts with `@` or a step against the tested node.
 */
type JsonPathComparisonFilter = {
    comparisonSelector?: JsonPathSelector;
    comparisonValue?: any;
    operator: JsonPathFilterOperator;
    /**
     * Selector of the parents of the last step of `selector`, which a negation of uBO rules tests,
     * see `matchesUboNegation()`, built when it is first needed.
     */
    parentSelector?: JsonPathSelector;
    resolveComparisonAgainstRoot?: boolean;
    resolveSelectorAgainstRoot?: boolean;
    selector: JsonPathSelector;
};

type JsonPathLogicalFilter = {
    conditions: JsonPathFilter[];
    operator: JsonPathLogicalOperator;
};

type JsonPathNegationFilter = {
    condition: JsonPathFilter;
    operator: 'not';
};

type JsonPathFilter = JsonPathComparisonFilter | JsonPathLogicalFilter | JsonPathNegationFilter;

type JsonPathCandidate = {
    key: number | string | null;
    parent: any;
    /**
     * Candidate of the parent, from which the path is built, or `null` for the root.
     */
    parentCandidate: JsonPathCandidate | null;
    /**
     * Normalized resolved path, built by `getCandidatePath()` only when it is needed,
     * as most candidates, e.g. the ones checked by filters, never need it.
     */
    path?: string;
    value: any;
};

type JsonPathNativeObjects = {
    nativeParse?: typeof JSON.parse;
    nativeStringify?: typeof JSON.stringify;
};

type JsonPathArgumentValueParser = (
    argumentValue: string,
) => ReturnType<typeof parseJsonSetArgumentValue>;

type ResolvedJsonSyntax = {
    mode: JsonPathSyntaxMode;
};

type JsonPathMutationObserver = (() => void) | undefined;

/**
 * Resolves which syntax mode should be used for JSON mutation scriptlets.
 *
 * Accepts an explicit mode override when provided.
 * If mode cannot be determined safely, legacy mode is used.
 *
 * @param expression mutation selector or legacy path expression
 * @param mode explicit syntax mode override
 * @returns resolved syntax mode
 */
export function resolveJsonSyntaxMode(
    expression: string | undefined,
    mode: string | undefined,
): ResolvedJsonSyntax {
    const LEGACY_MODE = 'legacy';
    const JSONPATH_MODE = 'jsonpath';
    const JSONPATH_GUARD = '[?';
    const JSONPATH_ROOT_GUARD = '$';
    const JSONPATH_DOT_GUARD = '.';
    const JSONPATH_V2_PREFIX = 'v2:';

    const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
    if (normalizedMode === LEGACY_MODE || normalizedMode === JSONPATH_MODE) {
        return {
            mode: normalizedMode as JsonPathSyntaxMode,
        };
    }

    const normalizedExpression = typeof expression === 'string' ? expression.trim() : '';
    if (
        normalizedExpression.startsWith(JSONPATH_ROOT_GUARD)
        || normalizedExpression.startsWith(JSONPATH_GUARD)
        || normalizedExpression.startsWith(JSONPATH_DOT_GUARD)
        || normalizedExpression.startsWith(JSONPATH_V2_PREFIX)
    ) {
        return {
            mode: JSONPATH_MODE,
        };
    }

    return {
        mode: LEGACY_MODE,
    };
}

/**
 * Returns the index of the slash which closes a regular expression of JSONPath syntax, which starts
 * with the slash at a given index, so that scanners skip it as a whole, and its characters,
 * e.g. `.`, `=` or `[`, are not delimiters. A slash starts:
 * - a regular expression of property keys right after a dot, e.g. `./^ad_/`, which is read as a regular
 *   expression of JavaScript, i.e. with escapes and character classes, e.g. `./^a[/.]b/`, which contains
 *   neither `=` nor a space, as a name followed by a value or the next query is read as before,
 *   e.g. `./login=/` or `./login $.b./x/`, and which
 *   has to be followed by the end, a space, `.`, `[`, `]`, `)`, `=`, `+`, `;`, `{`, or, if filters are allowed,
 *   an operator of a filter, i.e. `!=`, `*=`, `^=`, `$=`, `&&`, `||`, `<` or `>`, e.g. `[?@./^ad/!=false]`,
 *   so e.g. `./api/*` or `./api/$metadata` of a selector are names, as before;
 * - a regular expression in brackets, after `[` or `,`, or at the start of the string, i.e. of the content
 *   of brackets, e.g. `[/^ad./]` or `/^a/,/^b/`, and one which a filter compares a value with,
 *   after `=` or `=~`, e.g. `[?.url=/ads[/?#]/]`, if filters are allowed. As before, its operand is read up to
 *   the next `,`, or `&&` and `||` of a filter, or the closing bracket or parenthesis, with quotes and brackets
 *   in it, and it is a regular expression only if the operand is one as a whole, e.g. `/ads[/?#]/`,
 *   while e.g. `/ads` of `[?@.url=/ads && @.b=="/c"]` is a text, which a filter compares with.
 *
 * @param str string to check in
 * @param index index of the slash
 * @param isFilterAllowed whether a slash after `=` may start a regular expression of a filter,
 * i.e. not at the top level of a selector, where `=` starts a value
 * @returns index of the closing slash, or -1 if the slash does not start a regular expression
 */
export function getJsonPathRegexpEnd(str: string, index: number, isFilterAllowed: boolean): number {
    // !IMPORTANT: Do not move constants outside of this function
    const SLASH = '/';
    const BACKSLASH = '\\';

    // Most characters are not a slash, so regular expressions below are not created for them
    if (str[index] !== SLASH) {
        return -1;
    }

    const WHITESPACE_REGEXP = /\s/;

    // The same as `parseLiteralValue()` and `parsePropertySelector()` of `jsonPath()` check
    const REGEXP_OPERAND_REGEXP = /^\/.*\/[a-z]*$/i;
    // A step, a value or a precondition after a regular expression of keys
    const KEY_REGEXP_FOLLOWER_REGEXP = /[\s.[\]()=+;{]/;
    // An operator of a filter after it, e.g. `@./^ad/!=false`, only as a whole, so e.g. `./api/*` or
    // `./api/$metadata` are names, as before
    const KEY_REGEXP_OPERATOR_REGEXP = /^(?:[!*^$]=|&&|\|\||[<>])/;

    let previous = index - 1;
    const isKeyRegexp = str[previous] === '.';
    while (previous >= 0 && WHITESPACE_REGEXP.test(str[previous])) {
        previous -= 1;
    }
    const isBracketRegexp = previous < 0 || str[previous] === '[' || str[previous] === ',';
    const isFilterRegexp = isFilterAllowed
        && (str[previous] === '=' || (str[previous] === '~' && str[previous - 1] === '='));

    if (isKeyRegexp) {
        let isInClass = false;
        for (let j = index + 1; j < str.length; j += 1) {
            const char = str[j];
            if (char === BACKSLASH) {
                j += 1;
            } else if (char === '=' || WHITESPACE_REGEXP.test(char)) {
                // A name followed by a value or by the next query, as before, e.g. `./login=/` of a selector
                // with a separate value `/`, `./account=Log in / Sign up`, or `./login $.routes./(ad|promo)/`
                return -1;
            } else if (isInClass) {
                isInClass = char !== ']';
            } else if (char === '[') {
                isInClass = true;
            } else if (char === SLASH) {
                const next = str[j + 1];
                const isFollowed = next === undefined
                    || KEY_REGEXP_FOLLOWER_REGEXP.test(next)
                    || (isFilterAllowed && KEY_REGEXP_OPERATOR_REGEXP.test(str.slice(j + 1, j + 3)));
                return isFollowed ? j : -1;
            }
        }
        return -1;
    }

    if (!isBracketRegexp && !isFilterRegexp) {
        return -1;
    }

    /**
     * Returns the end of the operand which starts at the slash.
     *
     * @param isQuoteTracked whether quotes are tracked, so delimiters inside them are a part of the operand
     * @returns index after the operand, or -1 if a quote is not closed
     */
    const findOperandEnd = (isQuoteTracked: boolean): { end: number } => {
        let end = index;
        let depth = 0;
        let quote: string | null = null;
        for (; end < str.length; end += 1) {
            const char = str[end];
            if (quote) {
                if (char === quote && str[end - 1] !== BACKSLASH) {
                    quote = null;
                }
            } else if (isQuoteTracked && (char === '"' || char === '\'')) {
                quote = char;
            } else if (char === '[' || char === '(' || char === '{') {
                depth += 1;
            } else if (char === ']' || char === ')' || char === '}') {
                if (depth === 0) {
                    break;
                }
                depth -= 1;
            } else if (depth === 0) {
                if (isFilterRegexp && (str.startsWith('&&', end) || str.startsWith('||', end))) {
                    break;
                }
                if (!isFilterRegexp && char === ',') {
                    break;
                }
            }
        }
        return { end: quote ? -1 : end };
    };

    // An operand is read with quotes, as before, e.g. `/a"&&"b/` or `/a"/]"b/`, but a quote may be a part
    // of a regular expression, e.g. `[?.title=/it's/]`, and then it is either not closed, or closed by a quote
    // of another part, e.g. `[?.title=/it's/] $.note=Don't show`, so the operand is read without quotes
    // if it is not a regular expression with them. A quote closed by a quote of a regular expression
    // of another query, e.g. `[?.t=/it's/]$.a [?.t=/it's/]$.b`, is read as before, i.e. as one query
    const quoted = findOperandEnd(true);
    const unquoted = findOperandEnd(false);
    const unquotedOperand = str.slice(index, unquoted.end).trimEnd();
    // The closing slash must not be escaped, e.g. `/a"\/&&"b/` is not `/a"\/`
    let backslashCount = 0;
    for (let j = unquotedOperand.lastIndexOf(SLASH) - 1; j >= 0 && unquotedOperand[j] === BACKSLASH; j -= 1) {
        backslashCount += 1;
    }
    const isUnquotedRegexp = REGEXP_OPERAND_REGEXP.test(unquotedOperand) && backslashCount % 2 === 0;
    const isQuotedRegexp = quoted.end !== -1
        && REGEXP_OPERAND_REGEXP.test(str.slice(index, quoted.end).trimEnd());
    const end = isQuotedRegexp || !isUnquotedRegexp ? quoted.end : unquoted.end;
    if (end === -1) {
        return -1;
    }

    const operand = str.slice(index, end).trimEnd();
    if (!REGEXP_OPERAND_REGEXP.test(operand)) {
        return -1;
    }

    return index + operand.lastIndexOf(SLASH);
}

/**
 * Splits an argument of JSONPath syntax into its queries, which are separated by spaces,
 * e.g. `$.ads $..banner=false` into `$.ads` and `$..banner=false`.
 *
 * A query after the first one starts with the root `$` followed by a step, e.g. `$.ads` or `$[0]`, so e.g.
 * `$now$`, `$5`, `$` or `$=1` do not start a query, with `v2:` followed by a selector, e.g. `v2:$.a`,
 * or with leading guards followed by such a root, e.g. `[?(@.ads)]$.config`, and after a query with a value
 * also with spaces before the root, e.g. `$.a=1 [?(@.ads)] $.config=2`. A dot or a bracket after a space
 * continues the selector, e.g. `$.a .b` is `$.a.b`, `$.a [0]` is `$.a[0]`, and `$.a [?(@.x)] $.b` is
 * `$.a[?(@.x)]` and `$.b`, as in one query, and in uBO, which ignores spaces, so only the first query
 * may start without the root, e.g. `.a $.b`. A space after `;` before the root continues the query,
 * e.g. `..adSlots; $.ads`, which is one query, so that `$.ads` is not removed unconditionally, although it is
 * not a precondition, which is `;$` without a space, e.g. `..adSlots;$.ads`, as in uBO. An argument with
 * a regular expression in brackets which contains a raw quote, e.g. `[?.t=/it's/]$.a $.b`, is one query,
 * as before, see `hasQuotedRegexp()`, so its queries need separate rules, or the quote written as `\x27`
 * or `\x22`. `&&` and `||` outside brackets are a part of a name, e.g. `$.ads $.labels.a || b` is `$.ads`
 * and `$.labels.a || b`.
 *
 * Each query is read as its selector and its value, after a top-level `=` or `+=`:
 * - in the selector, a space at the top level separates queries, i.e. not inside quotes, brackets,
 *   braces, parentheses, or a regular expression of a filter, e.g. `[?.t=/a b/]`,
 *   but only if the selector is complete, i.e. has more than `v2:` and leading guards, e.g. `[?(@.ads)] $.config`;
 * - a value which starts with `{`, `[`, `json:{`, `json:[`, `replace({`, `repl({` or `call([` ends where its
 *   brackets are closed, with spaces inside of its JSON strings, and a value which starts with a quote
 *   ends with the same quote, e.g. `="see $.ads"`, so a space followed by a query start separates queries then;
 * - any other value is a text, in which quotes, slashes and `=` are a part of it, e.g. `=Don't show`,
 *   `=/ad.js` or `=YWQ=`, and in which a space followed by a query start separates queries only if that query
 *   has its own value and selects a node, e.g. `$.t=see $.a=1`, while e.g. `$.t=see $.a`, `$.t=Costs 5 $`
 *   or `$.t=Total: $ = 5` is one query,
 *   so a query which takes `argumentValue` has to precede a text value, also a constant, e.g. `$.a=false $.b`
 *   is one query, as before; only the value `$remove$` after `=` of a trusted scriptlet, which removes
 *   the matched nodes, see `isRemoveValueSupported`, ends before a query start, e.g. `$.a=$remove$ $.b`
 *   is `$.a=$remove$` and `$.b`, while e.g. `$.a=$remove$ them` or `$.a+=$remove$ $.b` is one query; the value
 *   `replace:/regex/replacement/` ends only with the closing slash of its replacement, optionally followed by `g`,
 *   e.g. `=replace:/a $.b=1/c/` or `=replace:/x/see $.b=1/`, and it is the rest of the argument if the argument
 *   ends with such a slash, as before, e.g. `=replace:/x/path/ $.b=1/`, so such a value is followed by other queries
 *   only if the argument does not end with a slash, e.g. `=replace:/x/y/ $.b=1`;
 * - a value is missing only until its first character, e.g. `$.a= [1]`.
 *
 * A value of a separate argument is not split, see `buildJsonPathQueries()`, and neither are uBO rules
 * of `json-edit` scriptlets, see `jsonPath()`, in which uBO ignores spaces, e.g. `.a $.b` is one query.
 *
 * @param expression argument of JSONPath syntax
 * @param isRemoveValueSupported whether the value `$remove$` after `=` removes the matched nodes,
 * i.e. for trusted scriptlets, see `buildJsonPathQueries()`, so a query without its own value may follow it,
 * while it is a text for other ones, as before, as they may not set a value
 * @returns trimmed queries, a single one if the argument has no separator, none if it is empty
 */
export function splitJsonPathQueries(expression: string, isRemoveValueSupported = false): string[] {
    // !IMPORTANT: Do not move constants outside of this function
    // Root of a query after another one, followed by a step, e.g. `$.a` or `$[0]`, so e.g. `$`, `$=1`
    // or `$ = 5` is a part of the previous query, as before
    const ROOT_PATH_START_REGEXP = /^\$[.[]/;
    // Start of a selector after `v2:` of a query after another one, so e.g. `v2: mode` of a text is not a query
    const V2_SELECTOR_STARTS = '$.[*';
    const SEMICOLON = ';';
    // The same forms as `jsonPath()` reads, e.g. `call(` without an array is a text, as before
    const STRUCTURED_VALUE_REGEXP = /^(?:json:)?[[{]|^(?:replace|repl)\(\s*\{|^call\(\s*\[/;
    const WHITESPACE_REGEXP = /\s/;
    const V2_PREFIX = 'v2:';
    const GUARD_START = '[?';
    const REPLACE_PREFIX = 'replace:/';
    const REMOVE_VALUE_MARKER = '$remove$';
    const EQUAL = '=';
    const PLUS = '+';
    const SLASH = '/';
    const BACKSLASH = '\\';
    const DOUBLE_QUOTE = '"';
    const SINGLE_QUOTE = '\'';
    const OPENING_BRACKETS = '[{(';
    const CLOSING_BRACKETS = ']})';

    if (typeof expression !== 'string') {
        return [];
    }

    /**
     * Checks whether the character at a given index is preceded by an odd number of backslashes.
     *
     * @param str string to check in
     * @param index index of the character
     * @returns true when the character is escaped
     */
    const isEscaped = (str: string, index: number): boolean => {
        let count = 0;
        for (let j = index - 1; j >= 0 && str[j] === BACKSLASH; j -= 1) {
            count += 1;
        }
        return count % 2 !== 0;
    };

    /**
     * Returns the index of the closing quote of a quoted string.
     *
     * @param str string to check in
     * @param start index of the opening quote
     * @returns index of the closing one, or the last index if it is not closed
     */
    const findClosingQuote = (str: string, start: number): number => {
        for (let j = start + 1; j < str.length; j += 1) {
            if (str[j] === str[start] && !isEscaped(str, j)) {
                return j;
            }
        }
        return str.length - 1;
    };

    // Results of `getJsonPathRegexpEnd()` for the slashes of the expression, outside and inside brackets
    const regexpEnds = new Map<number, number>();
    const filterRegexpEnds = new Map<number, number>();

    /**
     * Returns the index of the slash which closes a regular expression which starts with the slash
     * at a given index of the expression, see `getJsonPathRegexpEnd()`. It is read once for each slash,
     * as it may read the rest of the expression, e.g. for each slash of `[?.a=/f0 [?.a=/f1`, which lookaheads
     * from each space would read again, so splitting such an argument would be cubic.
     *
     * @param index index of the slash
     * @param isFilterAllowed whether a slash after `=` may start a regular expression of a filter
     * @returns index of the closing slash, or -1 if the slash does not start a regular expression
     */
    const getRegexpEnd = (index: number, isFilterAllowed: boolean): number => {
        const ends = isFilterAllowed ? filterRegexpEnds : regexpEnds;
        let end = ends.get(index);
        if (end === undefined) {
            end = getJsonPathRegexpEnd(expression, index, isFilterAllowed);
            ends.set(index, end);
        }
        return end;
    };

    /**
     * Returns the index of the bracket which closes the opening bracket at a given index of the expression,
     * skipping quoted strings and regular expressions, see `getRegexpEnd()`.
     *
     * @param start index of the opening bracket
     * @returns index of the closing bracket, or -1 if it is not closed
     */
    const findClosingBracket = (start: number): number => {
        let depth = 0;
        for (let j = start; j < expression.length; j += 1) {
            const char = expression[j];
            // a filter is inside brackets
            const regexpEnd = char === SLASH ? getRegexpEnd(j, depth > 0) : -1;
            if (regexpEnd !== -1) {
                j = regexpEnd;
            } else if (char === DOUBLE_QUOTE || char === SINGLE_QUOTE) {
                j = findClosingQuote(expression, j);
            } else if (OPENING_BRACKETS.includes(char)) {
                depth += 1;
            } else if (CLOSING_BRACKETS.includes(char)) {
                depth -= 1;
                if (depth === 0) {
                    return j;
                }
            }
        }
        return -1;
    };

    /**
     * Checks whether the argument has a regular expression in brackets which contains a raw quote,
     * e.g. `[?.t=/it's/]` or `[?@.x=/a"b/]`. Its end is not certain, as it is read both with and without
     * regard to quotes, see `getJsonPathRegexpEnd()`, e.g. `/a"/` of `$.items[?@.x=/a"/] $.b=c/]` may also be
     * `/a"/] $.b=c/`, and splitting there would leave the first part as a broader filter. So such an argument
     * is one query, as before, and its queries need separate rules, or the quote written as `\x27` or `\x22`.
     *
     * @returns true when the argument has such a regular expression
     */
    const hasQuotedRegexp = (): boolean => {
        let depth = 0;
        for (let i = 0; i < expression.length; i += 1) {
            const char = expression[i];
            const regexpEnd = char === SLASH ? getRegexpEnd(i, depth > 0) : -1;
            if (regexpEnd !== -1) {
                if (depth > 0) {
                    for (let j = i + 1; j < regexpEnd; j += 1) {
                        if (expression[j] === DOUBLE_QUOTE || expression[j] === SINGLE_QUOTE) {
                            return true;
                        }
                    }
                }
                i = regexpEnd;
            } else if (depth > 0 && (char === DOUBLE_QUOTE || char === SINGLE_QUOTE)) {
                i = findClosingQuote(expression, i);
            } else if (OPENING_BRACKETS.includes(char)) {
                depth += 1;
            } else if (CLOSING_BRACKETS.includes(char) && depth > 0) {
                // a closing bracket without an opening one, e.g. of a text value `:)`, does not hide the next ones
                depth -= 1;
            }
        }
        return false;
    };

    /**
     * Returns the index after a structured value, e.g. `{"a": [1]}`, `json:{...}` or `repl({...})`,
     * whose brackets are closed, skipping JSON strings.
     *
     * @param start index of the value
     * @returns index after the value, or the length of the expression if its brackets are not closed
     */
    const findStructuredValueEnd = (start: number): number => {
        let depth = 0;
        let hasOpened = false;
        for (let j = start; j < expression.length; j += 1) {
            const char = expression[j];
            if (char === DOUBLE_QUOTE) {
                j = findClosingQuote(expression, j);
            } else if (OPENING_BRACKETS.includes(char)) {
                depth += 1;
                hasOpened = true;
            } else if (CLOSING_BRACKETS.includes(char)) {
                depth -= 1;
                if (hasOpened && depth === 0) {
                    return j + 1;
                }
            }
        }
        return expression.length;
    };

    /**
     * Returns the index of the first character after whitespaces.
     *
     * @param start index to start from
     * @returns index of the next character which is not a whitespace, or the length of the expression
     */
    const skipWhitespaces = (start: number): number => {
        let j = start;
        while (j < expression.length && WHITESPACE_REGEXP.test(expression[j])) {
            j += 1;
        }
        return j;
    };

    /**
     * Checks whether a query after another one starts at a given index, i.e. `v2:` followed by a selector,
     * e.g. `v2:$.a` or `v2:*[?@.ad]`,
     * the root `$` followed by a step, e.g. `$.a` or `$[0]`, or leading guards followed by it,
     * e.g. `[?(@.ads)]$.config`. After a value, there may be spaces before the root, e.g. `[?(@.ads)] $.config`,
     * while after a selector such guards are its filter, e.g. `$.a [?(@.x)] $.b` is `$.a[?(@.x)]` and `$.b`,
     * as `$.a` would be removed otherwise. The root alone or with a value, e.g. `$`, `$=1` or `$ = 5`,
     * and `v2:` without a selector, e.g. `v2: mode`, are a part of the previous query, as before.
     *
     * @param start index to check at
     * @param isAfterValue whether the previous query has a value
     * @returns true when a query starts there
     */
    const isQueryStart = (start: number, isAfterValue: boolean): boolean => {
        if (expression.startsWith(V2_PREFIX, start)) {
            const selectorStart = expression[skipWhitespaces(start + V2_PREFIX.length)];
            return selectorStart !== undefined && V2_SELECTOR_STARTS.includes(selectorStart);
        }
        let j = start;
        while (expression.startsWith(GUARD_START, j)) {
            const end = findClosingBracket(j);
            if (end === -1) {
                return false;
            }
            j = isAfterValue ? skipWhitespaces(end + 1) : end + 1;
        }
        return expression[j] === '$' && ROOT_PATH_START_REGEXP.test(expression.slice(j, j + 2));
    };

    /**
     * Checks whether a selector is complete, i.e. it has more than `v2:` prefix and leading guards,
     * which are followed by the rest of the same query, e.g. `[?(@.ads)] $.config`, and it does not end
     * with `;` before the root, e.g. `..adSlots; $.ads`, which would remove `$.ads` unconditionally if it were
     * split, although it is not a precondition with the space, while `;` before `v2:` or a guard is a part
     * of a name, e.g. `$.entities.&nbsp; v2:$.ads`.
     *
     *
     * @param start index of the selector
     * @param end index after the selector
     * @param isBeforeRoot whether the next query starts with the root `$`
     * @returns true when the selector is complete
     */
    const isSelectorComplete = (start: number, end: number, isBeforeRoot: boolean): boolean => {
        let last = end - 1;
        while (last >= start && WHITESPACE_REGEXP.test(expression[last])) {
            last -= 1;
        }
        // `;` before the root is kept with the selector of the same query, e.g. `..adSlots; $.ads`
        if (isBeforeRoot && last >= start && expression[last] === SEMICOLON) {
            return false;
        }
        let j = skipWhitespaces(start);
        // With `v2:` prefix leading filters are steps which select the children of the root, not guards
        if (expression.startsWith(V2_PREFIX, j)) {
            return skipWhitespaces(j + V2_PREFIX.length) <= last;
        }
        while (j <= last && expression.startsWith(GUARD_START, j)) {
            const guardEnd = findClosingBracket(j);
            if (guardEnd === -1 || guardEnd > last) {
                return false;
            }
            j = skipWhitespaces(guardEnd + 1);
        }
        return j <= last;
    };

    /**
     * Scans the selector of a query until its first decision point, i.e. its top-level `=` or `+=`, the end
     * of the expression, or a top-level space followed by a query start after a complete selector.
     *
     * @param start index of the query
     * @param from index to scan from, i.e. the start of the query, or of the next query, through which
     * the selector continues, see `findSelectorEnd()`
     * @returns index of the decision point, whether the selector is well-formed up to it, i.e. its quotes
     * in brackets are closed and it has no closing bracket without an opening one, and the index
     * of the next query, or -1 if the selector ends there
     */
    const scanToDecision = (start: number, from = start): { end: number; isWellFormed: boolean; next: number } => {
        let depth = 0;
        let isWellFormed = true;
        let i = from;
        while (i < expression.length) {
            const char = expression[i];
            const regexpEnd = char === SLASH ? getRegexpEnd(i, depth > 0) : -1;
            if (regexpEnd !== -1) {
                i = regexpEnd + 1;
            } else if (depth > 0 && (char === DOUBLE_QUOTE || char === SINGLE_QUOTE)) {
                // A quote outside brackets is a part of a name, e.g. `$.meta.don'tPrompt`, as the selector reads it
                const closingIndex = findClosingQuote(expression, i);
                if (closingIndex === i || expression[closingIndex] !== char || isEscaped(expression, closingIndex)) {
                    isWellFormed = false;
                }
                i = closingIndex + 1;
            } else if (OPENING_BRACKETS.includes(char)) {
                depth += 1;
                i += 1;
            } else if (CLOSING_BRACKETS.includes(char)) {
                depth -= 1;
                if (depth < 0) {
                    isWellFormed = false;
                }
                i += 1;
            } else if (depth === 0 && (char === EQUAL || (char === PLUS && expression[i + 1] === EQUAL))) {
                return { end: i, isWellFormed, next: -1 };
            } else if (depth === 0 && WHITESPACE_REGEXP.test(char)) {
                const next = skipWhitespaces(i);
                if (isQueryStart(next, false) && isSelectorComplete(start, i, expression[next] === '$')) {
                    return { end: i, isWellFormed, next };
                }
                i = next;
            } else {
                i += 1;
            }
        }
        return { end: expression.length, isWellFormed: isWellFormed && depth === 0, next: -1 };
    };

    /**
     * Returns the end of the selector of a query, i.e. the index of its top-level `=` or `+=`,
     * of the space which separates it from the next query, or the length of the expression.
     * A space separates the next query only if the selector of the next query is well-formed,
     * see `scanToDecision()`, otherwise the selector continues through it, e.g. `$.a $.b]` is one query.
     *
     * @param start index of the query
     * @returns index of the end of its selector
     */
    const findSelectorEnd = (start: number): number => {
        let decision = scanToDecision(start);
        while (decision.next !== -1 && !scanToDecision(decision.next).isWellFormed) {
            decision = scanToDecision(start, decision.next);
        }
        return decision.end;
    };

    /**
     * Checks whether a query has its own value, i.e. its selector ends with `=` or `+=`.
     *
     * @param start index of the query
     * @returns true when the query has a value
     */
    const hasOwnValue = (start: number): boolean => {
        const end = findSelectorEnd(start);
        return end < expression.length && !WHITESPACE_REGEXP.test(expression[end]);
    };

    if (hasQuotedRegexp()) {
        const trimmedExpression = expression.trim();
        return trimmedExpression === '' ? [] : [trimmedExpression];
    }

    const queries: string[] = [];
    let queryStart = skipWhitespaces(0);

    while (queryStart < expression.length) {
        const selectorEnd = findSelectorEnd(queryStart);
        if (selectorEnd === expression.length || WHITESPACE_REGEXP.test(expression[selectorEnd])) {
            queries.push(expression.slice(queryStart, selectorEnd).trim());
            queryStart = skipWhitespaces(selectorEnd);
            continue;
        }

        const isSetValue = expression[selectorEnd] === EQUAL;
        let i = skipWhitespaces(selectorEnd + (isSetValue ? 1 : 2));
        const valueStart = i;
        let isTextValue = false;
        // Index after the regular expression of `replace:/regex/replacement/`, or -1 for other values
        let replacementStart = -1;
        // The whole rest is tested, as spaces may precede the opening bracket, e.g. `replace( {`
        if (STRUCTURED_VALUE_REGEXP.test(expression.slice(i))) {
            i = findStructuredValueEnd(i);
        } else if (expression[i] === DOUBLE_QUOTE || expression[i] === SINGLE_QUOTE) {
            i = findClosingQuote(expression, i) + 1;
        } else {
            isTextValue = true;
            if (expression.startsWith(REPLACE_PREFIX, i)) {
                // The regular expression ends with the first slash which is not escaped
                i += REPLACE_PREFIX.length;
                while (i < expression.length && (expression[i] !== SLASH || isEscaped(expression, i))) {
                    i += 1;
                }
                replacementStart = i + 1;
            }
        }

        // If the rest of the argument ends with the closing slash of a replacement, it is the value as a whole,
        // as before, e.g. `replace:/x/path/ $.b=1/`, while e.g. `replace:/x/y/ $.b=1` is followed by a query
        const restOfArgument = expression.trimEnd();
        const isReplacementToEnd = replacementStart !== -1
            && restOfArgument.length > replacementStart
            && (restOfArgument.endsWith(SLASH) || restOfArgument.endsWith(`${SLASH}g`));

        // The rest of the value, until a space followed by the next query
        let nextQueryStart = expression.length;
        while (i < expression.length) {
            if (!WHITESPACE_REGEXP.test(expression[i])) {
                // A text after a quoted or a structured value is a part of it, e.g. `"Ads" by $.sponsor`,
                // so the value is a text, after which only a query with its own value starts
                isTextValue = true;
                i += 1;
                continue;
            }
            const next = skipWhitespaces(i);
            // The replacement of `replace:/regex/replacement/` ends with a slash, optionally followed by `g`,
            // e.g. `replace:/x/see $.b=1/` is one value
            const isAfterSlash = expression[i - 1] === SLASH
                || (expression[i - 1] === 'g' && expression[i - 2] === SLASH);
            const isReplacementOpen = isReplacementToEnd
                || (replacementStart !== -1 && (i <= replacementStart || !isAfterSlash));
            if (
                next < expression.length
                && !isReplacementOpen
                && isQueryStart(next, true)
                // `$remove$` is not a text which continues, so any query may follow it, e.g. `$.a=$remove$ $.b`
                && (
                    !isTextValue
                    || (isRemoveValueSupported
                        && isSetValue
                        && i - valueStart === REMOVE_VALUE_MARKER.length
                        && expression.startsWith(REMOVE_VALUE_MARKER, valueStart))
                    || hasOwnValue(next)
                )
                && scanToDecision(next).isWellFormed
            ) {
                nextQueryStart = next;
                break;
            }
            i = next;
        }

        queries.push(expression.slice(queryStart, i).trim());
        queryStart = nextQueryStart;
    }

    return queries;
}

/**
 * Returns the queries of an argument of JSONPath syntax of a rule, which a scriptlet gets once,
 * when it runs, and passes to `jsonPath()`, so the argument is not split again for each processed value.
 * uBO rules of `json-edit` scriptlets, e.g. `ubo-json-edit` or `ubo-json-edit-fetch-response.js`,
 * have one query, in which uBO ignores spaces, e.g. `.a $.b` is one query, so they are not split,
 * while other ones are split by `splitJsonPathQueries()`.
 *
 * @param source source of the scriptlet
 * @param expression argument of JSONPath syntax
 * @returns queries to pass to `jsonPath()`, none if the argument is empty
 */
export function getJsonPathQueries(source: Source, expression: string): string[] {
    // Part of names of uBO scriptlets with JSONPath syntax, e.g. `json-edit`, `ubo-json-edit-xhr-response.js`
    // or `ubo-trusted-json-edit`, while `json-prune` of uBO has no JSONPath syntax
    const UBO_JSON_EDIT_NAME_PART = 'json-edit';
    const TRUSTED_SCRIPTLET_PREFIX = 'trusted-';

    if (typeof expression !== 'string' || expression.trim() === '') {
        return [];
    }

    if (typeof source.name === 'string' && source.name.includes(UBO_JSON_EDIT_NAME_PART)) {
        // trimmed as other queries are, e.g. for `v2:` prefix
        return [expression.trim()];
    }

    // The value `$remove$` of a query is read as `jsonPath()` reads it, i.e. it removes nodes for trusted scriptlets
    const isTrusted = typeof source.name === 'string' && source.name.startsWith(TRUSTED_SCRIPTLET_PREFIX);
    return splitJsonPathQueries(expression, isTrusted);
}

/**
 * Builds a set-style JSONPath expression from a selector and mutation value.
 * Preserves the selector as-is when it already includes an inline mutation suffix.
 * When `argumentValue` is `$remove$`, preserves the selector so the downstream
 * JSONPath parser treats it as a remove command.
 * Several queries of one argument are built by `buildJsonPathQueries()`.
 *
 * @param selectorPath JSONPath selector without mutation suffix
 * @param argumentValue value to assign through JSONPath
 * @returns full JSONPath set expression or empty string when no mutation can be built
 */
export function buildJsonPathExpression(selectorPath: string, argumentValue: any): string {
    const REMOVE_VALUE_MARKER = '$remove$';
    const normalizedSelectorPath = selectorPath.trim();
    const EQUAL = '=';
    const PLUS_EQUAL = '+=';
    const BACKSLASH = '\\';
    const SINGLE_QUOTE = '\'';
    const DOUBLE_QUOTE = '"';
    const CURLY_BRACKET_OPEN = '{';
    const CURLY_BRACKET_CLOSE = '}';
    const ROUND_BRACKET_OPEN = '(';
    const ROUND_BRACKET_CLOSE = ')';
    const SQUARE_BRACKET_OPEN = '[';
    const SQUARE_BRACKET_CLOSE = ']';

    if (normalizedSelectorPath === '') {
        return normalizedSelectorPath;
    }

    let bracketDepth = 0;
    let braceDepth = 0;
    let parenthesisDepth = 0;
    let quote: string | null = null;

    for (let i = 0; i < normalizedSelectorPath.length; i += 1) {
        const currentChar = normalizedSelectorPath[i];

        if (quote) {
            if (currentChar === quote) {
                let backslashCount = 0;
                let k = i - 1;
                while (k >= 0 && normalizedSelectorPath[k] === BACKSLASH) {
                    backslashCount += 1;
                    k -= 1;
                }
                if (backslashCount % 2 === 0) {
                    quote = null;
                }
            }
            continue;
        }

        // A regular expression, e.g. of property keys `./^ad=/` or `[/^ad=/]`, is skipped,
        // so that `=` in it is not a mutation
        const regexpEnd = currentChar === '/'
            ? getJsonPathRegexpEnd(normalizedSelectorPath, i, bracketDepth > 0)
            : -1;
        if (regexpEnd !== -1) {
            i = regexpEnd;
            continue;
        }

        if (currentChar === SINGLE_QUOTE || currentChar === DOUBLE_QUOTE) {
            quote = currentChar;
            continue;
        }

        if (currentChar === SQUARE_BRACKET_OPEN) {
            bracketDepth += 1;
            continue;
        }
        if (currentChar === SQUARE_BRACKET_CLOSE) {
            bracketDepth -= 1;
            continue;
        }
        if (currentChar === CURLY_BRACKET_OPEN) {
            braceDepth += 1;
            continue;
        }
        if (currentChar === CURLY_BRACKET_CLOSE) {
            braceDepth -= 1;
            continue;
        }
        if (currentChar === ROUND_BRACKET_OPEN) {
            parenthesisDepth += 1;
            continue;
        }
        if (currentChar === ROUND_BRACKET_CLOSE) {
            parenthesisDepth -= 1;
            continue;
        }

        if (bracketDepth === 0 && braceDepth === 0 && parenthesisDepth === 0) {
            if (normalizedSelectorPath.startsWith(PLUS_EQUAL, i) || currentChar === EQUAL) {
                return normalizedSelectorPath;
            }
        }
    }

    if (argumentValue === REMOVE_VALUE_MARKER) {
        return normalizedSelectorPath;
    }

    if (argumentValue === undefined) {
        return '';
    }

    return `${normalizedSelectorPath}=${String(argumentValue)}`;
}

/**
 * Builds the queries of an argument of JSONPath syntax with a value which is set by each query without
 * its own value, e.g. `$.a $.b=1` with `false` into `$.a=false` and `$.b=1`, see `buildJsonPathExpression()`.
 * The value is appended after the argument is split, so it is never split, e.g. `Please wait ...`.
 * A query may also have `$remove$` as its own value, which removes the nodes it matches, as the same
 * `argumentValue` does, e.g. `$.a=$remove$ $.b=1`, and any query may follow it, e.g. `$.a=$remove$ $.b`.
 *
 * @param selectorPath argument of JSONPath syntax, with queries separated by spaces
 * @param argumentValue value to assign through JSONPath
 * @returns queries to pass to `jsonPath()`, or none if a query has no value, so the rule is not applied
 */
export function buildJsonPathQueries(selectorPath: string, argumentValue: any): string[] {
    const queries = splitJsonPathQueries(selectorPath, true);
    const builtQueries: string[] = [];
    for (let i = 0; i < queries.length; i += 1) {
        const builtQuery = buildJsonPathExpression(queries[i], argumentValue);
        if (builtQuery === '') {
            return [];
        }
        builtQueries.push(builtQuery);
    }
    return builtQueries;
}

/**
 * Removes, sets, or appends values selected by a JSONPath-like expression.
 *
 * Supported behavior is intentionally scoped to mutation use cases: path
 * traversal, recursive descent, unions, slices, filters, guards, and
 * equal or plus-equal mutation suffixes.
 *
 * @param source source descriptor used for logging and parsing
 * @param root JSON object or array to mutate
 * @param path JSONPath expression with optional mutation suffix; empty path logs the payload.
 * Several queries may be separated by spaces, see `getJsonPathQueries()`, or passed as an array,
 * which is not split again, e.g. by a scriptlet which gets them once, by `getJsonPathQueries()`
 * or `buildJsonPathQueries()`
 * @param nativeObjects optional bag of native object references
 * @param onMutation optional callback fired once if any mutation happens
 * @param stack optional stack trace pattern that must match for processing to occur
 * @param matchOnly when true, evaluates guards and selector matches without mutating `root`
 * @param cache optional queries parsed before for the same rule, to which parsed ones are added,
 * see `JsonPathCache`
 * @returns mutated root value
 */
export const jsonPath = (
    source: Source,
    root: Record<string, any>,
    path: string | string[],
    nativeObjects: JsonPathNativeObjects,
    onMutation?: JsonPathMutationObserver,
    stack = '',
    matchOnly = false,
    cache?: JsonPathCache,
): any => {
    const ROOT_PATH = '$';
    const DOT = '.';
    const DOUBLE_DOT = '..';
    const WILDCARD = '*';
    const EMPTY_STRING = '';
    const BACKSLASH = '\\';
    const QUESTION_MARK = '?';
    const COLON = ':';
    const COMMA = ',';
    const EQUAL = '=';
    const PLUS_EQUAL = '+=';
    const PLUS_PLUS_EQUAL = '++=';
    const SINGLE_QUOTE = '\'';
    const DOUBLE_QUOTE = '"';
    const ROUND_BRACKET_OPEN = '(';
    const ROUND_BRACKET_CLOSE = ')';
    const SQUARE_BRACKET_OPEN = '[';
    const SQUARE_BRACKET_CLOSE = ']';
    const CURLY_BRACKET_OPEN = '{';
    const CURLY_BRACKET_CLOSE = '}';
    const EXPRESSION_OPEN_STRING = '[?';
    const AT_SIGN = '@';
    const TRUSTED_SCRIPTLET_PREFIX = 'trusted-';
    // uBO aliases of trusted scriptlets, e.g. `ubo-trusted-json-edit`, which are trusted as well
    const UBO_TRUSTED_SCRIPTLET_PREFIX = 'ubo-trusted-';
    const REMOVE_VALUE_MARKER = '$remove$';
    const FILTER_OPERATORS = {
        CONTAINS: 'contains',
        ENDS_WITH: 'ends_with',
        EQUAL: 'equal',
        EXISTS: 'exists',
        GREATER_THAN: 'greater_than',
        GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
        LESS_THAN: 'less_than',
        LESS_THAN_OR_EQUAL: 'less_than_or_equal',
        NOT_EQUAL: 'not_equal',
        REGEX: 'regex',
        STARTS_WITH: 'starts_with',
    } as const;
    const OPERATORS = ['==', '!=', '<=', '>=', '*=', '^=', '$=', '=~', '<', '>', '='];
    const SLASH = '/';
    const SEMICOLON = ';';
    const V2_PREFIX = 'v2:';
    // Range of a count of matches which `;$` requires, i.e. at least one
    const DEFAULT_MIN_COUNT = 1;
    const DEFAULT_MAX_COUNT = 1e6;
    // `{min,max}` before `;$`, either of which may be omitted, e.g. `{2}`, `{1,}` or `{,3}`
    const QUANTIFIER_REGEXP = /\{(\d+|\d+,\d+|\d+,|,\d+)\}$/;
    // Placeholders of uBO syntax, which are not template strings
    /* eslint-disable no-template-curly-in-string */
    const CALL_OBJECT_PLACEHOLDER = '${obj}';
    const CALL_KEY_PLACEHOLDER = '${key}';
    const CALL_VALUE_PLACEHOLDER = '${val}';
    /* eslint-enable no-template-curly-in-string */
    // Hard ceilings for a single recursive descent. Cycles are detected by
    // object identity, but a non-caching proxy or getter that mints a fresh
    // wrapper on every property read defeats identity checks, so traversal
    // must also be bounded explicitly. Such a laundered cycle grows in depth
    // (and the depth cap stops it after a few thousand nodes), while large
    // legitimate payloads grow in width and stay far below both limits.
    //
    // Only object-valued candidates count toward MAX_RECURSIVE_CANDIDATES.
    // Primitive values (numbers, strings, booleans) can never form a cycle,
    // so counting them would fire the budget on large arrays of primitives.
    const MAX_RECURSIVE_CANDIDATES = 100000;
    // Value which an updater returns to assign nothing, e.g. `repl({...})` for a value which is not a string
    const UNCHANGED_VALUE = {};
    // Value which an updater returns if it has changed the value itself, e.g. `+=` which merges into an object,
    // so nothing is assigned, as uBO does, while the value is modified
    const MUTATED_IN_PLACE = {};
    // Names of uBO rules whose values are JSON, as in uBO, i.e. of the uBO aliases of trusted scriptlets
    const UBO_JSON_EDIT_NAME_PREFIX = 'ubo-trusted-json-edit';
    // a placeholder of uBO in a text, not a template string
    // eslint-disable-next-line no-template-curly-in-string
    const NOW_PLACEHOLDER = '${now}';
    // Items of an array which are removed by `splice()` of each, as before, while more are removed in one pass
    const MAX_SPLICED_ITEMS = 8;
    const MAX_RECURSIVE_DEPTH = 1000;

    // Required for appendPath(): simple property names can be emitted as `.prop`,
    // but keys with spaces, punctuation, or leading digits must use bracket
    // notation so generated paths stay valid and reparsable JSONPath selectors.
    // Examples: `price` -> `$.price`, `_meta` -> `$._meta`,
    // `ad slot` -> `$['ad slot']`, `123name` -> `$['123name']`,
    // `foo-bar` -> `$['foo-bar']`.
    const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
    // Number of values of the root above which `==` with the tested node looks them up in a set, see `rootValueSets`,
    // as a set is not worth building for a few of them, e.g. one value of `$.limit`
    const ROOT_VALUE_SET_MIN_SIZE = 8;

    // True while a command with `v2:` prefix is evaluated, in which a filter tests the children of each node
    let shouldFilterChildren = false;
    // True while a `call([...])` command is evaluated, for which a key matched more than once, e.g. by `['a','a']`,
    // is a match each time, as in uBO, so the method is called for each of them
    let shouldKeepDuplicateKeys = false;
    // True while a `call([...])` command is evaluated, for which descendants are visited depth-first, as in uBO,
    // so the method is called in the same order, while other commands visit them breadth-first, as before
    let shouldTraverseDepthFirst = false;
    // Nodes which selectors of the root in filters select, e.g. `$..limit` of `$.items[?@.id==$..limit]`,
    // and results of the filters which test only the root, e.g. `[?$..disableAds]`, for the command which
    // is evaluated, also in nested selectors, e.g. `$.items[?@.offers[?$..disableAds]]`, so the root is searched
    // once for a command, not again for each tested node, which would be quadratic, e.g. about 5 s for 3,000 items.
    // They are reset for each command, as a previous one may have changed the root, while nothing changes it while
    // a command is matched, as matching is synchronous, so no other code of the page runs, and modifications
    // are applied after it. So a value of the root which is read once is the same as one read for each node,
    // e.g. of parsed JSON, which has only own data properties, and of an object of the page, also with a getter
    // which returns the same value, or a new object with the same content, while only a getter or a Proxy which
    // returns another value on each read, e.g. a counter or `Date.now()`, is read once for a command instead of
    // once for each tested node, as before for the right side of a comparison, e.g. `$.limit` of
    // `[?@.a==$.limit]`. They are created on the first such filter, as a method may be intercepted very often,
    // e.g. `Array.isArray()`
    let rootSelections: Map<JsonPathSelector, JsonPathCandidate[]> | null = null;
    let rootOnlyFilterResults: Map<JsonPathFilter, boolean> | null = null;
    // Sets of the values which selectors of the root select, for `==` with the tested node, e.g. `$.blockedIds[*]`
    // of `$.items[?$.blockedIds[*]==@.id]`, which are built once for a command, as the nodes are selected once
    let rootValueSets: Map<JsonPathSelector, Set<any>> | null = null;

    /**
     * Checks whether a value is a non-null object.
     *
     * @param value value to inspect
     * @returns true when the value is object-like
     */
    function isObjectLike(value: unknown): value is Record<string, any> {
        return value !== null && typeof value === 'object';
    }

    /**
     * Checks whether a value is an array, and calls `Array.isArray()` only for a value with a numeric `length`,
     * as it may be the method intercepted by a rule, e.g. of `trusted-json-set`, which is called very often,
     * and each rule which intercepts it processes the calls of the other ones.
     *
     * @param value value to inspect
     * @returns true when the value is an array
     */
    function isArrayValue(value: unknown): value is any[] {
        if (!isObjectLike(value)) {
            return false;
        }
        let length;
        try {
            length = value.length;
        } catch {
            // e.g. a getter of the page which throws
            return Array.isArray(value);
        }
        return typeof length === 'number' && Array.isArray(value);
    }

    /**
     * Checks whether a value is a plain object.
     *
     * @param value value to inspect
     * @returns true when the value is a plain object
     */
    function isPlainObject(value: unknown): value is Record<string, any> {
        if (!isObjectLike(value) || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    /**
     * Checks whether a character is a quote delimiter.
     *
     * @param value character to inspect
     * @returns true when the character is a quote
     */
    function isQuoteCharacter(value: string): boolean {
        return value === SINGLE_QUOTE || value === DOUBLE_QUOTE;
    }

    /**
     * Checks whether the character at a given index is preceded by an odd number of backslashes.
     *
     * @param str string to check in
     * @param index index of the character
     * @returns true when the character is escaped
     */
    function isEscaped(str: string, index: number): boolean {
        let count = 0;
        let j = index - 1;
        while (j >= 0 && str[j] === BACKSLASH) {
            count += 1;
            j -= 1;
        }
        return count % 2 !== 0;
    }

    /**
     * Returns the index of the slash which closes a regular expression, see `getJsonPathRegexpEnd()`,
     * also of a filter, as `=` at the top level of an expression, which starts its value, is found before it.
     *
     * @param str string to check in
     * @param index index of the character
     * @returns index of the closing slash, or -1 if the character does not start a regular expression
     */
    function getRegexpEnd(str: string, index: number): number {
        return getJsonPathRegexpEnd(str, index, true);
    }

    /**
     * Resolves the JSON.parse implementation to use.
     *
     * @param runtimeNativeObjects optional native object bag
     * @returns JSON.parse implementation
     */
    function resolveNativeParse(runtimeNativeObjects: JsonPathNativeObjects | undefined): typeof JSON.parse {
        if (runtimeNativeObjects && runtimeNativeObjects.nativeParse) {
            return runtimeNativeObjects.nativeParse;
        }

        return JSON.parse;
    }

    /**
     * Resolves the JSON.stringify implementation to use.
     *
     * @param runtimeNativeObjects optional native object bag
     * @returns JSON.stringify implementation
     */
    function resolveNativeStringify(runtimeNativeObjects: JsonPathNativeObjects | undefined): typeof JSON.stringify {
        if (runtimeNativeObjects && runtimeNativeObjects.nativeStringify) {
            return runtimeNativeObjects.nativeStringify;
        }

        return JSON.stringify;
    }

    /**
     * Removes matching wrapping quotes from a string.
     *
     * @param value raw string
     * @returns unquoted string when quotes match
     */
    function stripQuotes(value: string): string {
        const normalizedValue = value.trim();
        if (normalizedValue.length < 2) {
            return normalizedValue;
        }

        const firstChar = normalizedValue[0];
        const lastChar = normalizedValue[normalizedValue.length - 1];
        if (isQuoteCharacter(firstChar) && firstChar === lastChar) {
            const unwrappedValue = normalizedValue.slice(1, -1);
            return unwrappedValue
                .split(BACKSLASH + SINGLE_QUOTE)
                .join(SINGLE_QUOTE)
                .split(BACKSLASH + DOUBLE_QUOTE)
                .join(DOUBLE_QUOTE)
                .split(BACKSLASH + BACKSLASH)
                .join(BACKSLASH);
        }

        return normalizedValue;
    }

    /**
     * Parses a property selector token from dot or bracket notation.
     *
     * Unquoted regexp literals in bracket notation match property keys by pattern.
     * Quoted tokens are always treated as exact property names.
     *
     * @param rawValue raw selector token
     * @returns exact property name or regexp matcher
     */
    function parsePropertySelector(rawValue: string): JsonPathPropertyMatcher {
        const normalizedValue = rawValue.trim();

        if (/^\/.*\/[a-z]*$/i.test(normalizedValue)) {
            return toRegExp(normalizedValue);
        }

        return stripQuotes(normalizedValue);
    }

    /**
     * Builds a normalized child path.
     *
     * @param basePath resolved parent path
     * @param key property key or array index
     * @returns normalized child path
     */
    function appendPath(basePath: string, key: number | string): string {
        if (typeof key === 'number' || /^\d+$/.test(String(key))) {
            return `${basePath}[${key}]`;
        }

        if (IDENTIFIER_PATTERN.test(String(key))) {
            return `${basePath}.${key}`;
        }

        return `${basePath}['${String(key).replace(/'/g, "\\'")}']`;
    }

    /**
     * Creates a mutable traversal candidate.
     *
     * @param value current node value
     * @param parent owner object or array
     * @param key property key or array index inside the parent
     * @param parentCandidate candidate of the parent, or `null` for the root
     * @returns candidate record
     */
    function createCandidate(
        value: any,
        parent: any,
        key: number | string | null,
        parentCandidate: JsonPathCandidate | null,
    ): JsonPathCandidate {
        return {
            key,
            parent,
            parentCandidate,
            value,
        };
    }

    /**
     * Returns the normalized resolved path of a candidate, e.g. `$.items[0].ad`, and stores it,
     * along with the paths of its ancestors.
     *
     * @param candidate traversal candidate
     * @returns normalized resolved path
     */
    function getCandidatePath(candidate: JsonPathCandidate): string {
        // Ancestors are collected first, so that a deep path does not need deep recursion
        const chain: JsonPathCandidate[] = [];
        let current: JsonPathCandidate | null = candidate;
        while (current !== null && current.path === undefined) {
            chain.push(current);
            current = current.parentCandidate;
        }

        let resolvedPath = current === null ? ROOT_PATH : current.path as string;
        for (let i = chain.length - 1; i >= 0; i -= 1) {
            const item = chain[i];
            resolvedPath = item.parentCandidate === null
                ? ROOT_PATH
                : appendPath(resolvedPath, item.key as number | string);
            item.path = resolvedPath;
        }

        return resolvedPath;
    }

    /**
     * Walks a string character by character, tracking quote and nesting state.
     * Invokes the callback for every non-quote, non-delimiter character that
     * sits at nesting depth zero. Return `true` from the callback to stop early.
     *
     * @param value string to walk
     * @param callback visitor receiving the current index; return true to stop
     */
    function walkTopLevelChars(
        value: string,
        callback: (index: number, isTopLevel: boolean) => boolean | void,
    ): void {
        let bracketDepth = 0;
        let braceDepth = 0;
        let parenthesisDepth = 0;
        let quote: string | null = null;

        for (let i = 0; i < value.length; i += 1) {
            const currentChar = value[i];

            if (quote) {
                if (currentChar === quote && !isEscaped(value, i)) {
                    quote = null;
                }
                if (callback(i, false)) {
                    return;
                }
                continue;
            }

            // A regular expression is skipped as a whole, as its slashes may be in its character classes
            const regexpEnd = currentChar === SLASH ? getRegexpEnd(value, i) : -1;
            if (regexpEnd !== -1) {
                for (let j = i; j <= regexpEnd; j += 1) {
                    if (callback(j, false)) {
                        return;
                    }
                }
                i = regexpEnd;
                continue;
            }

            if (isQuoteCharacter(currentChar)) {
                quote = currentChar;
                if (callback(i, false)) {
                    return;
                }
                continue;
            }

            let isDelimiter = true;
            if (currentChar === SQUARE_BRACKET_OPEN) {
                bracketDepth += 1;
            } else if (currentChar === SQUARE_BRACKET_CLOSE) {
                bracketDepth -= 1;
            } else if (currentChar === CURLY_BRACKET_OPEN) {
                braceDepth += 1;
            } else if (currentChar === CURLY_BRACKET_CLOSE) {
                braceDepth -= 1;
            } else if (currentChar === ROUND_BRACKET_OPEN) {
                parenthesisDepth += 1;
            } else if (currentChar === ROUND_BRACKET_CLOSE) {
                parenthesisDepth -= 1;
            } else {
                isDelimiter = false;
            }

            const isTopLevel = !isDelimiter
                && bracketDepth === 0
                && braceDepth === 0
                && parenthesisDepth === 0;

            if (callback(i, isTopLevel)) {
                return;
            }
        }
    }

    /**
     * Splits a string by a single-character separator while ignoring nested structures.
     *
     * @param value input to split
     * @param separator single separator character
     * @returns top-level parts
     */
    function splitTopLevel(value: string, separator: string): string[] {
        const parts: string[] = [];
        let current = EMPTY_STRING;

        walkTopLevelChars(value, (index, isTopLevel) => {
            if (isTopLevel && value[index] === separator) {
                parts.push(current.trim());
                current = EMPTY_STRING;
            } else {
                current += value[index];
            }
        });

        if (current !== EMPTY_STRING) {
            parts.push(current.trim());
        }

        return parts;
    }

    /**
     * Splits a slice expression by colon.
     *
     * @param value raw slice expression
     * @returns slice components
     */
    function splitSliceExpression(value: string): string[] {
        const parts: string[] = [];
        let current = EMPTY_STRING;

        walkTopLevelChars(value, (index, isTopLevel) => {
            if (isTopLevel && value[index] === COLON) {
                parts.push(current.trim());
                current = EMPTY_STRING;
            } else {
                current += value[index];
            }
        });

        parts.push(current.trim());
        return parts;
    }

    /**
     * Finds the matching closing square bracket.
     *
     * @param value string containing bracketed content
     * @param startIndex index of the opening bracket
     * @returns closing bracket index or -1
     */
    function findClosingBracket(value: string, startIndex: number): number {
        let bracketDepth = 0;
        let quote: string | null = null;

        for (let i = startIndex; i < value.length; i += 1) {
            const currentChar = value[i];

            if (quote) {
                if (currentChar === quote && !isEscaped(value, i)) {
                    quote = null;
                }
                continue;
            }

            const regexpEnd = currentChar === SLASH ? getRegexpEnd(value, i) : -1;
            if (regexpEnd !== -1) {
                i = regexpEnd;
                continue;
            }

            if (isQuoteCharacter(currentChar)) {
                quote = currentChar;
                continue;
            }

            if (currentChar === SQUARE_BRACKET_OPEN) {
                bracketDepth += 1;
                continue;
            }
            if (currentChar === SQUARE_BRACKET_CLOSE) {
                bracketDepth -= 1;
                if (bracketDepth === 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    /**
     * Finds the first top-level comparison operator inside a filter.
     *
     * @param value raw filter expression
     * @returns operator descriptor or null
     */
    function findTopLevelOperator(value: string): { index: number; operator: string } | null {
        let result: { index: number; operator: string } | null = null;

        walkTopLevelChars(value, (index, isTopLevel) => {
            if (!isTopLevel) {
                return false;
            }

            // Multiple operators can match at the same position (`=~` vs `=`,
            // `<=` vs `<`, etc.). Pick the longest match so parsing stays
            // correct even if OPERATORS order changes.
            let matchedOperator: string | null = null;

            for (let j = 0; j < OPERATORS.length; j += 1) {
                const operator = OPERATORS[j];
                if (!value.startsWith(operator, index)) {
                    continue;
                }
                // `$==` and `$=` with nothing before it are the root path followed by `==` or `=`,
                // e.g. `[?$=1]`, not `$=` of a path
                if (
                    (operator === '^=' || operator === '$=')
                    && (value[index + operator.length] === EQUAL || value.slice(0, index).trim() === EMPTY_STRING)
                ) {
                    continue;
                }
                if (matchedOperator === null || operator.length > matchedOperator.length) {
                    matchedOperator = operator;
                }
            }

            if (matchedOperator !== null) {
                result = { index, operator: matchedOperator };
                return true;
            }

            return false;
        });

        return result;
    }

    /**
     * Splits an expression by a top-level token while ignoring nested structures.
     *
     * @param value expression to split
     * @param token token to split by
     * @returns top-level parts
     */
    function splitByTopLevelToken(value: string, token: string): string[] {
        const parts: string[] = [];
        let current = EMPTY_STRING;
        const skipIndexes = new Set<number>();

        walkTopLevelChars(value, (index, isTopLevel) => {
            if (skipIndexes.has(index)) {
                return;
            }

            if (isTopLevel && value.startsWith(token, index)) {
                parts.push(current.trim());
                current = EMPTY_STRING;
                for (let k = 1; k < token.length; k += 1) {
                    skipIndexes.add(index + k);
                }
            } else {
                current += value[index];
            }
        });

        if (current !== EMPTY_STRING) {
            parts.push(current.trim());
        }

        return parts;
    }

    /**
     * Converts a filter literal to a typed JavaScript value.
     *
     * @param rawValue raw literal text
     * @returns typed literal value
     */
    function parseLiteralValue(rawValue: string): any {
        const trimmedValue = rawValue.trim();
        if (trimmedValue === 'true') {
            return true;
        }
        if (trimmedValue === 'false') {
            return false;
        }
        if (trimmedValue === 'null') {
            return null;
        }
        if (/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) {
            return Number(trimmedValue);
        }
        if (/^\/.*\/[a-z]*$/i.test(trimmedValue)) {
            return toRegExp(trimmedValue);
        }

        return stripQuotes(trimmedValue);
    }

    /**
     * Normalizes a filter path to an absolute selector rooted at dollar.
     *
     * @param rawPath raw filter-side path expression
     * @returns normalized selector path
     */
    function normalizeFilterPath(rawPath: string): string {
        let normalizedPath = rawPath.trim();
        if (normalizedPath.startsWith(AT_SIGN)) {
            normalizedPath = normalizedPath.slice(1);
        }

        if (normalizedPath === EMPTY_STRING) {
            return ROOT_PATH;
        }

        if (normalizedPath.startsWith(ROOT_PATH)) {
            return normalizedPath;
        }

        if (
            normalizedPath.startsWith(DOT)
            || normalizedPath.startsWith(DOUBLE_DOT)
            || normalizedPath.startsWith(SQUARE_BRACKET_OPEN)
        ) {
            return `${ROOT_PATH}${normalizedPath}`;
        }

        return `${ROOT_PATH}${DOT}${normalizedPath}`;
    }

    /**
     * Checks whether a path of a filter starts with the root `$`, i.e. `$` alone, or followed by a step,
     * e.g. `$.flag` or `$[0]`, which is evaluated against the root of the document, while e.g. `$id`
     * is a name of the tested node.
     *
     * @param rawPath path of a filter
     * @returns true when the path starts with the root
     */
    function isFilterRootPath(rawPath: string): boolean {
        const filterPath = rawPath.trim();
        if (!filterPath.startsWith(ROOT_PATH)) {
            return false;
        }
        // A space may follow the root, e.g. `$ .flag` or `$ ['flag']`, as in RFC 9535 and the selector reads it
        let i = ROOT_PATH.length;
        while (i < filterPath.length && filterPath[i].trim() === EMPTY_STRING) {
            i += 1;
        }
        return i === filterPath.length || filterPath[i] === DOT || filterPath[i] === SQUARE_BRACKET_OPEN;
    }

    /**
     * Parses a constrained filter expression.
     *
     * @param rawExpression raw filter expression after question mark
     * @returns parsed filter descriptor
     */
    function parseFilterExpression(rawExpression: string): JsonPathFilter {
        let expression = rawExpression.trim();
        if (expression.startsWith(ROUND_BRACKET_OPEN) && expression.endsWith(ROUND_BRACKET_CLOSE)) {
            let parenDepth = 0;
            let innerQuote: string | null = null;
            let matchesEnd = false;
            for (let i = 0; i < expression.length; i += 1) {
                const currentChar = expression[i];
                // A regular expression is skipped as a whole, e.g. with a quote `(@.title=/it's/)`
                const regexpEnd = !innerQuote && currentChar === SLASH ? getRegexpEnd(expression, i) : -1;
                if (regexpEnd !== -1) {
                    i = regexpEnd;
                } else if (innerQuote) {
                    if (currentChar === innerQuote && !isEscaped(expression, i)) {
                        innerQuote = null;
                    }
                } else if (isQuoteCharacter(currentChar)) {
                    innerQuote = currentChar;
                } else if (currentChar === ROUND_BRACKET_OPEN) {
                    parenDepth += 1;
                } else if (currentChar === ROUND_BRACKET_CLOSE) {
                    parenDepth -= 1;
                    if (parenDepth === 0) {
                        matchesEnd = i === expression.length - 1;
                        break;
                    }
                }
            }
            if (matchesEnd) {
                expression = expression.slice(1, -1).trim();
            }
        }

        const orParts = splitByTopLevelToken(expression, '||');
        if (orParts.length > 1) {
            return {
                conditions: orParts.map((part) => parseFilterExpression(part)),
                operator: 'or',
            };
        }

        const andParts = splitByTopLevelToken(expression, '&&');
        if (andParts.length > 1) {
            return {
                conditions: andParts.map((part) => parseFilterExpression(part)),
                operator: 'and',
            };
        }

        if (expression.startsWith('!') && !expression.startsWith('!=')) {
            return {
                condition: parseFilterExpression(expression.slice(1).trim()),
                operator: 'not',
            };
        }

        // Selectors of a filter are parsed with it, by `parseJsonPathSelector()`, which parses filters
        // of its steps by this function, e.g. of `$.a[?(@.b[?(@.c)])]`
        const operatorMatch = findTopLevelOperator(expression);
        if (!operatorMatch) {
            return {
                operator: FILTER_OPERATORS.EXISTS,
                resolveSelectorAgainstRoot: isFilterRootPath(expression),
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                selector: parseJsonPathSelector(normalizeFilterPath(expression)),
            };
        }

        const leftPart = expression.slice(0, operatorMatch.index).trim();
        const rightPart = expression.slice(operatorMatch.index + operatorMatch.operator.length).trim();
        let operator: JsonPathFilterOperator = FILTER_OPERATORS.EQUAL;

        if (operatorMatch.operator === '!=') {
            operator = FILTER_OPERATORS.NOT_EQUAL;
        } else if (operatorMatch.operator === '<') {
            operator = FILTER_OPERATORS.LESS_THAN;
        } else if (operatorMatch.operator === '<=') {
            operator = FILTER_OPERATORS.LESS_THAN_OR_EQUAL;
        } else if (operatorMatch.operator === '>') {
            operator = FILTER_OPERATORS.GREATER_THAN;
        } else if (operatorMatch.operator === '>=') {
            operator = FILTER_OPERATORS.GREATER_THAN_OR_EQUAL;
        } else if (operatorMatch.operator === '*=') {
            operator = FILTER_OPERATORS.CONTAINS;
        } else if (operatorMatch.operator === '^=') {
            operator = FILTER_OPERATORS.STARTS_WITH;
        } else if (operatorMatch.operator === '$=') {
            operator = FILTER_OPERATORS.ENDS_WITH;
        } else if (operatorMatch.operator === '=~') {
            operator = FILTER_OPERATORS.REGEX;
        } else if (operatorMatch.operator === EQUAL && /^\/.*\/[a-z]*$/i.test(rightPart)) {
            operator = FILTER_OPERATORS.REGEX;
        }

        const rightTrimmed = rightPart.trim();
        const isRightRootPath = isFilterRootPath(rightTrimmed);
        const resolveSelectorAgainstRoot = isFilterRootPath(leftPart);
        const isRightCurrentPath = rightTrimmed === AT_SIGN
            || rightTrimmed.startsWith(AT_SIGN + DOT)
            || rightTrimmed.startsWith(AT_SIGN + SQUARE_BRACKET_OPEN);

        if (isRightRootPath || isRightCurrentPath) {
            return {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                comparisonSelector: parseJsonPathSelector(normalizeFilterPath(rightTrimmed)),
                operator,
                resolveComparisonAgainstRoot: isRightRootPath,
                resolveSelectorAgainstRoot,
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                selector: parseJsonPathSelector(normalizeFilterPath(leftPart)),
            };
        }

        return {
            comparisonValue: parseLiteralValue(rightPart),
            operator,
            resolveSelectorAgainstRoot,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            selector: parseJsonPathSelector(normalizeFilterPath(leftPart)),
        };
    }

    /**
     * Parses a bracketed selector segment.
     *
     * @param content inner bracket content without wrapping brackets
     * @param recursive whether the step is recursive
     * @returns parsed selector step
     */
    function parseBracketStep(content: string, recursive: boolean): JsonPathStep {
        if (content === WILDCARD) {
            return {
                mode: 'wildcard',
                recursive,
            };
        }

        if (content.startsWith(QUESTION_MARK)) {
            return {
                filter: parseFilterExpression(content.slice(1)),
                mode: 'filter',
                recursive,
            };
        }

        if (/^\(@\.length(?:-\d+)?\)$/.test(content)) {
            const match = content.match(/^\(@\.length(?:-(\d+))?\)$/);
            return {
                mode: 'computed-index',
                recursive,
                subtractLength: match && match[1] ? Number(match[1]) : 0,
            };
        }

        const sliceParts = splitSliceExpression(content);
        if (sliceParts.length > 1) {
            const start = sliceParts[0] === EMPTY_STRING ? undefined : Number(sliceParts[0]);
            const end = sliceParts[1] === EMPTY_STRING ? undefined : Number(sliceParts[1]);
            const step = sliceParts.length > 2 && sliceParts[2] !== EMPTY_STRING ? Number(sliceParts[2]) : 1;

            return {
                mode: 'slice',
                recursive,
                slice: {
                    end,
                    start,
                    step,
                },
            };
        }

        const parts = splitTopLevel(content, COMMA);
        const allIntegerParts = parts.every((part) => /^-?\d+$/.test(part));
        if (allIntegerParts) {
            return {
                indexes: parts.map((part) => Number(part)),
                mode: 'index',
                recursive,
            };
        }

        return {
            mode: 'property',
            properties: parts.map((part) => parsePropertySelector(part)),
            recursive,
        };
    }

    /**
     * Parses a JSONPath selector into traversal steps.
     *
     * @param selectorPath selector string
     * @returns parsed selector AST
     */
    function parseJsonPathSelector(selectorPath: string): JsonPathSelector {
        const steps: JsonPathStep[] = [];
        let currentIndex = 0;

        if (selectorPath.startsWith(ROOT_PATH)) {
            currentIndex = 1;
        }

        while (currentIndex < selectorPath.length) {
            let recursive = false;

            if (selectorPath.startsWith(DOUBLE_DOT, currentIndex)) {
                recursive = true;
                currentIndex += DOUBLE_DOT.length;
            } else if (selectorPath[currentIndex] === DOT) {
                currentIndex += 1;
            }

            if (currentIndex >= selectorPath.length) {
                break;
            }

            if (selectorPath[currentIndex] === SQUARE_BRACKET_OPEN) {
                const closingIndex = findClosingBracket(selectorPath, currentIndex);
                if (closingIndex === -1) {
                    throw new Error(`Invalid JSONPath expression: ${selectorPath}`);
                }

                const content = selectorPath.slice(currentIndex + 1, closingIndex).trim();
                steps.push(parseBracketStep(content, recursive));
                currentIndex = closingIndex + 1;
                continue;
            }

            if (selectorPath[currentIndex] === WILDCARD) {
                steps.push({
                    mode: 'wildcard',
                    recursive,
                });
                currentIndex += 1;
                continue;
            }

            // Regular expression of property keys, e.g. `./^ad_/` or `../^ad_/`, without flags, as in uBO,
            // in which `\/` is a slash, while other escapes are kept for the regular expression
            const regexpEnd = selectorPath[currentIndex - 1] === DOT
                ? getJsonPathRegexpEnd(selectorPath, currentIndex, false)
                : -1;
            if (regexpEnd !== -1) {
                const pattern = selectorPath
                    .slice(currentIndex + 1, regexpEnd)
                    .split(`${BACKSLASH}${SLASH}`)
                    .join(SLASH);
                const endIndex = regexpEnd;

                // Whitespaces before the next step are ignored, as before other steps, e.g. `./^ad/ .flag`
                let nextIndex = endIndex + 1;
                while (nextIndex < selectorPath.length && /\s/.test(selectorPath[nextIndex])) {
                    nextIndex += 1;
                }
                // It is followed by a step or by the end, otherwise it is a part of a name, as before,
                // e.g. `./api/(id)` or `./api/+x`
                const nextChar = selectorPath[nextIndex];
                if (nextChar === undefined || nextChar === DOT || nextChar === SQUARE_BRACKET_OPEN) {
                    steps.push({
                        mode: 'property',
                        // throws for an invalid regular expression, so the expression is not applied
                        properties: [new RegExp(pattern)],
                        recursive,
                    });
                    currentIndex = nextIndex;
                    continue;
                }
            }

            let endIndex = currentIndex;
            while (
                endIndex < selectorPath.length
                && selectorPath[endIndex] !== DOT
                && selectorPath[endIndex] !== SQUARE_BRACKET_OPEN
            ) {
                endIndex += 1;
            }

            const propertyName = selectorPath.slice(currentIndex, endIndex).trim();
            if (propertyName) {
                steps.push({
                    mode: 'property',
                    properties: [propertyName],
                    recursive,
                });
            }
            currentIndex = endIndex;
        }

        return { steps };
    }

    /**
     * Splits a combined selector and mutation expression.
     *
     * @param expression raw user expression
     * @returns selector part, mutation mode, and raw mutation payload
     */
    function splitMutationExpression(expression: string): {
        mode: JsonPathMutationMode;
        selectorPart: string;
        valuePart: string;
    } {
        let foundIndex = -1;
        let foundMode: JsonPathMutationMode = 'remove';
        let tokenLength = 0;

        walkTopLevelChars(expression, (index, isTopLevel) => {
            if (!isTopLevel) {
                return false;
            }
            // `++=` is the previous `+=`, e.g. which joins strings, while `+=` merges as uBO, see `buildMergeUpdater()`
            if (expression.startsWith(PLUS_PLUS_EQUAL, index)) {
                foundIndex = index;
                foundMode = 'append';
                tokenLength = PLUS_PLUS_EQUAL.length;
                return true;
            }
            if (expression.startsWith(PLUS_EQUAL, index)) {
                foundIndex = index;
                foundMode = 'merge';
                tokenLength = PLUS_EQUAL.length;
                return true;
            }
            if (expression[index] === EQUAL) {
                foundIndex = index;
                foundMode = 'set';
                tokenLength = 1;
                return true;
            }
            return false;
        });

        if (foundIndex === -1) {
            return {
                mode: 'remove',
                selectorPart: expression.trim(),
                valuePart: EMPTY_STRING,
            };
        }

        return {
            mode: foundMode,
            selectorPart: expression.slice(0, foundIndex).trim(),
            valuePart: expression.slice(foundIndex + tokenLength).trim(),
        };
    }

    /**
     * Extracts leading guard filters from a combined selector.
     *
     * @param selectorPart selector text that may start with guards
     * @returns extracted guards plus the remaining selector
     */
    function extractGuards(selectorPart: string): { guards: JsonPathFilter[]; selectorPart: string } {
        const guards: JsonPathFilter[] = [];
        let normalizedSelectorPart = selectorPart.trim();

        while (normalizedSelectorPart.startsWith(EXPRESSION_OPEN_STRING)) {
            const closingIndex = findClosingBracket(normalizedSelectorPart, 0);
            if (closingIndex === -1) {
                break;
            }

            const content = normalizedSelectorPart.slice(1, closingIndex);
            guards.push(parseFilterExpression(content.slice(1)));
            normalizedSelectorPart = normalizedSelectorPart.slice(closingIndex + 1).trim();
        }

        return {
            guards,
            selectorPart: normalizedSelectorPart,
        };
    }

    /**
     * Normalizes a selector to always start at the root.
     *
     * @param selectorPart raw selector text
     * @returns absolute selector path
     */
    function normalizeSelectorPart(selectorPart: string): string {
        const trimmedSelectorPart = selectorPart.trim();
        if (trimmedSelectorPart === EMPTY_STRING) {
            return ROOT_PATH;
        }
        if (trimmedSelectorPart.startsWith(ROOT_PATH)) {
            return trimmedSelectorPart;
        }
        if (
            trimmedSelectorPart.startsWith(DOT)
            || trimmedSelectorPart.startsWith(SQUARE_BRACKET_OPEN)
            || trimmedSelectorPart.startsWith(DOUBLE_DOT)
        ) {
            return `${ROOT_PATH}${trimmedSelectorPart}`;
        }

        return `${ROOT_PATH}${DOT}${trimmedSelectorPart}`;
    }

    /**
     * Parses the value of `+=` or `++=` of AdGuard rules: a JSON object or array, in which time keywords are resolved
     * before it is parsed, e.g. `+=[{"time":$now$}]`, see https://github.com/AdguardTeam/Scriptlets/issues/573,
     * or a constant of `trusted-json-set`, e.g. `emptyObj`. uBO rules have a JSON value, see `parseUboValue()`.
     *
     * @param rawValue value text
     * @param nativeParse parse function to use
     * @param parseArgumentValue parsed trusted-json-set value resolver
     * @returns value to add
     */
    function parseAppendValue(
        rawValue: string,
        nativeParse: typeof JSON.parse,
        parseArgumentValue: JsonPathArgumentValueParser,
    ): any {
        const trimmedValue = rawValue.trim();
        if (trimmedValue.startsWith(CURLY_BRACKET_OPEN) || trimmedValue.startsWith(SQUARE_BRACKET_OPEN)) {
            return nativeParse(parseKeywordValue(trimmedValue));
        }

        const parsedValue = parseArgumentValue(trimmedValue);
        if (!parsedValue || parsedValue.shouldReplaceArgument) {
            throw new Error(`Invalid append value: ${rawValue}`);
        }
        return parsedValue.constantValue;
    }

    /**
     * Parses a value of uBO rules, as uBO does, i.e. the JSON text after `=`, `+=` or `++=`, e.g. `"hidden"`
     * is the string `hidden`, and `[]` an array, without time keywords. A value which is not JSON throws,
     * which is checked when the query is parsed, so the rule is not applied, as in uBO.
     * `nativeParse` is `JSON.parse` saved when the rule runs, which may be the wrapper of another JSON rule which
     * has run before, which may then change the value, as for `json:` values of AdGuard rules, which is accepted,
     * while uBO uses `JSON.parse` saved before any of its rules runs.
     *
     * @param rawValue value text
     * @param nativeParse parse function to use
     * @returns parsed value
     */
    function parseUboValue(rawValue: string, nativeParse: typeof JSON.parse): any {
        return nativeParse(rawValue.trim());
    }

    /**
     * Builds the updater of `++=`, i.e. `+=` of AdGuard rules before uBO `+=` was supported: an array gets the value,
     * or the items of an array value, as a new array, an object and an object value are merged into a new object,
     * a string and a string value are joined, and another value is replaced by the value.
     *
     * @param appendValue value to add, see `parseAppendValue()` and `parseUboValue()`
     * @returns updater function for matched nodes
     */
    function buildAppendUpdater(appendValue: any): (currentValue: any) => any {
        return (currentValue: any) => {
            if (isArrayValue(currentValue)) {
                return Array.isArray(appendValue)
                    ? currentValue.concat(appendValue)
                    : currentValue.concat([appendValue]);
            }

            if (isPlainObject(currentValue) && isPlainObject(appendValue)) {
                return Object.assign({}, currentValue, appendValue);
            }

            if (typeof currentValue === 'string' && typeof appendValue === 'string') {
                return `${currentValue}${appendValue}`;
            }

            return appendValue;
        };
    }

    /**
     * Builds the updater of `+=`, which merges a value into the matched node as uBO does, in place:
     * an array gets the value, or the items of an array value, and an object gets the properties of the value,
     * while nothing is changed if the node or the value is not an object, e.g. a string or a number,
     * so nothing is assigned then. The node itself is modified, so `MUTATED_IN_PLACE` is returned.
     * Items are added by index, not by `push()`, which a rule may intercept.
     *
     * @param mergeValue value to merge, see `parseAppendValue()` and `parseUboValue()`
     * @returns updater function for matched nodes
     */
    function buildMergeUpdater(mergeValue: any): (currentValue: any) => any {
        const isObjectValue = (value: any): boolean => value !== null
            && (typeof value === 'object' || typeof value === 'function');

        return (currentValue: any) => {
            if (!isObjectValue(mergeValue) || !isObjectValue(currentValue)) {
                return UNCHANGED_VALUE;
            }

            if (isArrayValue(currentValue)) {
                if (isArrayValue(mergeValue)) {
                    for (let i = 0; i < mergeValue.length; i += 1) {
                        currentValue[currentValue.length] = mergeValue[i];
                    }
                } else {
                    currentValue[currentValue.length] = mergeValue;
                }
                return MUTATED_IN_PLACE;
            }

            const keys = Object.keys(mergeValue);
            for (let i = 0; i < keys.length; i += 1) {
                currentValue[keys[i]] = mergeValue[keys[i]];
            }
            return MUTATED_IN_PLACE;
        };
    }

    /**
     * Builds the updater of a value of uBO rules after `=`, which is set as it is, i.e. the same value
     * for each matched node, as in uBO, with the first `${now}` of a string replaced by the current time
     * when it is set, e.g. `"${now}"` is `"1700000000000"`.
     *
     * @param value parsed value, see `parseUboValue()`
     * @returns updater function for matched nodes
     */
    function buildUboSetUpdater(value: any): () => any {
        return () => (typeof value === 'string' ? value.replace(NOW_PLACEHOLDER, String(Date.now())) : value);
    }

    /**
     * Builds the updater used for replace payloads.
     *
     * @param rawValue replace payload text
     * @param nativeParse parse function to use
     * @returns string replacement updater
     */
    function buildReplaceUpdater(
        rawValue: string,
        nativeParse: typeof JSON.parse,
    ): (currentValue: any) => any {
        const replacePayload = rawValue.slice('replace('.length, -1);
        const replaceConfig = nativeParse(replacePayload) as {
            flags?: string;
            regex: string;
            replacement: string;
        };

        if (typeof replaceConfig.regex !== 'string' || typeof replaceConfig.replacement !== 'string') {
            throw new Error('Invalid replace payload: "regex" and "replacement" must be strings');
        }

        const regex = replaceConfig.regex.startsWith('/')
            ? toRegExp(replaceConfig.regex)
            : new RegExp(replaceConfig.regex, replaceConfig.flags || EMPTY_STRING);

        // Time keywords are resolved in the replacement only —
        // the regexp is a match pattern, so it is used as is,
        // e.g. 'replace({"regex":"\\d+","replacement":"$now$"})'
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const replacement = parseKeywordValue(replaceConfig.replacement);

        return (currentValue: any) => {
            if (typeof currentValue !== 'string') {
                return currentValue;
            }

            return currentValue.replace(regex, replacement);
        };
    }

    // uBO rules, whose values are JSON, as in uBO, while AdGuard rules have text values and keywords, as before
    const isUboDialect = typeof source.name === 'string' && source.name.startsWith(UBO_JSON_EDIT_NAME_PREFIX);

    /**
     * Checks whether a value is a payload of uBO syntax in its form, e.g. `repl({...})` or `call([...])`,
     * while any other value, e.g. `call(me)`, is a text, as before.
     *
     * @param value value of an expression
     * @param prefix name of the payload with the opening parenthesis, e.g. `call(`
     * @param open opening bracket of the payload
     * @param close closing bracket of the payload
     * @returns true when the value is such a payload
     */
    function isPayloadValue(value: string, prefix: string, open: string, close: string): boolean {
        if (!value.startsWith(prefix) || !value.endsWith(ROUND_BRACKET_CLOSE)) {
            return false;
        }
        const payload = value.slice(prefix.length, -1).trim();
        return payload.startsWith(open) && payload.endsWith(close);
    }

    /**
     * Checks whether a value is a payload which its builder parses, i.e. `repl({...})`, `call([...])`
     * or `replace(...)`, so it is not parsed as JSON for uBO rules.
     *
     * @param value value of an expression
     * @returns true when the value is such a payload
     */
    function isPayloadExpressionValue(value: string): boolean {
        const trimmedValue = value.trim();
        return isPayloadValue(trimmedValue, 'repl(', CURLY_BRACKET_OPEN, CURLY_BRACKET_CLOSE)
            || isPayloadValue(trimmedValue, 'call(', SQUARE_BRACKET_OPEN, SQUARE_BRACKET_CLOSE)
            || (trimmedValue.startsWith('replace(') && trimmedValue.endsWith(ROUND_BRACKET_CLOSE));
    }

    /**
     * Builds the updater of uBO `repl({...})` payloads, which replace a part of a string value:
     * - `{"regex":"...","flags":"...","replacement":"..."}` — by a regular expression with optional flags;
     * - `{"pattern":"...","replacement":"..."}` — the first occurrence of a text.
     *
     * As in uBO, a value which is not a string is not changed, and neither is any value
     * if the regular expression is invalid, so nothing is assigned then, see `UNCHANGED_VALUE`.
     * Unlike `replace({...})`, `regex` is used as is, i.e. slashes in it are a part of it,
     * and the replacement has no keywords.
     *
     * @param rawValue `repl(...)` payload text
     * @param nativeParse parse function to use
     * @returns string replacement updater
     */
    function buildReplUpdater(
        rawValue: string,
        nativeParse: typeof JSON.parse,
    ): (currentValue: any) => any {
        const replConfig = nativeParse(rawValue.slice('repl('.length, -1));
        if (!isPlainObject(replConfig)) {
            throw new Error(`Invalid repl payload: ${rawValue}`);
        }

        const { regex, flags, pattern } = replConfig;
        if (regex === undefined && typeof pattern !== 'string') {
            throw new Error(`Invalid repl payload, either "regex" or "pattern" is required: ${rawValue}`);
        }

        let regexp: RegExp | null = null;
        try {
            regexp = regex !== undefined
                ? new RegExp(regex, flags)
                : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        } catch {
            // As in uBO, the expression is valid, but changes nothing
        }

        return (currentValue: any) => {
            // As in uBO, nothing is assigned then, e.g. a setter of the page is not called
            if (regexp === null || typeof currentValue !== 'string') {
                return UNCHANGED_VALUE;
            }

            return currentValue.replace(regexp, replConfig.replacement);
        };
    }

    /**
     * Builds the updater used for set mutations.
     *
     * @param rawValue set payload text
     * @param nativeParse parse function to use
     * @param parseArgumentValue parsed trusted-json-set value resolver
     * @returns updater function for matched nodes
     */
    function buildSetUpdater(
        rawValue: string,
        nativeParse: typeof JSON.parse,
        parseArgumentValue: JsonPathArgumentValueParser,
    ): (currentValue: any) => any {
        const trimmedValue = rawValue.trim();
        if (trimmedValue.startsWith('replace(') && trimmedValue.endsWith(ROUND_BRACKET_CLOSE)) {
            return buildReplaceUpdater(trimmedValue, nativeParse);
        }

        if (isPayloadValue(trimmedValue, 'repl(', CURLY_BRACKET_OPEN, CURLY_BRACKET_CLOSE)) {
            return buildReplUpdater(trimmedValue, nativeParse);
        }

        const parsedValue = parseArgumentValue(trimmedValue);
        if (!parsedValue) {
            throw new Error(`Invalid set value: ${rawValue}`);
        }

        return (currentValue: any) => getJsonSetValue(currentValue, parsedValue);
    }

    /**
     * Builds the function of uBO `call([...])` payloads, which calls a method for each matched node,
     * e.g. `call(["${obj}","setAttribute","${key}","1"])`. The first item is the object whose method is called,
     * `null` for `window`, the second one is the name of the method, or its path from the object, e.g. `console.log`,
     * which uBO does not support, and the other ones are its arguments.
     * Items `${obj}`, `${key}` and `${val}` are replaced by the owner of the matched node, its key and its value.
     *
     * @param rawValue `call(...)` payload text
     * @param nativeParse parse function to use
     * @returns function which calls the method for a matched node, and returns true if it has been called
     */
    function buildCallInvoker(
        rawValue: string,
        nativeParse: typeof JSON.parse,
    ): (parent: any, key: number | string) => boolean {
        const entries = nativeParse(rawValue.slice('call('.length, -1));
        if (!Array.isArray(entries)) {
            throw new Error(`Invalid call payload: ${rawValue}`);
        }

        return (parent: any, key: number | string) => {
            // As in uBO, nothing is called without the name of a method
            if (entries.length < 2) {
                return false;
            }

            const callArgs = entries.map((entry) => {
                if (entry === CALL_OBJECT_PLACEHOLDER) {
                    return parent;
                }
                if (entry === CALL_KEY_PLACEHOLDER) {
                    return key;
                }
                if (entry === CALL_VALUE_PLACEHOLDER) {
                    return parent[key];
                }
                return entry;
            });

            let instance = callArgs[0] === null || callArgs[0] === undefined ? window : callArgs[0];
            let methodName = callArgs[1];

            // A name with dots, e.g. `console.log` or `player.ads.stop`, is a path of the method from the object,
            // and the method is called on the object which holds it, e.g. `console`. uBO supports only a name
            // of a property, so a property whose name has dots is still called as it is, as in uBO
            if (
                typeof methodName === 'string'
                && methodName.includes(DOT)
                && instance[methodName] === undefined
            ) {
                const pathParts = methodName.split(DOT);
                for (let i = 0; i < pathParts.length; i += 1) {
                    if (pathParts[i] === EMPTY_STRING) {
                        throw new Error(`Invalid path of the method: ${methodName}`);
                    }
                }
                for (let i = 0; i < pathParts.length - 1; i += 1) {
                    instance = instance[pathParts[i]];
                    if (instance === null || instance === undefined) {
                        throw new Error(`No object at '${pathParts.slice(0, i + 1).join(DOT)}' of ${methodName}`);
                    }
                }
                methodName = pathParts[pathParts.length - 1];
            }

            Reflect.apply(instance[methodName], instance, callArgs.slice(2));
            return true;
        };
    }

    /**
     * Splits a selector into the selectors of preconditions, which end with `;$` or `{min,max};$`,
     * and the selector of the nodes to process, which follows the last of them, e.g. `..ads{1,};$.config.ads`.
     * `;` which is not followed by `$` is a part of a property name, as before, e.g. `$.a;b`.
     *
     * @param selectorPart selector text
     * @returns selectors of preconditions with their ranges, and the selector of the nodes to process
     */
    function splitPreconditionSelectors(selectorPart: string): {
        preconditions: { max: number; min: number; selectorPart: string }[];
        selectorPart: string;
    } {
        const preconditions: { max: number; min: number; selectorPart: string }[] = [];
        // Fast path for most expressions, as the selector is parsed on each call
        if (selectorPart.indexOf(SEMICOLON) === -1) {
            return { preconditions, selectorPart };
        }

        let segmentStart = 0;

        walkTopLevelChars(selectorPart, (index, isTopLevel) => {
            if (!isTopLevel || selectorPart[index] !== SEMICOLON) {
                return false;
            }

            // e.g. a property `a;b` of `$.a;b`, as before
            if (selectorPart[index + 1] !== ROOT_PATH) {
                return false;
            }

            let segment = selectorPart.slice(segmentStart, index);
            let min = DEFAULT_MIN_COUNT;
            let max = DEFAULT_MAX_COUNT;
            const quantifierMatch = segment.match(QUANTIFIER_REGEXP);
            if (quantifierMatch) {
                const range = quantifierMatch[1];
                const commaIndex = range.indexOf(COMMA);
                if (commaIndex === -1) {
                    min = parseInt(range, 10);
                    max = min;
                } else {
                    // An omitted bound is 0 or unlimited, while an explicit 0 is kept, e.g. `{,0}` or `{0,0}`
                    const minPart = range.slice(0, commaIndex);
                    const maxPart = range.slice(commaIndex + 1);
                    min = minPart === EMPTY_STRING ? 0 : parseInt(minPart, 10);
                    max = maxPart === EMPTY_STRING ? DEFAULT_MAX_COUNT : parseInt(maxPart, 10);
                }
                segment = segment.slice(0, -quantifierMatch[0].length);
            }

            preconditions.push({ max, min, selectorPart: segment });
            // `$` is kept, as the next selector starts from the root
            segmentStart = index + 1;
            return false;
        });

        return {
            preconditions,
            selectorPart: selectorPart.slice(segmentStart),
        };
    }

    /**
     * Checks whether the current source may perform value mutations, i.e. whether it is a trusted scriptlet,
     * whose name starts with `trusted-`, or a uBO alias of it, whose name starts with `ubo-trusted-`,
     * e.g. `ubo-trusted-json-edit`, which filters which may not use trusted scriptlets exclude as well.
     *
     * Remove operations stay available to non-trusted scriptlets.
     *
     * @param mutationMode parsed mutation mode
     * @returns true when the mutation is allowed
     */
    function isMutationAllowed(mutationMode: JsonPathMutationMode): boolean {
        if (mutationMode === 'remove') {
            return true;
        }

        return typeof source.name === 'string'
            && (
                source.name.startsWith(TRUSTED_SCRIPTLET_PREFIX)
                || source.name.startsWith(UBO_TRUSTED_SCRIPTLET_PREFIX)
            );
    }

    /**
     * Parses the selectors of a JSONPath query, and splits its value, from which its mutation is built
     * by `buildJsonPathCommand()`.
     *
     * @param expression full JSONPath query
     * @param nativeParse parse function to use, for the values of uBO rules, which are checked when they are parsed
     * @returns parsed query
     */
    function parseJsonPathQuery(expression: string, nativeParse: typeof JSON.parse): JsonPathParsedQuery {
        // In uBO `v2:` syntax a filter tests the children of each node, also of an object,
        // so leading filters are steps which select the children of the root, not guards of the root
        const isV2 = expression.startsWith(V2_PREFIX);
        const mutationParts = splitMutationExpression(isV2 ? expression.slice(V2_PREFIX.length) : expression);
        // The value `$remove$` of a query of a trusted scriptlet removes the nodes which the query matches,
        // as the same `argumentValue` does, e.g. `$.ads=$remove$ $..banner=false`, while it is a text for `+=`,
        // in quotes, which are a part of a text value, and after `json:`, e.g. `$.a=json:"$remove$"`.
        // Other scriptlets may not set a value, so it is not allowed for them, as before
        if (
            mutationParts.mode === 'set'
            && mutationParts.valuePart === REMOVE_VALUE_MARKER
            && isMutationAllowed('set')
        ) {
            mutationParts.mode = 'remove';
            mutationParts.valuePart = EMPTY_STRING;
        }
        // A value of a uBO rule is JSON, as in uBO, so a rule with a value which is not JSON is not applied,
        // e.g. `=Hello` or `=emptyObj`, and neither is a rule with an invalid payload of uBO after `=`,
        // e.g. `repl({"pattern":"ads",})`, which is built here only to be checked, as building it depends only
        // on the payload, while `replace(...)` of AdGuard rules is checked when it is built, as before,
        // as its keywords, e.g. `$now$`, call `Date` of the page
        if (isUboDialect && mutationParts.mode !== 'remove') {
            const { valuePart } = mutationParts;
            if (mutationParts.mode !== 'set' || !isPayloadExpressionValue(valuePart)) {
                try {
                    parseUboValue(valuePart, nativeParse);
                } catch {
                    throw new Error(`the value is not JSON: ${valuePart}`);
                }
            } else if (
                isPayloadValue(valuePart, 'repl(', CURLY_BRACKET_OPEN, CURLY_BRACKET_CLOSE)
                || isPayloadValue(valuePart, 'call(', SQUARE_BRACKET_OPEN, SQUARE_BRACKET_CLOSE)
            ) {
                try {
                    if (valuePart.startsWith('repl(')) {
                        buildReplUpdater(valuePart, nativeParse);
                    } else {
                        buildCallInvoker(valuePart, nativeParse);
                    }
                } catch {
                    throw new Error(`the payload is invalid: ${valuePart}`);
                }
            }
        }
        const selectorParts = splitPreconditionSelectors(mutationParts.selectorPart);

        // Leading filters of uBO rules are steps on the root, as in uBO, e.g. `[?.type=="ads"].visibility` selects
        // the matching items of an array root, and tests an object root itself, while they are guards of the root
        // of AdGuard rules, as before
        const parseSelectorPart = (selectorPart: string) => {
            const guardParts = isV2 || isUboDialect
                ? { guards: [], selectorPart }
                : extractGuards(selectorPart);
            return {
                guards: guardParts.guards,
                selector: parseJsonPathSelector(normalizeSelectorPart(guardParts.selectorPart)),
            };
        };

        const preconditions = selectorParts.preconditions.map((precondition) => {
            // A precondition which has only leading filters, e.g. `[?.ad]{2,};$`, counts the nodes they match,
            // e.g. the items of an array root, as in uBO, while a guard would match the root once at most
            const isOnlyFilters = !isV2 && extractGuards(precondition.selectorPart).selectorPart === EMPTY_STRING;
            const parsedPart = isOnlyFilters
                ? {
                    guards: [],
                    selector: parseJsonPathSelector(normalizeSelectorPart(precondition.selectorPart)),
                }
                : parseSelectorPart(precondition.selectorPart);
            return {
                guards: parsedPart.guards,
                max: precondition.max,
                min: precondition.min,
                selector: parsedPart.selector,
            };
        });
        const parsedSelectorPart = parseSelectorPart(selectorParts.selectorPart);

        return {
            guards: parsedSelectorPart.guards,
            isCall: mutationParts.mode === 'set'
                && isPayloadValue(mutationParts.valuePart, 'call(', SQUARE_BRACKET_OPEN, SQUARE_BRACKET_CLOSE),
            isValueChecked: false,
            isV2,
            mode: mutationParts.mode,
            preconditions,
            selector: parsedSelectorPart.selector,
            valuePart: mutationParts.valuePart,
        };
    }

    /**
     * Builds the mutation of a parsed query from its value, for each processed value which it matches,
     * so e.g. time keywords are resolved, and a JSON value is parsed, for each of them.
     *
     * @param query parsed query
     * @param nativeParse parse function to use
     * @param parseArgumentValue parsed trusted-json-set value resolver
     * @returns mutation to apply
     */
    function buildJsonPathMutation(
        query: JsonPathParsedQuery,
        nativeParse: typeof JSON.parse,
        parseArgumentValue: JsonPathArgumentValueParser,
    ): JsonPathMutation {
        let mutation: JsonPathMutation = {
            mode: query.mode,
        };

        if (query.mode === 'append' || query.mode === 'merge') {
            const value = isUboDialect
                ? parseUboValue(query.valuePart, nativeParse)
                : parseAppendValue(query.valuePart, nativeParse, parseArgumentValue);
            mutation = {
                mode: query.mode,
                updater: query.mode === 'merge' ? buildMergeUpdater(value) : buildAppendUpdater(value),
            };
        } else if (query.isCall) {
            mutation = {
                invoke: buildCallInvoker(query.valuePart, nativeParse),
                mode: 'set',
            };
        } else if (query.mode === 'set') {
            mutation = {
                mode: 'set',
                updater: isUboDialect && !isPayloadExpressionValue(query.valuePart)
                    ? buildUboSetUpdater(parseUboValue(query.valuePart, nativeParse))
                    : buildSetUpdater(query.valuePart, nativeParse, parseArgumentValue),
            };
        }

        return mutation;
    }

    /**
     * Checks whether a filter may match a primitive value, i.e. a value without properties.
     * A comparison of a selector with a step which selects a property or an item, e.g. `@.id=="ad"`, matches
     * no node of a primitive value, while one of the value itself, e.g. `@==1`, or of a selector with only
     * filters which may match it, e.g. `@[?(@==2)]`, and a negation, e.g. `!@.ad`, may match it.
     *
     * @param filter parsed filter
     * @returns true when the filter may match a primitive value
     */
    function canFilterMatchPrimitive(filter: JsonPathFilter): boolean {
        if ('conditions' in filter) {
            return filter.operator === 'and'
                ? filter.conditions.every((condition) => canFilterMatchPrimitive(condition))
                : filter.conditions.some((condition) => canFilterMatchPrimitive(condition));
        }
        // A negation of uBO rules matches a primitive value only if its condition may, e.g. `!@==1`,
        // as `!` negates the last step, which selects nothing of a primitive value, see `matchesUboNegation()`
        if ('condition' in filter) {
            return isUboDialect ? canFilterMatchPrimitive(filter.condition) : true;
        }
        // A selector of the root, e.g. `$.flag` of `[?($.flag)]`, tests the same root for any value
        if (filter.resolveSelectorAgainstRoot) {
            return true;
        }
        // A filter step tests a primitive value itself, while other steps select nothing of it
        const { steps } = filter.selector;
        for (let i = 0; i < steps.length; i += 1) {
            const stepFilter = steps[i].filter;
            if (steps[i].mode !== 'filter' || !stepFilter || !canFilterMatchPrimitive(stepFilter)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns the keys of the children of a value, i.e. of an object or an array.
     *
     * @param value value to inspect
     * @returns own enumerable keys, or none for a primitive value
     */
    function getChildKeys(value: any): string[] {
        // Typed arrays (Uint8Array, Float32Array, etc.) expose every element
        // as a numbered key. A large buffer would exhaust the traversal budget
        // before reaching any meaningful property, so they are skipped entirely.
        if (!isObjectLike(value) || ArrayBuffer.isView(value)) {
            return [];
        }

        return Object.keys(value);
    }

    /**
     * Returns the keys of the children of a value as uBO enumerates them, i.e. the indexes of an array, as numbers,
     * also of holes, e.g. which a reviver of `JSON.parse()` leaves, and without other properties of the array,
     * e.g. `metadata`, while the own enumerable keys of another object, as `getChildKeys()` does.
     *
     * @param value value to inspect
     * @returns keys of its children
     */
    function getUboChildKeys(value: any): (number | string)[] {
        if (!isArrayValue(value)) {
            return getChildKeys(value);
        }
        const keys: number[] = [];
        for (let i = 0; i < value.length; i += 1) {
            keys[i] = i;
        }
        return keys;
    }

    /**
     * Checks whether a value is an object with an own enumerable key, without collecting all of them.
     *
     * @param value value to inspect
     * @returns true when the value has a key
     */
    function hasChildKey(value: any): boolean {
        if (!isObjectLike(value)) {
            return false;
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns direct children of a candidate.
     *
     * @param candidate parent candidate
     * @returns child candidates
     */
    function getChildCandidates(candidate: JsonPathCandidate): JsonPathCandidate[] {
        const keys = getChildKeys(candidate.value);
        const output: JsonPathCandidate[] = [];

        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            output.push(createCandidate(candidate.value[key], candidate.value, key, candidate));
        }

        return output;
    }

    /**
     * Returns a candidate plus all of its descendants, breadth-first, i.e. by their depth,
     * so that e.g. the first match of a recursive selector of a comparison, e.g. `@.a < $..max`,
     * is the shallowest one, or depth-first for `call([...])`, i.e. each node followed by its own descendants
     * before its next sibling, as in uBO, so that the method is called in the same order, e.g. of `$..id=call(...)`.
     *
     * Primitive values may be skipped for a step which matches only children of objects, e.g. `$..ad`,
     * so that candidates are not created for them, while a filter step tests them as well.
     *
     * Cyclic structures are skipped by object identity. Inputs whose identity
     * changes on every read (non-caching proxies, getters minting fresh
     * wrappers) defeat identity checks, so traversal is additionally bounded
     * by `MAX_RECURSIVE_CANDIDATES` and `MAX_RECURSIVE_DEPTH`; once a budget
     * is exhausted the remaining branches are skipped and a message is logged.
     *
     * @param candidate root candidate for recursive descent
     * @param shouldSkipPrimitives whether descendants which are not objects are skipped
     * @param isEachSlotKept true to keep a candidate for each slot of an object which is visited already, without
     * its descendants, and to enumerate the items of an array by their indexes, see `getUboChildKeys()`, as uBO
     * does for a recursive filter, e.g. `..[?.ad]` removes both items of `[o, o]`, and `${key}` of `call([...])`
     * is `0`, not `'0'`
     * @returns recursive candidate list, possibly truncated to the budgets
     */
    function getRecursiveCandidates(
        candidate: JsonPathCandidate,
        shouldSkipPrimitives: boolean,
        isEachSlotKept = false,
    ): JsonPathCandidate[] {
        const output: JsonPathCandidate[] = [];
        const visitedObjects = new WeakSet<object>();
        // Candidates of slots of objects which are visited already, whose descendants are not visited again
        const repeatedSlots = new Set<JsonPathCandidate>();
        let isBudgetExhausted = false;
        // Counts only object-valued candidates. Primitives can never form a
        // cycle so they are not counted, which avoids false positives on large
        // arrays of numbers or strings.
        let objectCandidateCount = 0;

        /**
         * Adds a child of a visited node to the output, unless its object has been visited already,
         * or it is a skipped primitive value.
         *
         * @param parentCandidate candidate of the visited node
         * @param childKey key of the child, an index of an array as a number for `isEachSlotKept`
         * @returns candidate of the child, or null if it is not added
         */
        const addChild = (parentCandidate: JsonPathCandidate, childKey: number | string): JsonPathCandidate | null => {
            const value = parentCandidate.value[childKey];
            if (isObjectLike(value)) {
                if (visitedObjects.has(value)) {
                    if (!isEachSlotKept) {
                        return null;
                    }
                    const slot = createCandidate(value, parentCandidate.value, childKey, parentCandidate);
                    repeatedSlots.add(slot);
                    output.push(slot);
                    return slot;
                }
                visitedObjects.add(value);
                objectCandidateCount += 1;
                if (objectCandidateCount >= MAX_RECURSIVE_CANDIDATES) {
                    isBudgetExhausted = true;
                    return null;
                }
            } else if (shouldSkipPrimitives) {
                return null;
            }

            const child = createCandidate(value, parentCandidate.value, childKey, parentCandidate);
            output.push(child);
            return child;
        };

        if (isObjectLike(candidate.value)) {
            visitedObjects.add(candidate.value);
            objectCandidateCount += 1;
        } else if (shouldSkipPrimitives) {
            return output;
        }
        output.push(candidate);

        if (!shouldTraverseDepthFirst) {
            // Depth of each candidate, aligned with `output` by index, which is the queue of the traversal
            const candidateDepths: number[] = [0];
            for (let head = 0; head < output.length && !isBudgetExhausted; head += 1) {
                const parentCandidate = output[head];
                if (repeatedSlots.has(parentCandidate)) {
                    continue;
                }
                const keys = isEachSlotKept
                    ? getUboChildKeys(parentCandidate.value)
                    : getChildKeys(parentCandidate.value);
                if (keys.length === 0) {
                    continue;
                }
                const childDepth = candidateDepths[head] + 1;
                if (childDepth > MAX_RECURSIVE_DEPTH) {
                    isBudgetExhausted = true;
                    break;
                }
                for (let i = 0; i < keys.length && !isBudgetExhausted; i += 1) {
                    if (addChild(parentCandidate, keys[i])) {
                        candidateDepths.push(childDepth);
                    }
                }
            }
        } else {
            // Keys of each node on the current branch which are not visited yet, with the depth of its children
            const getKeys = isEachSlotKept ? getUboChildKeys : getChildKeys;
            const branchStack: {
                candidate: JsonPathCandidate;
                depth: number;
                index: number;
                keys: (number | string)[];
            }[] = [{
                candidate,
                depth: 1,
                index: 0,
                keys: getKeys(candidate.value),
            }];
            while (branchStack.length > 0 && !isBudgetExhausted) {
                const level = branchStack[branchStack.length - 1];
                if (level.index >= level.keys.length) {
                    branchStack.pop();
                    continue;
                }

                const child = addChild(level.candidate, level.keys[level.index]);
                level.index += 1;
                if (child === null || repeatedSlots.has(child)) {
                    continue;
                }

                const childKeys = getKeys(child.value);
                if (childKeys.length === 0) {
                    continue;
                }
                if (level.depth + 1 > MAX_RECURSIVE_DEPTH) {
                    isBudgetExhausted = true;
                    break;
                }
                branchStack.push({
                    candidate: child,
                    depth: level.depth + 1,
                    index: 0,
                    keys: childKeys,
                });
            }
        }

        if (isBudgetExhausted) {
            logMessage(
                source,
                'JSONPath recursive descent exceeded its traversal budget, results may be incomplete',
            );
        }

        return output;
    }

    /**
     * Resolves negative indexes against an array length.
     *
     * @param arrayLength array length
     * @param index raw index
     * @returns resolved absolute index
     */
    function resolveIndex(arrayLength: number, index: number): number {
        return index < 0 ? arrayLength + index : index;
    }

    /**
     * Resolves slice notation to concrete array indexes.
     *
     * @param arrayLength target array length
     * @param slice parsed slice descriptor
     * @param slice.end slice end index
     * @param slice.start slice start index
     * @param slice.step slice step value
     * @returns matching index list
     */
    function getSliceIndexes(
        arrayLength: number,
        slice: {
            end?: number;
            start?: number;
            step?: number;
        },
    ): number[] {
        const output: number[] = [];
        const step = slice.step === undefined ? 1 : slice.step;
        let startValue;
        let endValue;

        if (step === 0) {
            return output;
        }

        if (slice.start === undefined) {
            startValue = step > 0 ? 0 : arrayLength - 1;
        } else {
            startValue = resolveIndex(arrayLength, slice.start);
        }

        if (slice.end === undefined) {
            endValue = step > 0 ? arrayLength : -1;
        } else {
            endValue = resolveIndex(arrayLength, slice.end);
        }

        if (step > 0) {
            for (let i = Math.max(0, startValue); i < Math.min(arrayLength, endValue); i += step) {
                output.push(i);
            }
            return output;
        }

        for (let i = Math.min(arrayLength - 1, startValue); i > Math.max(-1, endValue); i += step) {
            output.push(i);
        }
        return output;
    }

    /**
     * Applies a non-filter traversal step to a candidate.
     *
     * @param candidate current traversal candidate
     * @param step step to apply
     * @returns matching candidates produced by the step
     */
    function applyDirectStep(candidate: JsonPathCandidate, step: JsonPathStep): JsonPathCandidate[] {
        const output: JsonPathCandidate[] = [];

        if (step.mode === 'property') {
            if (!isObjectLike(candidate.value) || !step.properties) {
                return output;
            }

            const seenKeys = new Set<string>();

            for (let i = 0; i < step.properties.length; i += 1) {
                const property = step.properties[i];

                if (property instanceof RegExp) {
                    const keys = Object.keys(candidate.value);

                    for (let j = 0; j < keys.length; j += 1) {
                        const key = keys[j];

                        property.lastIndex = 0;
                        if (!property.test(key) || (seenKeys.has(key) && !shouldKeepDuplicateKeys)) {
                            continue;
                        }

                        seenKeys.add(key);
                        output.push(createCandidate(
                            candidate.value[key],
                            candidate.value,
                            key,
                            candidate,
                        ));
                    }

                    continue;
                }

                if (
                    (seenKeys.has(property) && !shouldKeepDuplicateKeys)
                    || !Object.prototype.hasOwnProperty.call(candidate.value, property)
                ) {
                    continue;
                }

                seenKeys.add(property);
                output.push(createCandidate(
                    candidate.value[property],
                    candidate.value,
                    property,
                    candidate,
                ));
            }

            return output;
        }

        if (step.mode === 'wildcard') {
            return getChildCandidates(candidate);
        }

        if (step.mode === 'index') {
            if (!isArrayValue(candidate.value) || !step.indexes) {
                return output;
            }

            for (let i = 0; i < step.indexes.length; i += 1) {
                const resolvedIndex = resolveIndex(candidate.value.length, step.indexes[i]);
                if (resolvedIndex >= 0 && resolvedIndex < candidate.value.length) {
                    output.push(createCandidate(
                        candidate.value[resolvedIndex],
                        candidate.value,
                        resolvedIndex,
                        candidate,
                    ));
                }
            }
            return output;
        }

        if (step.mode === 'computed-index') {
            if (!isArrayValue(candidate.value)) {
                return output;
            }

            const index = candidate.value.length - (step.subtractLength || 0);
            if (index >= 0 && index < candidate.value.length) {
                output.push(createCandidate(
                    candidate.value[index],
                    candidate.value,
                    index,
                    candidate,
                ));
            }
            return output;
        }

        if (step.mode === 'slice') {
            if (!isArrayValue(candidate.value) || !step.slice) {
                return output;
            }

            const sliceIndexes = getSliceIndexes(candidate.value.length, step.slice);
            for (let i = 0; i < sliceIndexes.length; i += 1) {
                const index = sliceIndexes[i];
                output.push(createCandidate(
                    candidate.value[index],
                    candidate.value,
                    index,
                    candidate,
                ));
            }
        }

        return output;
    }

    /**
     * Evaluates a parsed selector against a JSON value.
     *
     * @param selectorRoot traversal root value
     * @param selector parsed selector AST
     * @returns matching mutable candidates
     */
    function evaluateSelector(
        selectorRoot: any,
        selector: JsonPathSelector,
        isFirstMatchEnough = false,
    ): JsonPathCandidate[] {
        /**
         * Evaluates a filter against a candidate value.
         *
         * @param value candidate value to check
         * @param filter parsed filter descriptor
         * @returns true when the candidate matches the filter
         */
        function matchesFilterValue(value: any, filter: JsonPathFilter): boolean {
            if ('conditions' in filter) {
                if (filter.operator === 'and') {
                    return filter.conditions.every((condition) => matchesFilterValue(value, condition));
                }

                return filter.conditions.some((condition) => matchesFilterValue(value, condition));
            }

            if ('condition' in filter) {
                const { condition } = filter;
                if (isUboDialect && 'selector' in condition) {
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    return matchesUboNegation(value, condition, filter);
                }
                return !matchesFilterValue(value, condition);
            }

            const isRootOnlyFilter = filter.resolveSelectorAgainstRoot === true
                && (!filter.comparisonSelector || filter.resolveComparisonAgainstRoot === true);
            if (!isRootOnlyFilter) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return matchesComparisonFilter(value, filter);
            }
            if (!rootOnlyFilterResults) {
                rootOnlyFilterResults = new Map();
            }
            let result = rootOnlyFilterResults.get(filter);
            if (result === undefined) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                result = matchesComparisonFilter(value, filter);
                rootOnlyFilterResults.set(filter, result);
            }
            return result;
        }

        /**
         * Evaluates a comparison filter against a candidate value.
         *
         * @param value candidate value to check
         * @param filter parsed comparison filter
         * @returns true when the candidate matches the filter
         */
        function matchesComparisonFilter(value: any, filter: JsonPathComparisonFilter): boolean {
            // `$` is the root of the document, also in a filter, e.g. `$.items[?$.flag]`, as in RFC 9535 and uBO,
            // which is searched once for a command, see `rootSelections`
            const matchedCandidates = filter.resolveSelectorAgainstRoot
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                ? selectFromRoot(filter.selector)
                : evaluateSelector(value, filter.selector);
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            return matchesCandidates(value, matchedCandidates, filter);
        }

        /**
         * Checks whether the values of a uBO rule which a negated filter tests match it, as in uBO, in which `!`
         * negates the last step of its selector, e.g. `.x` of `!.a.x`, for each parent which the previous steps
         * select, e.g. `.a`, so a parent which does not exist or is not an object, e.g. a primitive value, does not
         * match, and with a comparison, e.g. `!.x=="a"`, a missing property does not match either:
         * - `!.x` matches an object without `x`;
         * - `!.x=="a"` matches an object with `x` which is not `"a"`;
         * - a recursive last step is negated for the parent and each object below it, as in uBO, e.g. `!..ad==true`
         *   matches if one of them has `ad` which is not `true`, and `!..ad` if one of them has no `ad`,
         *   while AdGuard rules negate the whole test, as RFC 9535 does.
         * A selector of the root, e.g. `!$..ad==true`, is negated in the same way from the root, as in uBO,
         * whose result is the same for each tested node, so it is evaluated once for a command,
         * see `rootOnlyFilterResults`.
         * Other negations, e.g. of `@==1`, or of a nested filter, e.g. `!.offers[?.ad]`, are negated as a whole,
         * as for AdGuard rules, while uBO ignores `!` before a nested filter, as before a regular expression,
         * which is not mirrored, also for a primitive value, which matches only if the condition may match it,
         * see `canFilterMatchPrimitive()`.
         *
         * @param value candidate value to check
         * @param filter negated comparison filter
         * @param negation negation filter, by which the result of a selector of the root is reused
         * @returns true when the candidate matches the negation
         */
        function matchesUboNegation(
            value: any,
            filter: JsonPathComparisonFilter,
            negation: JsonPathFilter,
        ): boolean {
            const { steps } = filter.selector;
            const lastStep = steps[steps.length - 1];
            if (
                filter.comparisonSelector
                || !lastStep
                || (lastStep.mode !== 'property' && lastStep.mode !== 'index' && lastStep.mode !== 'wildcard')
            ) {
                if (!canFilterMatchPrimitive(filter) && !isObjectLike(value)) {
                    return false;
                }
                return !matchesFilterValue(value, filter);
            }

            if (filter.resolveSelectorAgainstRoot) {
                if (!rootOnlyFilterResults) {
                    rootOnlyFilterResults = new Map();
                }
                let result = rootOnlyFilterResults.get(negation);
                if (result === undefined) {
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    result = matchesUboNegationFrom(root, filter, lastStep, true);
                    rootOnlyFilterResults.set(negation, result);
                }
                return result;
            }
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            return matchesUboNegationFrom(value, filter, lastStep, false);
        }

        /**
         * Tests the last step of a negated filter of uBO rules on the parents which the previous steps select,
         * see `matchesUboNegation()`.
         *
         * @param value value from which the selector starts, i.e. the tested node or the root
         * @param filter negated comparison filter
         * @param lastStep last step of its selector, which selects a property, an index or all children
         * @param isFromRoot true if the selector starts at the root, whose parents are selected once for a command,
         * see `selectFromRoot()`
         * @returns true when the negation matches
         */
        function matchesUboNegationFrom(
            value: any,
            filter: JsonPathComparisonFilter,
            lastStep: JsonPathStep,
            isFromRoot: boolean,
        ): boolean {
            const { steps } = filter.selector;
            let selectedParents: JsonPathCandidate[];
            if (steps.length === 1) {
                selectedParents = [createCandidate(value, null, null, null)];
            } else {
                if (!filter.parentSelector) {
                    filter.parentSelector = { steps: steps.slice(0, -1) };
                }
                selectedParents = isFromRoot
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    ? selectFromRoot(filter.parentSelector)
                    : evaluateSelector(value, filter.parentSelector);
            }
            // A recursive last step, e.g. `..ad`, is tested on each selected parent and on each object below it,
            // which are visited as by uBO, e.g. not through a property of an array which is not an index
            let parents = selectedParents;
            if (lastStep.recursive) {
                parents = [];
                for (let i = 0; i < selectedParents.length; i += 1) {
                    const objects = getRecursiveCandidates(selectedParents[i], true, true);
                    for (let j = 0; j < objects.length; j += 1) {
                        parents[parents.length] = objects[j];
                    }
                }
            }

            for (let i = 0; i < parents.length; i += 1) {
                const parent = parents[i];
                const owner = parent.value;
                if (!isObjectLike(owner)) {
                    continue;
                }
                // Keys which the last step tests: its names, also of missing properties, or the existing ones
                // of a regular expression or a wildcard, as in uBO
                const keys: (number | string)[] = [];
                if (lastStep.mode === 'wildcard') {
                    const childKeys = getUboChildKeys(owner);
                    for (let j = 0; j < childKeys.length; j += 1) {
                        keys[keys.length] = childKeys[j];
                    }
                } else if (lastStep.mode === 'index') {
                    if (!isArrayValue(owner) || !lastStep.indexes) {
                        continue;
                    }
                    for (let j = 0; j < lastStep.indexes.length; j += 1) {
                        keys[keys.length] = resolveIndex(owner.length, lastStep.indexes[j]);
                    }
                } else if (lastStep.properties) {
                    for (let j = 0; j < lastStep.properties.length; j += 1) {
                        const property = lastStep.properties[j];
                        if (!(property instanceof RegExp)) {
                            keys[keys.length] = property;
                            continue;
                        }
                        const childKeys = Object.keys(owner);
                        for (let k = 0; k < childKeys.length; k += 1) {
                            property.lastIndex = 0;
                            if (property.test(childKeys[k])) {
                                keys[keys.length] = childKeys[k];
                            }
                        }
                    }
                }

                for (let j = 0; j < keys.length; j += 1) {
                    const key = keys[j];
                    // A hole of an array, e.g. which a reviver of `JSON.parse()` leaves, is missing, as in uBO
                    const isPresent = (typeof key !== 'number' || (key >= 0 && key < owner.length))
                        && Object.prototype.hasOwnProperty.call(owner, key);
                    if (filter.operator === FILTER_OPERATORS.EXISTS) {
                        if (!isPresent) {
                            return true;
                        }
                        continue;
                    }
                    if (!isPresent) {
                        continue;
                    }
                    const candidate = createCandidate((owner as any)[key], owner, key, parent);
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    if (!matchesCandidates(value, [candidate], filter)) {
                        return true;
                    }
                }
            }

            return false;
        }

        /**
         * Checks whether the values which the selector of a comparison filter has selected match it.
         *
         * @param value candidate value which the filter tests, for a selector of its comparison,
         * e.g. `@.b` of `@.a==@.b`
         * @param matchedCandidates nodes which the selector of the filter has selected
         * @param filter parsed comparison filter
         * @returns true when any of them matches the filter
         */
        function matchesCandidates(
            value: any,
            matchedCandidates: JsonPathCandidate[],
            filter: JsonPathComparisonFilter,
        ): boolean {
            if (filter.operator === FILTER_OPERATORS.EXISTS) {
                return matchedCandidates.length > 0;
            }

            let comparisonValue = filter.comparisonValue;
            if (filter.comparisonSelector) {
                const comparisonMatches = filter.resolveComparisonAgainstRoot
                    // eslint-disable-next-line @typescript-eslint/no-use-before-define
                    ? selectFromRoot(filter.comparisonSelector)
                    : evaluateSelector(value, filter.comparisonSelector);
                if (comparisonMatches.length === 0) {
                    return false;
                }
                comparisonValue = comparisonMatches[0].value;
            }

            // The value which a string is compared with is converted on the first comparison, and only once,
            // as e.g. `toString()` of an object of the page may be called, and a value which cannot be converted,
            // e.g. an object without `toString()`, is not matched, as the value to compare
            let comparisonString: string | null = null;
            let isComparisonConverted = false;
            const getComparisonString = (): string | null => {
                if (!isComparisonConverted) {
                    isComparisonConverted = true;
                    try {
                        comparisonString = String(comparisonValue);
                    } catch {
                        comparisonString = null;
                    }
                }
                return comparisonString;
            };

            // Many values of the root which are compared by `==` with the tested node, e.g. `$.blockedIds[*]`
            // of `$.items[?$.blockedIds[*]==@.id]`, are looked up in a set, which is built once for a command,
            // as comparing each of them for each node takes the time of both lists multiplied, e.g. about 330 ms
            // for 8,000 items and 8,000 values. A set finds the same values as `===`, also `-0` for `0`,
            // and objects by their identity, except `NaN`, which `===` never matches
            if (
                filter.operator === FILTER_OPERATORS.EQUAL
                && filter.resolveSelectorAgainstRoot
                && matchedCandidates.length > ROOT_VALUE_SET_MIN_SIZE
            ) {
                // `NaN` is the only value not equal to itself, while `Number.isNaN()` may be replaced by the page
                // eslint-disable-next-line no-self-compare
                const isNotNaN = comparisonValue === comparisonValue;
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return isNotNaN && getRootValueSet(filter.selector, matchedCandidates).has(comparisonValue);
            }

            for (let i = 0; i < matchedCandidates.length; i += 1) {
                const matchedValue = matchedCandidates[i].value;
                // A value of uBO rules which is not a string is converted to a string, as by uBO, e.g. `12`
                // contains `"1"`, and `true` matches `/^tr/`, while AdGuard rules match only strings, as before
                let textValue: string | null = typeof matchedValue === 'string' ? matchedValue : null;
                if (
                    textValue === null
                    && isUboDialect
                    && (filter.operator === FILTER_OPERATORS.CONTAINS || filter.operator === FILTER_OPERATORS.REGEX)
                ) {
                    try {
                        textValue = String(matchedValue);
                    } catch {
                        // e.g. an object without a prototype, which is not matched
                    }
                }

                if (filter.operator === FILTER_OPERATORS.CONTAINS) {
                    if (textValue === null) {
                        continue;
                    }
                    const containedString = getComparisonString();
                    if (containedString === null) {
                        return false;
                    }
                    if (textValue.includes(containedString)) {
                        return true;
                    }
                    continue;
                }

                // As in uBO, the value is converted to a string, e.g. `1` starts with `"1"`,
                // and a value which cannot be converted, e.g. an object without a prototype, is not matched
                if (
                    filter.operator === FILTER_OPERATORS.STARTS_WITH
                    || filter.operator === FILTER_OPERATORS.ENDS_WITH
                ) {
                    let stringValue;
                    try {
                        stringValue = String(matchedValue);
                    } catch {
                        continue;
                    }
                    const affixString = getComparisonString();
                    if (affixString === null) {
                        return false;
                    }
                    const isMatched = filter.operator === FILTER_OPERATORS.STARTS_WITH
                        ? stringValue.startsWith(affixString)
                        : stringValue.endsWith(affixString);
                    if (isMatched) {
                        return true;
                    }
                    continue;
                }

                if (filter.operator === FILTER_OPERATORS.REGEX) {
                    if (textValue !== null && comparisonValue instanceof RegExp) {
                        comparisonValue.lastIndex = 0;
                        if (comparisonValue.test(textValue)) {
                            return true;
                        }
                    }
                    continue;
                }

                if (filter.operator === FILTER_OPERATORS.EQUAL && matchedValue === comparisonValue) {
                    return true;
                }
                if (filter.operator === FILTER_OPERATORS.NOT_EQUAL && matchedValue !== comparisonValue) {
                    return true;
                }
                if (filter.operator === FILTER_OPERATORS.LESS_THAN && matchedValue < comparisonValue) {
                    return true;
                }
                if (filter.operator === FILTER_OPERATORS.LESS_THAN_OR_EQUAL && matchedValue <= comparisonValue) {
                    return true;
                }
                if (filter.operator === FILTER_OPERATORS.GREATER_THAN && matchedValue > comparisonValue) {
                    return true;
                }
                if (
                    filter.operator === FILTER_OPERATORS.GREATER_THAN_OR_EQUAL
                    && matchedValue >= comparisonValue
                ) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Returns the nodes which a selector of the root in a filter selects, e.g. `$..limit`, which are selected
         * once for the command which is evaluated, see `rootSelections`.
         *
         * @param rootSelector selector of the root
         * @returns selected nodes
         */
        function selectFromRoot(rootSelector: JsonPathSelector): JsonPathCandidate[] {
            if (!rootSelections) {
                rootSelections = new Map();
            }
            let selection = rootSelections.get(rootSelector);
            if (!selection) {
                selection = evaluateSelector(root, rootSelector);
                rootSelections.set(rootSelector, selection);
            }
            return selection;
        }

        /**
         * Returns the set of the values of the nodes which a selector of the root selects, which is built once
         * for the command which is evaluated, see `rootValueSets`.
         *
         * @param rootSelector selector of the root
         * @param candidates nodes which it selects
         * @returns set of their values
         */
        function getRootValueSet(rootSelector: JsonPathSelector, candidates: JsonPathCandidate[]): Set<any> {
            if (!rootValueSets) {
                rootValueSets = new Map();
            }
            let valueSet = rootValueSets.get(rootSelector);
            if (!valueSet) {
                valueSet = new Set();
                for (let i = 0; i < candidates.length; i += 1) {
                    valueSet.add(candidates[i].value);
                }
                rootValueSets.set(rootSelector, valueSet);
            }
            return valueSet;
        }

        /**
         * Applies a filter step to the current candidate list.
         *
         * @param candidates current traversal candidates
         * @param filter parsed filter descriptor
         * @returns candidates that satisfy the filter
         */
        function applyFilterStep(
            candidates: JsonPathCandidate[],
            filter: JsonPathFilter,
            isFirstOutputEnough: boolean,
        ): JsonPathCandidate[] {
            const output: JsonPathCandidate[] = [];
            // Whether primitive items of an array are skipped, as the filter cannot match them,
            // e.g. `[?(@.id=="ad")]`, which is checked for the first array, as most filters are not applied
            // to an array at all, e.g. a guard of a root which is an object
            let shouldSkipPrimitiveItems: boolean | null = null;

            for (let i = 0; i < candidates.length && !(isFirstOutputEnough && output.length > 0); i += 1) {
                const candidate = candidates[i];
                if (shouldFilterChildren) {
                    const keys = getChildKeys(candidate.value);
                    for (let j = 0; j < keys.length && !(isFirstOutputEnough && output.length > 0); j += 1) {
                        const childValue = candidate.value[keys[j]];
                        if (matchesFilterValue(childValue, filter)) {
                            output.push(createCandidate(childValue, candidate.value, keys[j], candidate));
                        }
                    }
                    continue;
                }

                if (isArrayValue(candidate.value)) {
                    const { length } = candidate.value;
                    if (shouldSkipPrimitiveItems === null) {
                        shouldSkipPrimitiveItems = !canFilterMatchPrimitive(filter);
                    }
                    for (let j = 0; j < length && !(isFirstOutputEnough && output.length > 0); j += 1) {
                        // An item is read once, as a getter of the page may return another value on each read,
                        // so the filter tests the value which the next steps process
                        const item = candidate.value[j];
                        if (shouldSkipPrimitiveItems && !isObjectLike(item)) {
                            continue;
                        }
                        if (matchesFilterValue(item, filter)) {
                            output.push(createCandidate(item, candidate.value, j, candidate));
                        }
                    }
                    continue;
                }

                // A filter of uBO rules on an object tests it only if it has a key, as uBO tests it for each key,
                // e.g. `.c[?!.ad]` does not match `{}`, as in RFC 9535, in which a filter selects children,
                // and it does not test a primitive value at all, e.g. `.a[?@==1]`
                if (isUboDialect && !hasChildKey(candidate.value)) {
                    continue;
                }

                if (matchesFilterValue(candidate.value, filter)) {
                    output.push(candidate);
                }
            }

            return output;
        }

        let candidates: JsonPathCandidate[] = [createCandidate(selectorRoot, null, null, null)];

        for (let i = 0; i < selector.steps.length; i += 1) {
            const step = selector.steps[i];
            // e.g. for `matchesJsonPath()`, nodes of the last step are not selected after the first one
            const isFirstOutputEnough = isFirstMatchEnough && i === selector.steps.length - 1;
            if (step.mode === 'filter' && step.filter) {
                // `$..[?(...)]` must test every descendant, so recursive
                // filter steps expand candidates the same way direct steps do
                // A recursive filter of uBO rules tests each descendant as a whole, as uBO does, also an array,
                // e.g. `..[?!.x]` matches an array, and not the node from which it starts, e.g. the root,
                // while one of AdGuard rules tests the node as well, and the items of an array instead of it
                if (step.recursive && isUboDialect && !shouldFilterChildren) {
                    const shouldSkipPrimitives = !canFilterMatchPrimitive(step.filter);
                    const output: JsonPathCandidate[] = [];
                    for (let j = 0; j < candidates.length && !(isFirstOutputEnough && output.length > 0); j += 1) {
                        const recursiveCandidates = getRecursiveCandidates(candidates[j], shouldSkipPrimitives, true);
                        const firstIndex = recursiveCandidates[0] === candidates[j] ? 1 : 0;
                        for (
                            let k = firstIndex;
                            k < recursiveCandidates.length && !(isFirstOutputEnough && output.length > 0);
                            k += 1
                        ) {
                            if (matchesFilterValue(recursiveCandidates[k].value, step.filter)) {
                                output.push(recursiveCandidates[k]);
                            }
                        }
                    }
                    candidates = output;
                    continue;
                }
                let candidatesToFilter = candidates;
                if (step.recursive) {
                    // Primitive values are skipped if the filter cannot match them, e.g. `[?(@.id=="ad")]`,
                    // and with `v2:`, in which it tests the children
                    const shouldSkipPrimitives = shouldFilterChildren || !canFilterMatchPrimitive(step.filter);
                    candidatesToFilter = [];
                    for (let j = 0; j < candidates.length; j += 1) {
                        const recursiveCandidates = getRecursiveCandidates(candidates[j], shouldSkipPrimitives);
                        for (let k = 0; k < recursiveCandidates.length; k += 1) {
                            candidatesToFilter.push(recursiveCandidates[k]);
                        }
                    }
                }
                candidates = applyFilterStep(candidatesToFilter, step.filter, isFirstOutputEnough);
                continue;
            }

            const nextCandidates: JsonPathCandidate[] = [];
            for (let j = 0; j < candidates.length && !(isFirstOutputEnough && nextCandidates.length > 0); j += 1) {
                const currentCandidate = candidates[j];
                // Other steps match only children of objects and arrays, so primitive values are skipped
                const candidatesToCheck = step.recursive
                    ? getRecursiveCandidates(currentCandidate, true)
                    : [currentCandidate];

                for (let k = 0; k < candidatesToCheck.length; k += 1) {
                    const matchedCandidates = applyDirectStep(candidatesToCheck[k], step);
                    for (let n = 0; n < matchedCandidates.length; n += 1) {
                        nextCandidates.push(matchedCandidates[n]);
                    }
                }
            }
            candidates = nextCandidates;
        }

        return candidates;
    }

    let didMutate = false;

    /**
     * Marks that the current command changed the root object.
     */
    function markMutated(): void {
        didMutate = true;
    }

    /**
     * Removes all matched properties or array entries.
     *
     * A node matched more than once, e.g. by `$..[?(@.ad)]` as an item and as a descendant, is removed once,
     * and the indexes of an array are collected in a set, so the items of each array are removed in one pass,
     * which keeps the other ones in the same array.
     *
     * @param matches mutable matches to delete
     */
    function removeMatches(matches: JsonPathCandidate[]): void {
        const arrayIndexes = new Map<any[], Set<number>>();
        // A property is deleted once, e.g. one which `$..*..ad` reaches twice, as a deletion is observable,
        // e.g. by a Proxy of the page, so keys are compared as strings, as in `updateMatches()`
        const deletedKeys = new Map<any, Set<string>>();

        for (let i = 0; i < matches.length; i += 1) {
            const match = matches[i];
            if (match.parent === null || match.key === null) {
                continue;
            }

            if (isArrayValue(match.parent)) {
                let indexes = arrayIndexes.get(match.parent);
                if (!indexes) {
                    indexes = new Set<number>();
                    arrayIndexes.set(match.parent, indexes);
                }
                indexes.add(Number(match.key));
                continue;
            }

            let keys = deletedKeys.get(match.parent);
            if (!keys) {
                keys = new Set<string>();
                deletedKeys.set(match.parent, keys);
            }
            const key = String(match.key);
            if (keys.has(key)) {
                continue;
            }
            keys.add(key);

            delete match.parent[match.key];
            markMutated();
        }

        arrayIndexes.forEach((indexes, arrayValue) => {
            const { length } = arrayValue;
            const removedIndexes: number[] = [];
            indexes.forEach((index) => {
                if (index >= 0 && index < length) {
                    removedIndexes.push(index);
                }
            });
            if (removedIndexes.length === 0) {
                return;
            }
            removedIndexes.sort((left, right) => left - right);

            // The last item is removed first by `splice()`, as before, so an array which refuses a change,
            // e.g. a sealed or a frozen one, a getter without a setter, or a Proxy of the page, throws as before,
            // and a single item is removed as fast as before
            const lastIndex = removedIndexes[removedIndexes.length - 1];
            arrayValue.splice(lastIndex, 1);
            markMutated();
            if (removedIndexes.length === 1) {
                return;
            }

            // A few other items are removed by `splice()` of each, from the last, as before, so an array which
            // refuses a later change, e.g. of a read-only item, is changed as before up to it
            if (removedIndexes.length <= MAX_SPLICED_ITEMS) {
                for (let i = removedIndexes.length - 2; i >= 0; i -= 1) {
                    arrayValue.splice(removedIndexes[i], 1);
                }
                return;
            }

            // Many other items are removed in one pass, instead of `splice()` for each, which is quadratic:
            // the kept ranges between them are moved by `copyWithin()` of arrays, not the one of the array,
            // which the page may replace, and the array is shortened by its length. If the array refuses a change
            // of an item in the middle, e.g. a read-only one, it is changed up to it, though not as by `splice()`
            // of each, and `deleteProperty` of a Proxy is not called for the removed items, which is accepted
            const currentLength = length - 1;
            const lastRemaining = removedIndexes.length - 1;
            let writeIndex = removedIndexes[0];
            for (let i = 0; i < lastRemaining; i += 1) {
                const rangeStart = removedIndexes[i] + 1;
                const rangeEnd = i + 1 < lastRemaining ? removedIndexes[i + 1] : currentLength;
                if (rangeEnd > rangeStart) {
                    Reflect.apply(Array.prototype.copyWithin, arrayValue, [writeIndex, rangeStart, rangeEnd]);
                    writeIndex += rangeEnd - rangeStart;
                }
            }
            // The items after the kept ones are removed by the length, as `splice()` does for an array,
            // so it stays packed, while deleting them one by one would make it a dictionary, which is slow
            if (!Reflect.set(arrayValue, 'length', writeIndex)) {
                throw new TypeError('Cannot set the length of an array');
            }
        });
    }

    /**
     * Updates all matched properties or array entries.
     *
     * @param currentRoot current root value
     * @param matches mutable matches to update
     * @param updater value transformer to apply
     * @param isFromLast true to update the nodes from the last matched one, as uBO does, for `+=`, which merges
     * a value in place, so a node is merged before the nodes which contain it, e.g. for `..config+={"config":{}}`,
     * as merging a node first would put the value into it, which would then be merged into the value itself,
     * e.g. its `config` into its `config`, which makes it circular
     * @returns root, which the updater may have replaced
     */
    function updateMatches(
        currentRoot: any,
        matches: JsonPathCandidate[],
        updater: (currentValue: any) => any,
        isFromLast: boolean,
    ): any {
        // A node matched more than once is updated once, e.g. an item matched by `$..[?(@.ad)]` with its index `0`
        // as an item, and with its key `'0'` as a descendant, so keys are compared as strings
        const updatedKeys = new Map<any, Set<string>>();
        let isRootUpdated = false;
        let nextRoot = currentRoot;

        for (let n = 0; n < matches.length; n += 1) {
            const match = matches[isFromLast ? matches.length - 1 - n : n];

            if (match.parent === null && match.key === null && match.parentCandidate === null) {
                if (!isRootUpdated) {
                    isRootUpdated = true;
                    const nextValue = updater(nextRoot);
                    if (nextValue === MUTATED_IN_PLACE) {
                        markMutated();
                    } else if (nextValue !== UNCHANGED_VALUE) {
                        nextRoot = nextValue;
                        markMutated();
                    }
                }
                continue;
            }

            if (match.parent === null || match.key === null) {
                continue;
            }

            let keys = updatedKeys.get(match.parent);
            if (!keys) {
                keys = new Set<string>();
                updatedKeys.set(match.parent, keys);
            }
            const key = String(match.key);
            if (keys.has(key)) {
                continue;
            }
            keys.add(key);

            const nextValue = updater(match.parent[match.key]);
            if (nextValue === MUTATED_IN_PLACE) {
                markMutated();
            } else if (nextValue !== UNCHANGED_VALUE) {
                match.parent[match.key] = nextValue;
                markMutated();
            }
        }

        return nextRoot;
    }

    if (!isObjectLike(root)) {
        return root;
    }

    const nativeParse = resolveNativeParse(nativeObjects);
    const nativeStringify = resolveNativeStringify(nativeObjects);
    const parseArgumentValue = (argumentValue: string) => parseJsonSetArgumentValue(source, argumentValue, nativeParse);

    // Stack trace is read only if it is matched or logged, as the page may make creating or reading it throw,
    // e.g. by replacing `Error` or by `Error.prepareStackTrace`, or make it a non-string value,
    // which should not stop the rules without `stack` from working
    let currentStackTrace = '';
    let isStackTraceRead = false;
    // `typeof` is used instead of `Array.isArray()`, which may be the method intercepted by the rule itself,
    // e.g. of `trusted-json-set`, and which may be called very often, so each its call should be avoided
    const isPathString = typeof path === 'string';
    const isEmptyPath = isPathString ? !path : path.length === 0;
    if (stack || isEmptyPath) {
        try {
            currentStackTrace = String(new Error().stack || '');
            isStackTraceRead = true;
        } catch {
            // Rules with `stack` are not processed, as it cannot be matched
        }
    }

    // `matchStackTrace()` throws for an invalid regular expression of `stack`, which should not be thrown
    // to the page, e.g. from `JSON.parse()` of `json-prune`, so the value is not processed then
    let isStackMatched = !stack;
    if (stack && isStackTraceRead) {
        try {
            isStackMatched = matchStackTrace(stack, currentStackTrace);
        } catch {
            logMessage(source, `Invalid stack: ${stack}`);
        }
    }
    if (!isStackMatched) {
        return root;
    }

    if (isEmptyPath) {
        logJsonContent(source, root, nativeStringify, currentStackTrace);
        return root;
    }

    /**
     * Checks whether all guards match the root.
     *
     * @param guards guard filters
     * @returns true when each guard matches the root
     */
    function areGuardsMatched(guards: JsonPathFilter[]): boolean {
        for (let i = 0; i < guards.length; i += 1) {
            const guardMatches = evaluateSelector(root, {
                steps: [{ filter: guards[i], mode: 'filter', recursive: false }],
            });
            if (guardMatches.length === 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calls the method of a `call([...])` payload for each matched node, as uBO does:
     * - from the last matched node to the first one;
     * - for a node matched more than once, e.g. by `['a','a']`, as many times;
     * - for the root, e.g. by `$=call(...)`, with an object which holds the root as `$`, which is its key,
     *   so `${val}` is the root, and the root is replaced if the method changes it in that object.
     * An error of the method is logged, and the method is still called for the other nodes.
     *
     * @param currentRoot current root value
     * @param matches matched nodes
     * @param invoke function which calls the method for a node
     * @returns root, which the method may have replaced
     */
    function invokeMatches(
        currentRoot: any,
        matches: JsonPathCandidate[],
        invoke: (parent: any, key: number | string) => boolean,
    ): any {
        const rootHolder: Record<string, any> = { [ROOT_PATH]: currentRoot };
        for (let i = matches.length - 1; i >= 0; i -= 1) {
            const match = matches[i];
            const isRoot = match.parentCandidate === null;
            if (!isRoot && (match.parent === null || match.key === null)) {
                continue;
            }

            try {
                const isCalled = isRoot
                    ? invoke(rootHolder, ROOT_PATH)
                    : invoke(match.parent, match.key as number | string);
                if (isCalled) {
                    markMutated();
                }
            } catch (error) {
                const message = `JSONPath call failed for ${getCandidatePath(match)}: ${getThrownValueMessage(error)}`;
                logMessage(source, message);
            }
        }

        // As in uBO, the root is `null` if the method has removed it
        const nextRoot = rootHolder[ROOT_PATH];
        return nextRoot === undefined ? null : nextRoot;
    }

    try {
        // Several queries separated by spaces are parsed first, so none of them is applied if one is invalid,
        // and then applied in order, each to the result of the previous ones.
        // Queries which are passed as an array, e.g. by a scriptlet, which gets them once, are not split again
        const queries = isPathString ? getJsonPathQueries(source, path) : path;
        const commands: JsonPathCommand[] = [];
        for (let i = 0; i < queries.length; i += 1) {
            // A query is parsed once for a rule with a cache, so an invalid one is rejected once, while its value,
            // whose building may fail for another reason, e.g. `Date` of the page which throws for `$now$`,
            // is built for each processed value until it succeeds, so none of the queries is applied if it fails,
            // and then only for a processed value which the query matches
            const queryText = queries[i];
            let query = cache ? cache[queryText] : undefined;
            if (query === null) {
                logMessage(source, `JSONPath processing failed for expression '${queryText}': it is invalid`);
                return root;
            }
            if (!query) {
                try {
                    query = parseJsonPathQuery(queryText, nativeParse);
                } catch (error) {
                    if (cache) {
                        cache[queryText] = null;
                    }
                    throw error;
                }
                if (cache) {
                    cache[queryText] = query;
                }
            }
            // A query which sets a value rejects all queries of a scriptlet which may not set values,
            // e.g. `$.keep $.ads=1` of `json-prune`, as an invalid query does, before any of them is applied,
            // and its value is not built, e.g. `$.ads=replace:/a/b/`, while a query which only matches content
            // does not set its value
            if (!matchOnly && !isMutationAllowed(query.mode)) {
                logMessage(source, 'JSONPath set and append operations are allowed only in trusted scriptlets');
                return root;
            }
            let mutation: JsonPathMutation | null = null;
            if (!query.isValueChecked && isMutationAllowed(query.mode)) {
                mutation = buildJsonPathMutation(query, nativeParse, parseArgumentValue);
            }
            commands.push({ mutation, query });
        }

        for (let i = 0; i < commands.length; i += 1) {
            commands[i].query.isValueChecked = true;
        }

        for (let i = 0; i < commands.length; i += 1) {
            const command = commands[i];
            // e.g. `call([...])` of a previous query has removed the root
            if (!isObjectLike(root)) {
                break;
            }

            // An error of a query, e.g. of a getter of the page, is logged, and the other queries are applied,
            // as separate rules would be, while an invalid query rejects all of them before, when they are parsed
            const { query } = command;
            try {
                shouldFilterChildren = query.isV2;
                shouldKeepDuplicateKeys = query.isCall;
                shouldTraverseDepthFirst = query.isCall;
                // The root may have been changed by the previous command, see `rootSelections`
                rootSelections = null;
                rootOnlyFilterResults = null;
                rootValueSets = null;

                // Each precondition, e.g. `..ads{1,};$`, has to match a number of nodes in its range
                let arePreconditionsMatched = true;
                for (let j = 0; j < query.preconditions.length; j += 1) {
                    const precondition = query.preconditions[j];
                    const count = areGuardsMatched(precondition.guards)
                        ? evaluateSelector(root, precondition.selector).length
                        : 0;
                    if (count < precondition.min || count > precondition.max) {
                        arePreconditionsMatched = false;
                        break;
                    }
                }

                if (!arePreconditionsMatched || !areGuardsMatched(query.guards)) {
                    continue;
                }

                const matches = evaluateSelector(root, query.selector, matchOnly);
                if (matchOnly) {
                    // Content matches if any of the queries matches it
                    if (matches.length > 0) {
                        if (onMutation) {
                            onMutation();
                        }
                        return root;
                    }
                    continue;
                }

                if (query.mode === 'remove') {
                    removeMatches(matches);
                } else if (matches.length > 0) {
                    const mutation = command.mutation || buildJsonPathMutation(query, nativeParse, parseArgumentValue);
                    if (mutation.invoke) {
                        root = invokeMatches(root, matches, mutation.invoke);
                    } else if (mutation.updater) {
                        root = updateMatches(root, matches, mutation.updater, query.mode === 'merge');
                    }
                }
            } catch (error) {
                const errorMessage = getThrownValueMessage(error);
                logMessage(source, `JSONPath processing failed for expression '${queries[i]}': ${errorMessage}`);
            }
        }
    } catch (error) {
        const expression = isPathString ? path : path.join(' ');
        const message = `JSONPath processing failed for expression '${expression}': ${getThrownValueMessage(error)}`;
        logMessage(source, message);
    }

    // Called once, also if several queries have changed the content, or one of them has failed after others.
    // Its error, e.g. of `hit()` of the page, is logged, as the content is modified anyway
    if (didMutate && onMutation && !matchOnly) {
        try {
            onMutation();
        } catch (error) {
            logMessage(source, `JSONPath mutation callback failed: ${getThrownValueMessage(error)}`);
        }
    }

    return root;
};

/**
 * Checks whether a JSON value matches a JSONPath selector without mutating it.
 *
 * Supports the same selector syntax and leading guards as `jsonPath`, but only
 * reports whether the selector matched at least one candidate.
 *
 * @param source source descriptor used for logging and parsing
 * @param root JSON object or array to inspect
 * @param path JSONPath expression used for matching
 * @param nativeObjects optional bag of native object references
 * @param stack optional stack trace pattern that must match for processing to occur
 * @returns true when the expression matches the input value
 */
export const matchesJsonPath = (
    source: Source,
    root: Record<string, any>,
    path: string,
    nativeObjects: JsonPathNativeObjects,
    stack = '',
): boolean => {
    if (!path) {
        return true;
    }

    let didMatch = false;

    jsonPath(
        source,
        root,
        path,
        nativeObjects,
        () => {
            didMatch = true;
        },
        stack,
        true,
    );

    return didMatch;
};

/**
 * Checks whether all queries of a rule are valid, and parses the ones which are not in its cache yet,
 * so that a scriptlet which reads a response, e.g. of `fetch()`, does not read it for a rule which is not applied,
 * e.g. a uBO rule with a value which is not JSON, e.g. `.status=hidden`, or an invalid payload, e.g.
 * `.title=repl({"pattern":"ads",})`, so e.g. a streaming response is not held until its end.
 * It is called once the response has arrived, e.g. when `fetch()` is fulfilled, as the queries were parsed before,
 * neither when the rule runs nor in the call of the page, e.g. of `fetch()`: parsing calls `RegExp.prototype.test`,
 * which another rule may make an accessor which throws in an inline script, e.g. `abort-current-inline-script`,
 * so a valid query would be rejected for good, and its regular expressions change `RegExp.$1` of the page, which
 * may read it after its call. Its error is logged once, when it is parsed. Queries are not applied to any value
 * of the page, and are not parsed again for the processed values.
 *
 * @param source scriptlet properties
 * @param queries queries of the rule, see `getJsonPathQueries()` and `buildJsonPathQueries()`
 * @param nativeObjects bag of native object references
 * @param cache cache of the rule, see `JsonPathCache`
 * @returns true if all queries are valid
 */
export const areJsonPathQueriesValid = (
    source: Source,
    queries: string[],
    nativeObjects: JsonPathNativeObjects,
    cache: JsonPathCache,
): boolean => {
    let isParsed = true;
    for (let i = 0; i < queries.length; i += 1) {
        const query = cache[queries[i]];
        if (query === null) {
            return false;
        }
        if (query === undefined) {
            isParsed = false;
        }
    }
    if (isParsed) {
        return true;
    }

    jsonPath(source, {}, queries, nativeObjects, undefined, '', true, cache);
    for (let i = 0; i < queries.length; i += 1) {
        if (cache[queries[i]] === null) {
            return false;
        }
    }
    return true;
};
