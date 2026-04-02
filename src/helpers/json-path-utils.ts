import { getJsonSetValue, parseJsonSetArgumentValue } from './json-set-utils';
import { logMessage } from './log-message';
import { matchStackTrace } from './match-stack';
import { toRegExp } from './string-utils';
import { type Source } from '../scriptlets';

type JsonPathMutationMode = 'append' | 'remove' | 'set';
type JsonPathFilterOperator =
    | 'contains'
    | 'equal'
    | 'exists'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'
    | 'not_equal'
    | 'regex';
type JsonPathSyntaxMode = 'jsonpath' | 'legacy';

type JsonPathSelector = {
    steps: JsonPathStep[];
};

type JsonPathCommand = {
    guards: JsonPathFilter[];
    mutation: JsonPathMutation;
    selector: JsonPathSelector;
};

type JsonPathMutation = {
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

type JsonPathComparisonFilter = {
    comparisonSelectorPath?: string;
    comparisonValue?: any;
    operator: JsonPathFilterOperator;
    resolveComparisonAgainstRoot?: boolean;
    selectorPath: string;
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
    path: string;
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

    const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
    if (normalizedMode === LEGACY_MODE || normalizedMode === JSONPATH_MODE) {
        return {
            mode: normalizedMode as JsonPathSyntaxMode,
        };
    }

    const normalizedExpression = typeof expression === 'string' ? expression.trim() : '';
    if (normalizedExpression.startsWith(JSONPATH_ROOT_GUARD) || normalizedExpression.startsWith(JSONPATH_GUARD)) {
        return {
            mode: JSONPATH_MODE,
        };
    }

    return {
        mode: LEGACY_MODE,
    };
}

/**
 * Builds a set-style JSONPath expression from a selector and mutation value.
 * Preserves the selector as-is when it already includes an inline mutation suffix.
 * When `argumentValue` is `$remove$`, preserves the selector so the downstream
 * JSONPath parser treats it as a remove command.
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
 * Removes, sets, or appends values selected by a JSONPath-like expression.
 *
 * Supported behavior is intentionally scoped to mutation use cases: path
 * traversal, recursive descent, unions, slices, filters, guards, and
 * equal or plus-equal mutation suffixes.
 *
 * @param source source descriptor used for logging and parsing
 * @param root JSON object or array to mutate
 * @param path JSONPath expression with optional mutation suffix; empty path logs the payload
 * @param nativeObjects optional bag of native object references
 * @param onMutation optional callback fired once if any mutation happens
 * @param stack optional stack trace pattern that must match for processing to occur
 * @returns mutated root value
 */
export const jsonPath = (
    source: Source,
    root: Record<string, any>,
    path: string,
    nativeObjects: JsonPathNativeObjects,
    onMutation?: JsonPathMutationObserver,
    stack = '',
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
    const FILTER_OPERATORS = {
        CONTAINS: 'contains',
        EQUAL: 'equal',
        EXISTS: 'exists',
        GREATER_THAN: 'greater_than',
        GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
        LESS_THAN: 'less_than',
        LESS_THAN_OR_EQUAL: 'less_than_or_equal',
        NOT_EQUAL: 'not_equal',
        REGEX: 'regex',
    } as const;
    const OPERATORS = ['==', '!=', '<=', '>=', '*=', '=~', '<', '>', '='];
    // Required for appendPath(): simple property names can be emitted as `.prop`,
    // but keys with spaces, punctuation, or leading digits must use bracket
    // notation so generated paths stay valid and reparsable JSONPath selectors.
    // Examples: `price` -> `$.price`, `_meta` -> `$._meta`,
    // `ad slot` -> `$['ad slot']`, `123name` -> `$['123name']`,
    // `foo-bar` -> `$['foo-bar']`.
    const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

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
     * @param candidatePath normalized resolved path
     * @returns candidate record
     */
    function createCandidate(
        value: any,
        parent: any,
        key: number | string | null,
        candidatePath: string,
    ): JsonPathCandidate {
        return {
            key,
            parent,
            path: candidatePath,
            value,
        };
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
                if (value.startsWith(operator, index)) {
                    if (matchedOperator === null || operator.length > matchedOperator.length) {
                        matchedOperator = operator;
                    }
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
                if (innerQuote) {
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

        const operatorMatch = findTopLevelOperator(expression);
        if (!operatorMatch) {
            return {
                operator: FILTER_OPERATORS.EXISTS,
                selectorPath: normalizeFilterPath(expression),
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
        } else if (operatorMatch.operator === '=~') {
            operator = FILTER_OPERATORS.REGEX;
        } else if (operatorMatch.operator === EQUAL && /^\/.*\/[a-z]*$/i.test(rightPart)) {
            operator = FILTER_OPERATORS.REGEX;
        }

        const rightTrimmed = rightPart.trim();
        const isRightRootPath = rightTrimmed === ROOT_PATH
            || rightTrimmed.startsWith(ROOT_PATH + DOT)
            || rightTrimmed.startsWith(ROOT_PATH + SQUARE_BRACKET_OPEN);
        const isRightCurrentPath = rightTrimmed === AT_SIGN
            || rightTrimmed.startsWith(AT_SIGN + DOT)
            || rightTrimmed.startsWith(AT_SIGN + SQUARE_BRACKET_OPEN);

        if (isRightRootPath || isRightCurrentPath) {
            return {
                comparisonSelectorPath: normalizeFilterPath(rightTrimmed),
                operator,
                resolveComparisonAgainstRoot: isRightRootPath,
                selectorPath: normalizeFilterPath(leftPart),
            };
        }

        return {
            comparisonValue: parseLiteralValue(rightPart),
            operator,
            selectorPath: normalizeFilterPath(leftPart),
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
            if (expression.startsWith(PLUS_EQUAL, index)) {
                foundIndex = index;
                foundMode = 'append';
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
     * Builds the updater used for append mutations.
     *
     * @param rawValue append payload text
     * @param nativeParse parse function to use
     * @param parseArgumentValue parsed trusted-json-set value resolver
     * @returns updater function for matched nodes
     */
    function buildAppendUpdater(
        rawValue: string,
        nativeParse: typeof JSON.parse,
        parseArgumentValue: JsonPathArgumentValueParser,
    ): (currentValue: any) => any {
        const trimmedValue = rawValue.trim();
        let appendValue: any;

        if (trimmedValue.startsWith(CURLY_BRACKET_OPEN) || trimmedValue.startsWith(SQUARE_BRACKET_OPEN)) {
            appendValue = nativeParse(trimmedValue);
        } else {
            const parsedValue = parseArgumentValue(trimmedValue);
            if (!parsedValue || parsedValue.shouldReplaceArgument) {
                throw new Error(`Invalid append value: ${rawValue}`);
            }
            appendValue = parsedValue.constantValue;
        }

        return (currentValue: any) => {
            if (Array.isArray(currentValue)) {
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

        return (currentValue: any) => {
            if (typeof currentValue !== 'string') {
                return currentValue;
            }

            return currentValue.replace(regex, replaceConfig.replacement);
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

        const parsedValue = parseArgumentValue(trimmedValue);
        if (!parsedValue) {
            throw new Error(`Invalid set value: ${rawValue}`);
        }

        return (currentValue: any) => getJsonSetValue(currentValue, parsedValue);
    }

    /**
     * Parses the full JSONPath command.
     *
     * @param expression full JSONPath command
     * @param nativeParse parse function to use
     * @param parseArgumentValue parsed trusted-json-set value resolver
     * @returns parsed command descriptor
     */
    function parseJsonPathCommand(
        expression: string,
        nativeParse: typeof JSON.parse,
        parseArgumentValue: JsonPathArgumentValueParser,
    ): JsonPathCommand {
        const mutationParts = splitMutationExpression(expression);
        const guardParts = extractGuards(mutationParts.selectorPart);
        const selector = parseJsonPathSelector(normalizeSelectorPart(guardParts.selectorPart));
        let mutation: JsonPathMutation = {
            mode: mutationParts.mode,
        };

        if (mutationParts.mode === 'append') {
            mutation = {
                mode: 'append',
                updater: buildAppendUpdater(mutationParts.valuePart, nativeParse, parseArgumentValue),
            };
        } else if (mutationParts.mode === 'set') {
            mutation = {
                mode: 'set',
                updater: buildSetUpdater(mutationParts.valuePart, nativeParse, parseArgumentValue),
            };
        }

        return {
            guards: guardParts.guards,
            mutation,
            selector,
        };
    }

    /**
     * Returns direct children of a candidate.
     *
     * @param candidate parent candidate
     * @returns child candidates
     */
    function getChildCandidates(candidate: JsonPathCandidate): JsonPathCandidate[] {
        if (!isObjectLike(candidate.value)) {
            return [];
        }

        const keys = Object.keys(candidate.value);
        const output: JsonPathCandidate[] = [];

        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            output.push(createCandidate(candidate.value[key], candidate.value, key, appendPath(candidate.path, key)));
        }

        return output;
    }

    /**
     * Returns a candidate plus all of its descendants.
     *
     * @param candidate root candidate for recursive descent
     * @returns recursive candidate list
     */
    function getRecursiveCandidates(candidate: JsonPathCandidate): JsonPathCandidate[] {
        const output: JsonPathCandidate[] = [candidate];
        const initialChildren = getChildCandidates(candidate);
        for (let i = 0; i < initialChildren.length; i += 1) {
            output.push(initialChildren[i]);
        }

        let head = 1;
        while (head < output.length) {
            const childCandidates = getChildCandidates(output[head]);
            for (let i = 0; i < childCandidates.length; i += 1) {
                output.push(childCandidates[i]);
            }
            head += 1;
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
                        if (!property.test(key) || seenKeys.has(key)) {
                            continue;
                        }

                        seenKeys.add(key);
                        output.push(createCandidate(
                            candidate.value[key],
                            candidate.value,
                            key,
                            appendPath(candidate.path, key),
                        ));
                    }

                    continue;
                }

                if (seenKeys.has(property) || !Object.prototype.hasOwnProperty.call(candidate.value, property)) {
                    continue;
                }

                seenKeys.add(property);
                output.push(createCandidate(
                    candidate.value[property],
                    candidate.value,
                    property,
                    appendPath(candidate.path, property),
                ));
            }

            return output;
        }

        if (step.mode === 'wildcard') {
            return getChildCandidates(candidate);
        }

        if (step.mode === 'index') {
            if (!Array.isArray(candidate.value) || !step.indexes) {
                return output;
            }

            for (let i = 0; i < step.indexes.length; i += 1) {
                const resolvedIndex = resolveIndex(candidate.value.length, step.indexes[i]);
                if (resolvedIndex >= 0 && resolvedIndex < candidate.value.length) {
                    output.push(createCandidate(
                        candidate.value[resolvedIndex],
                        candidate.value,
                        resolvedIndex,
                        appendPath(candidate.path, resolvedIndex),
                    ));
                }
            }
            return output;
        }

        if (step.mode === 'computed-index') {
            if (!Array.isArray(candidate.value)) {
                return output;
            }

            const index = candidate.value.length - (step.subtractLength || 0);
            if (index >= 0 && index < candidate.value.length) {
                output.push(createCandidate(
                    candidate.value[index],
                    candidate.value,
                    index,
                    appendPath(candidate.path, index),
                ));
            }
            return output;
        }

        if (step.mode === 'slice') {
            if (!Array.isArray(candidate.value) || !step.slice) {
                return output;
            }

            const sliceIndexes = getSliceIndexes(candidate.value.length, step.slice);
            for (let i = 0; i < sliceIndexes.length; i += 1) {
                const index = sliceIndexes[i];
                output.push(createCandidate(
                    candidate.value[index],
                    candidate.value,
                    index,
                    appendPath(candidate.path, index),
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
    function evaluateSelector(selectorRoot: any, selector: JsonPathSelector): JsonPathCandidate[] {
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
                return !matchesFilterValue(value, filter.condition);
            }

            const matchedCandidates = evaluateSelector(value, parseJsonPathSelector(filter.selectorPath));
            if (filter.operator === FILTER_OPERATORS.EXISTS) {
                return matchedCandidates.length > 0;
            }

            let comparisonValue = filter.comparisonValue;
            if (filter.comparisonSelectorPath) {
                const comparisonRoot = filter.resolveComparisonAgainstRoot ? root : value;
                const comparisonMatches = evaluateSelector(
                    comparisonRoot,
                    parseJsonPathSelector(filter.comparisonSelectorPath),
                );
                if (comparisonMatches.length === 0) {
                    return false;
                }
                comparisonValue = comparisonMatches[0].value;
            }

            for (let i = 0; i < matchedCandidates.length; i += 1) {
                const matchedValue = matchedCandidates[i].value;
                if (filter.operator === FILTER_OPERATORS.CONTAINS) {
                    if (typeof matchedValue === 'string' && matchedValue.includes(String(comparisonValue))) {
                        return true;
                    }
                    continue;
                }

                if (filter.operator === FILTER_OPERATORS.REGEX) {
                    if (typeof matchedValue === 'string' && comparisonValue instanceof RegExp) {
                        comparisonValue.lastIndex = 0;
                        if (comparisonValue.test(matchedValue)) {
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
         * Applies a filter step to the current candidate list.
         *
         * @param candidates current traversal candidates
         * @param filter parsed filter descriptor
         * @returns candidates that satisfy the filter
         */
        function applyFilterStep(candidates: JsonPathCandidate[], filter: JsonPathFilter): JsonPathCandidate[] {
            const output: JsonPathCandidate[] = [];

            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = candidates[i];
                if (Array.isArray(candidate.value)) {
                    for (let j = 0; j < candidate.value.length; j += 1) {
                        if (matchesFilterValue(candidate.value[j], filter)) {
                            output.push(createCandidate(
                                candidate.value[j],
                                candidate.value,
                                j,
                                appendPath(candidate.path, j),
                            ));
                        }
                    }
                    continue;
                }

                if (matchesFilterValue(candidate.value, filter)) {
                    output.push(candidate);
                }
            }

            return output;
        }

        let candidates: JsonPathCandidate[] = [createCandidate(selectorRoot, null, null, ROOT_PATH)];

        for (let i = 0; i < selector.steps.length; i += 1) {
            const step = selector.steps[i];
            if (step.mode === 'filter' && step.filter) {
                candidates = applyFilterStep(candidates, step.filter);
                continue;
            }

            const nextCandidates: JsonPathCandidate[] = [];
            for (let j = 0; j < candidates.length; j += 1) {
                const currentCandidate = candidates[j];
                const candidatesToCheck = step.recursive
                    ? getRecursiveCandidates(currentCandidate)
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
     * Checks whether the current source may perform value mutations.
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
            && source.name.startsWith(TRUSTED_SCRIPTLET_PREFIX);
    }

    /**
     * Removes all matched properties or array entries.
     *
     * @param matches mutable matches to delete
     */
    function removeMatches(matches: JsonPathCandidate[]): void {
        const seenPaths = new Set<string>();
        const arrayGroups = new Map<any, number[]>();

        for (let i = 0; i < matches.length; i += 1) {
            const match = matches[i];
            if (match.parent === null || match.key === null || seenPaths.has(match.path)) {
                continue;
            }

            seenPaths.add(match.path);

            if (Array.isArray(match.parent)) {
                const currentIndexes = arrayGroups.get(match.parent) || [];
                currentIndexes.push(Number(match.key));
                arrayGroups.set(match.parent, currentIndexes);
                continue;
            }

            delete match.parent[match.key];
            markMutated();
        }

        arrayGroups.forEach((indexes, arrayValue) => {
            const uniqueIndexes = Array.from(new Set(indexes)).sort((left, right) => right - left);
            for (let i = 0; i < uniqueIndexes.length; i += 1) {
                const index = uniqueIndexes[i];
                if (index >= 0 && index < arrayValue.length) {
                    arrayValue.splice(index, 1);
                    markMutated();
                }
            }
        });
    }

    /**
     * Updates all matched properties or array entries.
     *
     * @param currentRoot current root value
     * @param matches mutable matches to update
     * @param updater value transformer to apply
     */
    function updateMatches(currentRoot: any, matches: JsonPathCandidate[], updater: (currentValue: any) => any): any {
        const seenPaths = new Set<string>();
        let nextRoot = currentRoot;

        for (let i = 0; i < matches.length; i += 1) {
            const match = matches[i];
            if (seenPaths.has(match.path)) {
                continue;
            }

            seenPaths.add(match.path);

            if (match.parent === null && match.key === null && match.path === ROOT_PATH) {
                nextRoot = updater(nextRoot);
                markMutated();
                continue;
            }

            if (match.parent === null || match.key === null) {
                continue;
            }

            match.parent[match.key] = updater(match.parent[match.key]);
            markMutated();
        }

        return nextRoot;
    }

    if (!isObjectLike(root)) {
        return root;
    }

    const nativeParse = resolveNativeParse(nativeObjects);
    const nativeStringify = resolveNativeStringify(nativeObjects);
    const currentStackTrace = new Error().stack || '';
    const parseArgumentValue = (argumentValue: string) => parseJsonSetArgumentValue(source, argumentValue, nativeParse);

    if (stack && !matchStackTrace(stack, currentStackTrace)) {
        return root;
    }

    if (!path) {
        logMessage(
            source,
            `${window.location.hostname}\n${nativeStringify(root, null, 2)}\nStack trace:\n${currentStackTrace}`,
            true,
        );
        logMessage(source, root, true, false);
        return root;
    }

    try {
        const command = parseJsonPathCommand(path, nativeParse, parseArgumentValue);

        for (let i = 0; i < command.guards.length; i += 1) {
            const guardMatches = evaluateSelector(root, {
                steps: [{ filter: command.guards[i], mode: 'filter', recursive: false }],
            });
            if (guardMatches.length === 0) {
                return root;
            }
        }

        if (!isMutationAllowed(command.mutation.mode)) {
            logMessage(source, 'JSONPath set and append operations are allowed only in trusted scriptlets');
            return root;
        }

        const matches = evaluateSelector(root, command.selector);
        if (command.mutation.mode === 'remove') {
            removeMatches(matches);
            if (didMutate && onMutation) {
                onMutation();
            }
            return root;
        }

        if (command.mutation.updater) {
            root = updateMatches(root, matches, command.mutation.updater);
            if (didMutate && onMutation) {
                onMutation();
            }
        }
    } catch (error) {
        logMessage(source, `JSONPath processing failed for expression '${path}': ${(error as Error).message}`);
    }

    return root;
};
