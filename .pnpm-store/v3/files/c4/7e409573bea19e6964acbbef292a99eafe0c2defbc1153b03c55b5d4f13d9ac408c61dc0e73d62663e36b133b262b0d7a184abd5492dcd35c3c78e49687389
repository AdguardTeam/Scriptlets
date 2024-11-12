/*
 * CSSTokenizer v1.1.1 (build date: Thu, 19 Sep 2024 13:23:31 GMT)
 * (c) 2024 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/css-tokenizer#readme
 */
/**
 * @file Possible CSS token types, as defined in the CSS Syntax Module Level 3.
 *
 * ! Strictly follows the spec.
 *
 * @see {@link https://www.w3.org/TR/css-syntax-3/#tokenization}
 */
declare enum TokenType {
    Eof = 0,
    Ident = 1,
    Function = 2,
    AtKeyword = 3,
    Hash = 4,
    String = 5,
    BadString = 6,
    Url = 7,
    BadUrl = 8,
    Delim = 9,
    Number = 10,
    Percentage = 11,
    Dimension = 12,
    Whitespace = 13,
    Cdo = 14,
    Cdc = 15,
    Colon = 16,
    Semicolon = 17,
    Comma = 18,
    OpenSquareBracket = 19,
    CloseSquareBracket = 20,
    OpenParenthesis = 21,
    CloseParenthesis = 22,
    OpenCurlyBracket = 23,
    CloseCurlyBracket = 24,
    Comment = 25
}

/**
 * @file Tokenizer context
 */

/**
 * Context of the tokenizer which is shared between all the functions
 */
declare class TokenizerContext {
    /**
     * Cached source length
     */
    readonly length: number;
    /**
     * Reference to the `onToken` callback function
     */
    readonly onToken: OnTokenCallback;
    /**
     * Reference to the `onError` callback function
     */
    readonly onError: OnErrorCallback;
    /**
     * Unicode code points of the source string
     *
     * @note The last code point is always EOF ("imaginary" code point)
     * @note Using `!` is safe here because the `preprocess` function always sets the codes in the constructor
     * @note We need a signed 32-bit integer array, because the code points are 21-bit integers + imaginary code points
     * are negative numbers
     */
    private codes;
    /**
     * Actual position in the source string
     */
    private cursor;
    /**
     * Custom function handlers to handle special functions, like Extended CSS's pseudo selectors
     */
    private customFunctionHandlers?;
    /**
     * Constructs a new tokenizer context instance
     *
     * @param source Source string
     * @param onToken Callback function to call when a token is found
     * @param onError Callback function to call when a parsing error occurs
     * @param functionHandlers Custom function handlers to handle special functions, like Extended CSS's pseudo
     * selectors
     */
    constructor(source: string, onToken: OnTokenCallback, onError: OnErrorCallback, functionHandlers?: Map<number, TokenizerContextFunction>);
    /**
     * § 3.3. Preprocessing the input stream
     *
     * @param source Source string to preprocess
     * @see {@link https://www.w3.org/TR/css-syntax-3/#input-preprocessing}
     */
    private preprocess;
    /**
     * Gets the corresponding custom function handler for the given function name hash
     *
     * @param hash Function name hash
     * @returns Corresponding custom function handler or `undefined` if not found
     */
    getFunctionHandler(hash: number): TokenizerContextFunction | undefined;
    /**
     * Checks if the custom function handler is registered for the given function name hash
     *
     * @param hash Custom function name hash
     * @returns `true` if the custom function handler is registered, `false` otherwise
     */
    hasFunctionHandler(hash: number): boolean;
    /**
     * Returns the current offset
     *
     * @returns Current offset
     */
    get offset(): number;
    /**
     * Returns the code point at the current offset
     *
     * @returns Code point at the current offset
     */
    get code(): number | undefined;
    /**
     * Returns the code point at the previous offset
     *
     * @returns Code point at the previous offset or `undefined` if the offset is out of bounds
     */
    get prevCode(): number | undefined;
    /**
     * Returns the code point at the next offset
     *
     * @returns Code point at the next offset or `undefined` if the offset is out of bounds
     */
    get nextCode(): number | undefined;
    /**
     * Returns the code point at the given relative offset
     *
     * @param relativeOffset Relative offset
     * @returns Code point at the relative offset or `undefined` if the offset is out of bounds
     * @note Relative offset compared to the current offset. 1 means the next code point, -1 means the previous code
     * point, 2 means the code point after the next code point, etc.
     */
    getRelativeCode(relativeOffset: number): number | undefined;
    /**
     * Check if the current offset is at the end of the source (or past it)
     *
     * @returns `true` if the current offset is at the end of the source, `false` otherwise
     */
    isEof(): boolean;
    /**
     * Check if the next code point is EOF
     *
     * @returns `true` if the next code point is EOF, `false` otherwise
     */
    isNextEof(): boolean;
    /**
     * Check if the current offset is less than or equal to the end of the source
     *
     * @returns `true` if the current offset is less than or equal to the end of the source, `false` otherwise
     */
    isLessThanEqualToEof(): boolean;
    /**
     * Consumes the given number of code points
     *
     * @param n Number of code points to consume (default: 1)
     * @note Negative numbers are allowed (they will move the cursor backwards)
     * @note No protection against out of bounds for performance reasons
     */
    consumeCodePoint(n?: number): void;
    /**
     * Finds the next non-whitespace code point and returns it
     *
     * @returns Next non-whitespace code point or EOF imaginary code point if the rest of the source is whitespace
     */
    getNextNonWsCode(): number;
    /**
     * Consumes the whitespace code points
     */
    consumeWhitespace(): void;
    /**
     * Consumes a single whitespace code point, if the current code point is a whitespace
     */
    consumeSingleWhitespace(): void;
    /**
     * Consumes everything until the end of the comment (or the end of the source)
     */
    consumeUntilCommentEnd(): void;
    /**
     * Consumes a single-character token (trivial token) and reports it via the `onToken` callback
     *
     * @param tokenType Token type to report
     */
    consumeTrivialToken(tokenType: TokenType): void;
    /**
     * Calculates the hash of the fragment from the given start offset to the current offset. This is useful to
     * fast-check function names.
     *
     * @param start Start offset
     * @returns Calculated hash
     */
    getHashFrom(start: number): number;
}

/**
 * @file Type definitions for function prototypes
 */

/**
 * Callback which is called when a token is found
 *
 * @param type Token type
 * @param start Token start offset
 * @param end Token end offset
 * @param props Other token properties (if any)
 * @note Hash tokens have a type flag set to either "id" or "unrestricted". The type flag defaults to "unrestricted" if
 * not otherwise set
 */
type OnTokenCallback = (type: TokenType, start: number, end: number, props?: Record<string, unknown>) => void;
/**
 * Callback which is called when a parsing error is found. According to the spec, parsing errors are not fatal and
 * therefore the tokenizer is quite permissive, but if needed, the error callback can be used.
 *
 * @param message Error message
 * @param start Error start offset
 * @param end Error end offset
 * @see {@link https://www.w3.org/TR/css-syntax-3/#error-handling}
 */
type OnErrorCallback = (message: string, start: number, end: number) => void;
/**
 * Function handler
 *
 * @param context Reference to the tokenizer context instance
 * @param ...args Additional arguments (if any)
 */
type TokenizerContextFunction = (context: TokenizerContext, ...args: any[]) => void;

/**
 * @file CSS token names
 */

/**
 * Get base token name by token type
 *
 * @param type Token type
 *
 * @example
 * ```ts
 * getBaseTokenName(TokenType.Ident); // 'ident'
 * getBaseTokenName(-1); // 'unknown'
 * ```
 *
 * @returns Base token name or 'unknown' if token type is unknown
 */
declare const getBaseTokenName: (type: TokenType) => string;
/**
 * Get formatted token name by token type
 *
 * @param type Token type
 *
 * @example
 * ```ts
 * getFormattedTokenName(TokenType.Ident); // '<ident-token>'
 * getFormattedTokenName(-1); // '<unknown-token>'
 * ```
 *
 * @returns Formatted token name or `'<unknown-token>'` if token type is unknown
 */
declare const getFormattedTokenName: (type: TokenType) => string;

/**
 * @file CSS tokenizer that strictly follows the CSS Syntax Module Level 3 specification
 *
 * @see {@link https://www.w3.org/TR/css-syntax-3/#tokenization}
 */

/**
 * CSS tokenizer function
 *
 * @param source Source code to tokenize
 * @param onToken Tokenizer callback which is called for each token found in source code
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 */
declare const tokenize: (source: string, onToken: OnTokenCallback, onError?: OnErrorCallback, functionHandlers?: Map<number, TokenizerContextFunction>) => void;

/**
 * @file Extended CSS tokenizer that extends the core CSS tokenizer
 *
 * This library supports various Extended CSS language elements from
 * - AdGuard,
 * - uBlock Origin and
 * - Adblock Plus.
 *
 * @see {@link https://github.com/AdguardTeam/ExtendedCss}
 * @see {@link https://github.com/gorhill/uBlock/wiki/Procedural-cosmetic-filters}
 * @see {@link https://help.adblockplus.org/hc/en-us/articles/360062733293#elemhide-emulation}
 */

/**
 * Extended CSS tokenizer function
 *
 * @param source Source code to tokenize
 * @param onToken Tokenizer callback which is called for each token found in source code
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 * @note If you specify custom function handlers, they will be merged with the default function handlers. If you
 * duplicate a function handler, the custom one will be used instead of the default one, so you can override the default
 * function handlers this way, if you want to.
 */
declare function tokenizeExtended(source: string, onToken: OnTokenCallback, onError?: OnErrorCallback, functionHandlers?: Map<number, TokenizerContextFunction>): void;

/**
 * @file CSS identifier decoder.
 */
/**
 * Decodes a CSS identifier according to the CSS Syntax Module Level 3 specification.
 *
 * @param ident CSS identifier to decode.
 *
 * @example
 * ```ts
 * decodeIdent(String.raw`\00075\00072\0006C`); // 'url'
 * decodeIdent('url'); // 'url'
 * ```
 *
 * @returns Decoded CSS identifier.
 */
declare const decodeIdent: (ident: string) => string;

/**
 * @file Package version
 */
declare const CSS_TOKENIZER_VERSION: string;

export { CSS_TOKENIZER_VERSION, type OnErrorCallback, type OnTokenCallback, TokenType, TokenizerContext, type TokenizerContextFunction, decodeIdent, getBaseTokenName, getFormattedTokenName, tokenize, tokenizeExtended };
