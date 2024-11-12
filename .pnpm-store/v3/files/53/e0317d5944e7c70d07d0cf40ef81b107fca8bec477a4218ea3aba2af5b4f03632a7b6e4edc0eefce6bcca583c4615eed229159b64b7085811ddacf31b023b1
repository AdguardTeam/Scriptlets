/*
 * CSSTokenizer v1.1.1 (build date: Thu, 19 Sep 2024 13:23:31 GMT)
 * (c) 2024 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/css-tokenizer#readme
 */
'use strict';

/**
 * @file Implementation of CSS Syntax Module Level 3 tokenizer definitions (§ 4.2.)
 *
 * @see {@link https://www.w3.org/TR/css-syntax-3/#tokenizer-definitions}
 */
/**
 * Check if code point code is between two code points
 *
 * @param code Code point to check
 * @param min Minimum code point
 * @param max Maximum code point
 * @returns `true` if code point is between `min` and `max`, `false` otherwise
 * @note Boundaries are inclusive
 * @note This function is used instead of `code >= min && code <= max` because TypeScript doesn't allow to compare
 * `number | undefined` with `number` (even though it's perfectly valid in JavaScript)
 */
function isBetween(code, min, max) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 18048
    return code >= min && code <= max;
}
/**
 * Check if code point code is greater than other code point
 *
 * @param code Code point to check
 * @param min Minimum code point
 * @returns `true` if code point is greater than `min`, `false` otherwise
 * @note This function is used instead of `code > min` because TypeScript doesn't allow to compare
 * `number | undefined` with `number` (even though it's perfectly valid in JavaScript)
 */
function isGreaterThan(code, min) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 18048
    return code > min;
}
/**
 * Check if code point code is greater than or equal to other code point
 *
 * @param code Code point to check
 * @param min Minimum code point
 * @returns `true` if code point is greater than or equal to `min`, `false` otherwise
 * @note This function is used instead of `code >= min` because TypeScript doesn't allow to compare
 * `number | undefined` with `number` (even though it's perfectly valid in JavaScript)
 */
function isGreaterThanOrEqual(code, min) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore 18048
    return code >= min;
}
/**
 * Check if character code is a digit
 *
 * @param code Character code
 * @returns `true` if character code is a digit, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#digit}
 */
function isDigit(code) {
    // A code point between U+0030 DIGIT ZERO (0) and U+0039 DIGIT NINE (9) inclusive.
    return isBetween(code, 48 /* CodePoint.DigitZero */, 57 /* CodePoint.DigitNine */);
}
/**
 * Check if character code is a hex digit
 *
 * @param code Character code
 * @returns `true` if character code is a hex digit, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#hex-digit}
 */
function isHexDigit(code) {
    // A digit, or a code point between U+0041 LATIN CAPITAL LETTER A (A) and U+0046 LATIN CAPITAL LETTER F (F)
    // inclusive, or a code point between U+0061 LATIN SMALL LETTER A (a) and U+0066 LATIN SMALL LETTER F (f) inclusive.
    return isDigit(code) // 0-9
        || isBetween(code, 65 /* CodePoint.LatinCapitalLetterA */, 70 /* CodePoint.LatinCapitalLetterF */) // A-F
        || isBetween(code, 97 /* CodePoint.LatinSmallLetterA */, 102 /* CodePoint.LatinSmallLetterF */); // a-f
}
/**
 * Check if character code is an uppercase letter
 *
 * @param code Character code
 * @returns `true` if character code is an uppercase letter, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#uppercase-letter}
 */
function isUppercaseLetter(code) {
    // A code point between U+0041 LATIN CAPITAL LETTER A (A) and U+005A LATIN CAPITAL LETTER Z (Z) inclusive.
    return isBetween(code, 65 /* CodePoint.LatinCapitalLetterA */, 90 /* CodePoint.LatinCapitalLetterZ */); // A-Z
}
/**
 * Check if character code is a lowercase letter
 *
 * @param code Character code
 * @returns `true` if character code is a lowercase letter, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#lowercase-letter}
 */
function isLowercaseLetter(code) {
    // A code point between U+0061 LATIN SMALL LETTER A (a) and U+007A LATIN SMALL LETTER Z (z) inclusive.
    return isBetween(code, 97 /* CodePoint.LatinSmallLetterA */, 122 /* CodePoint.LatinSmallLetterZ */); // a-z
}
/**
 * Check if character code is a letter
 *
 * @param code Character code
 * @returns `true` if character code is a letter, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#letter}
 */
function isLetter(code) {
    // An uppercase letter or a lowercase letter.
    return isUppercaseLetter(code) || isLowercaseLetter(code); // A-Z or a-z
}
/**
 * Check if character code is a non-ASCII code point
 *
 * @param code Character code
 * @returns `true` if character code is a non-ASCII code point, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#non-ascii-code-point}
 */
function isNonAsciiCodePoint(code) {
    // A code point with a value equal to or greater than U+0080 <control>.
    return isGreaterThanOrEqual(code, 128 /* CodePoint.ControlCharacterStart */);
}
/**
 * Check if character code is a name code point
 *
 * @param code Character code
 * @returns `true` if character code is a name start code point, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#ident-start-code-point}
 */
function isIdentStartCodePoint(code) {
    // A letter, a non-ASCII code point, or U+005F LOW LINE (_).
    return isLetter(code) || isNonAsciiCodePoint(code) || code === 95 /* CodePoint.LowLine */;
}
/**
 * Check if character code is a name code point
 *
 * @param code Character code
 * @returns `true` if character code is a name code point, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#ident-code-point}
 */
function isIdentCodePoint(code) {
    // An ident-start code point, a digit, or U+002D HYPHEN-MINUS (-).
    return isIdentStartCodePoint(code) || isDigit(code) || code === 45 /* CodePoint.HyphenMinus */;
}
/**
 * Check if character code is a non-printable code point
 *
 * @param code Character code
 * @returns `true` if character code is a non-printable code point, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#non-printable-code-point}
 */
function isNonPrintableCodePoint(code) {
    // A code point between U+0000 NULL and U+0008 BACKSPACE inclusive, or U+000B LINE TABULATION, or a code point
    // between U+000E SHIFT OUT and U+001F INFORMATION SEPARATOR ONE inclusive, or U+007F DELETE.
    return isBetween(code, 0 /* CodePoint.Null */, 8 /* CodePoint.Backspace */)
        || code === 11 /* CodePoint.LineTabulation */
        || isBetween(code, 14 /* CodePoint.ShiftOut */, 31 /* CodePoint.InformationSeparatorOne */)
        || code === 127 /* CodePoint.Delete */;
}
/**
 * Check if character code is a newline
 *
 * @param code Character code
 * @returns `true` if character code is a newline, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#newline}
 */
function isNewline(code) {
    // U+000A LINE FEED. Note that U+000D CARRIAGE RETURN and U+000C FORM FEED are not included in this definition, as
    // they are converted to U+000A LINE FEED during preprocessing.
    return code === 10 /* CodePoint.LineFeed */ || code === 13 /* CodePoint.CarriageReturn */ || code === 12 /* CodePoint.FormFeed */;
}
/**
 * Check if character code is a whitespace
 *
 * @param code Character code
 * @returns `true` if character code is a whitespace, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#whitespace}
 */
function isWhitespace(code) {
    // A newline, U+0009 CHARACTER TABULATION, or U+0020 SPACE.
    return isNewline(code) || code === 9 /* CodePoint.CharacterTabulation */ || code === 32 /* CodePoint.Space */;
}
/**
 * Check if character code is a leading surrogate
 *
 * @param code Character code
 * @returns `true` if character code is a leading surrogate, `false` otherwise
 * @see {@link https://infra.spec.whatwg.org/#surrogate}
 */
function isLeadingSurrogate(code) {
    return isBetween(code, 55296 /* CodePoint.LeadingSurrogateStart */, 56319 /* CodePoint.LeadingSurrogateEnd */);
}
/**
 * Check if character code is a trailing surrogate
 *
 * @param code Character code
 * @returns `true` if character code is a trailing surrogate, `false` otherwise
 * @see {@link https://infra.spec.whatwg.org/#surrogate}
 */
function isTrailingSurrogate(code) {
    return isBetween(code, 56320 /* CodePoint.TrailingSurrogateStart */, 57343 /* CodePoint.TrailingSurrogateEnd */);
}
/**
 * Check if character code is a surrogate
 *
 * @param code Character code
 * @returns `true` if character code is a surrogate, `false` otherwise
 * @see {@link https://infra.spec.whatwg.org/#surrogate}
 */
function isSurrogate(code) {
    return isLeadingSurrogate(code) || isTrailingSurrogate(code);
}
/**
 * Check if character code is greater than maximum allowed code point
 *
 * @param code Character code
 * @returns `true` if character code is greater than maximum allowed code point, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#maximum-allowed-code-point}
 */
function isGreaterThanMaxAllowedCodePoint(code) {
    return isGreaterThan(code, 1114111 /* CodePoint.MaxCodePoint */);
}
// TODO: Uncomment when needed, maybe useful in the future
// /**
//  * Check if character code is a valid identifier sequence code point
//  *
//  * @param code Character code
//  * @returns `true` if character code is a valid identifier sequence code point, `false` otherwise
//  * @see {@link https://www.w3.org/TR/css-syntax-3/#ident-sequence}
//  * @note The part of an <at-keyword-token> after the "@", the part of a <hash-token> (with the "id" type flag) after
//  * the "#", the part of a <function-token> before the "(", and the unit of a <dimension-token> are all ident
//  * sequences.
//  */
// export function isIdentSequence(code: number): boolean {
//     // A sequence of code points that has the same syntax as an <ident-token>.
// eslint-disable-next-line max-len
//     return isIdentStartCodePoint(code) || isDigit(code) || code === CodePoint.HyphenMinus || code === CodePoint.LowLine;
// }
/**
 * Check if character code is a BOM (Byte Order Mark)
 *
 * @param code Character code to check
 * @returns `true` if character code is a BOM, `false` otherwise
 */
function isBOM(code) {
    return code === 65279 /* CodePoint.Utf16BeBom */ || code === 65534 /* CodePoint.Utf16LeBom */;
}
/**
 * § 4.3.8. Check if two code points are a valid escape
 *
 * @param a First code point
 * @param b Second code point
 * @returns `true` if the code points are a valid escape, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#starts-with-a-valid-escape}
 * @note This algorithm will not consume any additional code point.
 */
const checkForValidEscape = (a, b) => {
    // If the first code point is not U+005C REVERSE SOLIDUS (\), return false.
    if (a !== 92 /* CodePoint.ReverseSolidus */) {
        return false;
    }
    // Otherwise, if the second code point is a newline, return false.
    // Otherwise, return true.
    return !isNewline(b);
};
/**
 * § 4.3.9. Check if three code points would start an ident sequence
 *
 * @param a First code point
 * @param b Second code point
 * @param c Third code point
 * @returns `true` if the next code points would start an identifier, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#would-start-an-identifier}
 * @note This algorithm will not consume any additional code points.
 */
const checkForIdentStart = (a, b, c) => {
    // Look at the first code point:
    // U+002D HYPHEN-MINUS
    if (a === 45 /* CodePoint.HyphenMinus */) {
        // If the second code point is an ident-start code point or a U+002D HYPHEN-MINUS,
        // or the second and third code points are a valid escape, return true. Otherwise, return false.
        return isIdentStartCodePoint(b) || b === 45 /* CodePoint.HyphenMinus */ || checkForValidEscape(b, c);
    }
    // ident-start code point
    if (isIdentStartCodePoint(a)) {
        // Return true.
        return true;
    }
    // U+005C REVERSE SOLIDUS (\)
    if (a === 92 /* CodePoint.ReverseSolidus */) {
        // If the first and second code points are a valid escape, return true. Otherwise, return false.
        return checkForValidEscape(a, b);
    }
    // anything else
    // Return false.
    return false;
};
/**
 * § 4.3.10. Check if three code points would start a number
 *
 * @param a First code point
 * @param b Second code point
 * @param c Third code point
 * @returns `true` if the next code points would start a number, `false` otherwise
 * @see {@link https://www.w3.org/TR/css-syntax-3/#starts-with-a-number}
 * @note This algorithm will not consume any additional code points.
 */
const checkForNumberStart = (a, b, c) => {
    // Look at the first code point:
    // U+002B PLUS SIGN (+)
    // U+002D HYPHEN-MINUS (-)
    if (a === 43 /* CodePoint.PlusSign */ || a === 45 /* CodePoint.HyphenMinus */) {
        // If the second code point is a digit, return true.
        if (isDigit(b)) {
            return true;
        }
        // Otherwise, if the second code point is a U+002E FULL STOP (.) and the third code point is a digit, return
        // true.
        // Otherwise, return false.
        return b === 46 /* CodePoint.FullStop */ && isDigit(c);
    }
    // U+002E FULL STOP (.)
    if (a === 46 /* CodePoint.FullStop */) {
        // If the second code point is a digit, return true. Otherwise, return false.
        return isDigit(b);
    }
    // digit
    // Return true.
    // anything else
    // Return false.
    return isDigit(a);
};

/* eslint-disable no-bitwise */
/**
 * @file Hashing functions based on the djb2 algorithm
 *
 * @see {@link http://www.cse.yorku.ca/~oz/hash.html}
 * @see {@link https://gist.github.com/eplawless/52813b1d8ad9af510d85?permalink_comment_id=3367765#gistcomment-3367765}
 * @todo If we need it, we can create case-sensitive versions of these functions
 */
/**
 * Make a unique hash from the given array of code points
 *
 * @param arr Reference to the array of code points
 * @param start Start index
 * @param end End index
 * @returns Hash of the given array of code points
 * @note Case-insensitive (we use it just for function names which are case-insensitive)
 */
function getCodePointsArrayHash(arr, start, end) {
    let hash = 5381;
    for (let i = start; i < end; i += 1) {
        hash = hash * 33 ^ (arr[i] | 0x20);
    }
    return hash >>> 0;
}

/**
 * @file Tokenizer context
 */
/**
 * Context of the tokenizer which is shared between all the functions
 */
class TokenizerContext {
    /**
     * Cached source length
     */
    length;
    /**
     * Reference to the `onToken` callback function
     */
    onToken;
    /**
     * Reference to the `onError` callback function
     */
    onError;
    /**
     * Unicode code points of the source string
     *
     * @note The last code point is always EOF ("imaginary" code point)
     * @note Using `!` is safe here because the `preprocess` function always sets the codes in the constructor
     * @note We need a signed 32-bit integer array, because the code points are 21-bit integers + imaginary code points
     * are negative numbers
     */
    codes;
    /**
     * Actual position in the source string
     */
    cursor;
    /**
     * Custom function handlers to handle special functions, like Extended CSS's pseudo selectors
     */
    customFunctionHandlers;
    /**
     * Constructs a new tokenizer context instance
     *
     * @param source Source string
     * @param onToken Callback function to call when a token is found
     * @param onError Callback function to call when a parsing error occurs
     * @param functionHandlers Custom function handlers to handle special functions, like Extended CSS's pseudo
     * selectors
     */
    constructor(source, onToken, onError, functionHandlers) {
        // Set the source and offset
        // this.source = source;
        this.length = source.length;
        this.preprocess(source);
        // Ignore BOM character if present
        this.cursor = isBOM(this.codes[0]) ? 1 : 0;
        // Set the callback functions
        this.onToken = onToken;
        this.onError = onError;
        // Register custom function handlers, if any
        if (functionHandlers) {
            this.customFunctionHandlers = new Map();
            for (const [hash, handler] of functionHandlers) {
                this.customFunctionHandlers.set(hash, handler);
            }
        }
    }
    /**
     * § 3.3. Preprocessing the input stream
     *
     * @param source Source string to preprocess
     * @see {@link https://www.w3.org/TR/css-syntax-3/#input-preprocessing}
     */
    preprocess(source) {
        const len = source.length;
        this.codes = new Int32Array(len + 1); // add +1 slot for the EOF "code point"
        // TODO: Uncomment when needed - actually, we don't convert the CRLF to LF to keep the original source positions
        // // The input stream consists of the filtered code points pushed into it as the input byte stream is decoded.
        // for (let i = 0; i < len; i += 1) {
        //     const code = source.charCodeAt(i);
        //     // To filter code points from a stream of (unfiltered) code points input:
        //     switch (code) {
        //         // Replace any U+000D CARRIAGE RETURN (CR) code points, U+000C FORM FEED (FF) code points, or pairs
        //         // of U+000D CARRIAGE RETURN (CR) followed by U+000A LINE FEED (LF) in input by a single
        //         // U+000A LINE FEED (LF) code point.
        //         case CodePoint.CarriageReturn:
        //             if (source.charCodeAt(i + 1) === CodePoint.LineFeed) {
        //                 this.codes[i] = CodePoint.LineFeed;
        //                 // Skip the next code point
        //                 i += 1;
        //                 break;
        //             }
        //             this.codes[i] = CodePoint.LineFeed;
        //             break;
        //         case CodePoint.FormFeed:
        //             this.codes[i] = CodePoint.LineFeed;
        //             break;
        //         // Replace any U+0000 NULL or surrogate code points in input with U+FFFD REPLACEMENT CHARACTER (�).
        //         case CodePoint.Null:
        //             this.codes[i] = CodePoint.ReplacementCharacter;
        //             break;
        //         default:
        //             this.codes[i] = code;
        //             break;
        //     }
        // }
        // Everything what we need here is to transform the ASCII source to Unicode code points as fast as possible
        for (let i = 0; i < len; i += 1) {
            this.codes[i] = source.charCodeAt(i);
        }
        // Set last code point to EOF (this way we can use it in switch-case statements, which are faster than if-else
        // or classic lookup tables)
        // See https://stackoverflow.com/a/37955539
        this.codes[len] = -1 /* ImaginaryCodePoint.Eof */;
    }
    /**
     * Gets the corresponding custom function handler for the given function name hash
     *
     * @param hash Function name hash
     * @returns Corresponding custom function handler or `undefined` if not found
     */
    getFunctionHandler(hash) {
        return this.customFunctionHandlers?.get(hash);
    }
    /**
     * Checks if the custom function handler is registered for the given function name hash
     *
     * @param hash Custom function name hash
     * @returns `true` if the custom function handler is registered, `false` otherwise
     */
    hasFunctionHandler(hash) {
        return this.customFunctionHandlers?.has(hash) ?? false;
    }
    /**
     * Returns the current offset
     *
     * @returns Current offset
     */
    get offset() {
        return this.cursor;
    }
    /**
     * Returns the code point at the current offset
     *
     * @returns Code point at the current offset
     */
    get code() {
        return this.codes[this.offset];
    }
    /**
     * Returns the code point at the previous offset
     *
     * @returns Code point at the previous offset or `undefined` if the offset is out of bounds
     */
    get prevCode() {
        return this.codes[this.offset - 1];
    }
    /**
     * Returns the code point at the next offset
     *
     * @returns Code point at the next offset or `undefined` if the offset is out of bounds
     */
    get nextCode() {
        return this.codes[this.offset + 1];
    }
    /**
     * Returns the code point at the given relative offset
     *
     * @param relativeOffset Relative offset
     * @returns Code point at the relative offset or `undefined` if the offset is out of bounds
     * @note Relative offset compared to the current offset. 1 means the next code point, -1 means the previous code
     * point, 2 means the code point after the next code point, etc.
     */
    getRelativeCode(relativeOffset) {
        return this.codes[this.offset + relativeOffset];
    }
    /**
     * Check if the current offset is at the end of the source (or past it)
     *
     * @returns `true` if the current offset is at the end of the source, `false` otherwise
     */
    isEof() {
        return this.offset >= this.length;
    }
    /**
     * Check if the next code point is EOF
     *
     * @returns `true` if the next code point is EOF, `false` otherwise
     */
    isNextEof() {
        return this.cursor + 1 === this.length;
    }
    /**
     * Check if the current offset is less than or equal to the end of the source
     *
     * @returns `true` if the current offset is less than or equal to the end of the source, `false` otherwise
     */
    isLessThanEqualToEof() {
        return this.offset <= this.length;
    }
    /**
     * Consumes the given number of code points
     *
     * @param n Number of code points to consume (default: 1)
     * @note Negative numbers are allowed (they will move the cursor backwards)
     * @note No protection against out of bounds for performance reasons
     */
    consumeCodePoint(n = 1) {
        this.cursor += n;
    }
    /**
     * Finds the next non-whitespace code point and returns it
     *
     * @returns Next non-whitespace code point or EOF imaginary code point if the rest of the source is whitespace
     */
    getNextNonWsCode() {
        let i = this.cursor;
        while (i < this.length && isWhitespace(this.codes[i])) {
            i += 1;
        }
        return this.codes[i];
    }
    /**
     * Consumes the whitespace code points
     */
    consumeWhitespace() {
        while (this.code && isWhitespace(this.code)) {
            this.consumeCodePoint();
        }
    }
    /**
     * Consumes a single whitespace code point, if the current code point is a whitespace
     */
    consumeSingleWhitespace() {
        if (isWhitespace(this.code)) {
            // special case: consume CRLF as a single whitespace
            this.cursor += this.code === 13 /* CodePoint.CarriageReturn */ && this.nextCode === 10 /* CodePoint.LineFeed */ ? 2 : 1;
        }
    }
    /**
     * Consumes everything until the end of the comment (or the end of the source)
     */
    consumeUntilCommentEnd() {
        // search for the end of the comment or reach the end of the source
        while (this.cursor < this.length) {
            // check if the current code point is a *
            if (this.code === 42 /* CodePoint.Asterisk */ && this.nextCode === 47 /* CodePoint.Solidus */) {
                // consume '*/' and exit the loop
                this.cursor += 2;
                break;
            }
            // consume the current code point, it seems it's a part of the comment
            this.cursor += 1;
        }
    }
    /**
     * Consumes a single-character token (trivial token) and reports it via the `onToken` callback
     *
     * @param tokenType Token type to report
     */
    consumeTrivialToken(tokenType) {
        // eslint-disable-next-line no-plusplus
        this.onToken(tokenType, this.cursor, ++this.cursor);
    }
    /**
     * Calculates the hash of the fragment from the given start offset to the current offset. This is useful to
     * fast-check function names.
     *
     * @param start Start offset
     * @returns Calculated hash
     */
    getHashFrom(start) {
        return getCodePointsArrayHash(this.codes, start, this.cursor);
    }
}

/**
 * @file Possible CSS token types, as defined in the CSS Syntax Module Level 3.
 *
 * ! Strictly follows the spec.
 *
 * @see {@link https://www.w3.org/TR/css-syntax-3/#tokenization}
 */
exports.TokenType = void 0;
(function (TokenType) {
    TokenType[TokenType["Eof"] = 0] = "Eof";
    TokenType[TokenType["Ident"] = 1] = "Ident";
    TokenType[TokenType["Function"] = 2] = "Function";
    TokenType[TokenType["AtKeyword"] = 3] = "AtKeyword";
    TokenType[TokenType["Hash"] = 4] = "Hash";
    TokenType[TokenType["String"] = 5] = "String";
    TokenType[TokenType["BadString"] = 6] = "BadString";
    TokenType[TokenType["Url"] = 7] = "Url";
    TokenType[TokenType["BadUrl"] = 8] = "BadUrl";
    TokenType[TokenType["Delim"] = 9] = "Delim";
    TokenType[TokenType["Number"] = 10] = "Number";
    TokenType[TokenType["Percentage"] = 11] = "Percentage";
    TokenType[TokenType["Dimension"] = 12] = "Dimension";
    TokenType[TokenType["Whitespace"] = 13] = "Whitespace";
    TokenType[TokenType["Cdo"] = 14] = "Cdo";
    TokenType[TokenType["Cdc"] = 15] = "Cdc";
    TokenType[TokenType["Colon"] = 16] = "Colon";
    TokenType[TokenType["Semicolon"] = 17] = "Semicolon";
    TokenType[TokenType["Comma"] = 18] = "Comma";
    TokenType[TokenType["OpenSquareBracket"] = 19] = "OpenSquareBracket";
    TokenType[TokenType["CloseSquareBracket"] = 20] = "CloseSquareBracket";
    TokenType[TokenType["OpenParenthesis"] = 21] = "OpenParenthesis";
    TokenType[TokenType["CloseParenthesis"] = 22] = "CloseParenthesis";
    TokenType[TokenType["OpenCurlyBracket"] = 23] = "OpenCurlyBracket";
    TokenType[TokenType["CloseCurlyBracket"] = 24] = "CloseCurlyBracket";
    TokenType[TokenType["Comment"] = 25] = "Comment";
})(exports.TokenType || (exports.TokenType = {}));

/**
 * @file CSS token names
 */
const UNKNOWN_TOKEN_NAME = 'unknown';
/**
 * Pairs of token types and their base names
 */
const TOKEN_NAMES = Object.freeze({
    [exports.TokenType.Eof]: 'eof',
    [exports.TokenType.Ident]: 'ident',
    [exports.TokenType.Function]: 'function',
    [exports.TokenType.AtKeyword]: 'at-keyword',
    [exports.TokenType.Hash]: 'hash',
    [exports.TokenType.String]: 'string',
    [exports.TokenType.BadString]: 'bad-string',
    [exports.TokenType.Url]: 'url',
    [exports.TokenType.BadUrl]: 'bad-url',
    [exports.TokenType.Delim]: 'delim',
    [exports.TokenType.Number]: 'number',
    [exports.TokenType.Percentage]: 'percentage',
    [exports.TokenType.Dimension]: 'dimension',
    [exports.TokenType.Whitespace]: 'whitespace',
    [exports.TokenType.Cdo]: 'CDO',
    [exports.TokenType.Cdc]: 'CDC',
    [exports.TokenType.Colon]: 'colon',
    [exports.TokenType.Semicolon]: 'semicolon',
    [exports.TokenType.Comma]: 'comma',
    [exports.TokenType.OpenSquareBracket]: '[',
    [exports.TokenType.CloseSquareBracket]: ']',
    [exports.TokenType.OpenParenthesis]: '(',
    [exports.TokenType.CloseParenthesis]: ')',
    [exports.TokenType.OpenCurlyBracket]: '{',
    [exports.TokenType.CloseCurlyBracket]: '}',
    [exports.TokenType.Comment]: 'comment',
});
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
const getBaseTokenName = (type) => {
    return TOKEN_NAMES[type] ?? UNKNOWN_TOKEN_NAME;
};
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
const getFormattedTokenName = (type) => {
    return `<${getBaseTokenName(type)}-token>`;
};

/**
 * @file Tokenizing logic for escaped code points
 */
const MAX_HEX_DIGITS = 6;
/**
 * § 4.3.7. Consume an escaped code point
 *
 * @param context Reference to the tokenizer context instance
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point}
 */
const consumeEscapedCodePoint = (context) => {
    // It assumes that the U+005C REVERSE SOLIDUS (\) has already been consumed and that the next input code point has
    // already been verified to be part of a valid escape.
    // Consume the next input code point.
    context.consumeCodePoint();
    // hex digit
    if (isHexDigit(context.code)) {
        // Consume as many hex digits as possible, but no more than 5. Note that this means 1-6 hex digits have been
        // consumed in total. If the next input code point is whitespace, consume it as well. Interpret the hex digits
        // as a hexadecimal number.
        let consumedHexDigits = 0;
        while (isHexDigit(context.code) && consumedHexDigits <= MAX_HEX_DIGITS) {
            context.consumeCodePoint();
            consumedHexDigits += 1;
        }
        // If the next input code point is whitespace, consume it as well.
        context.consumeSingleWhitespace();
        // If this number is zero, or is for a surrogate, or is greater than the maximum allowed code point,
        // return U+FFFD REPLACEMENT CHARACTER (�).
        // Otherwise, return the code point with that value.
        // TODO: Implement surrogate check
    }
    // EOF
    // This is a parse error. Return U+FFFD REPLACEMENT CHARACTER (�).
    if (context.isEof()) {
        context.onError("Unexpected end of file while parsing escaped code point." /* ErrorMessage.UnexpectedEofInEscaped */, context.offset, context.offset);
    }
    // anything else
    // Return the current input code point.
};

/**
 * @file Tokenizing logic for ident sequences
 */
/**
 * § 4.3.11. Consume an ident sequence
 *
 * Consume an ident sequence from a stream of code points. It returns a string containing the largest name that can be
 * formed from adjacent code points in the stream, starting from the first.
 *
 * @param context Reference to the tokenizer context instance
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-name}
 * @note This algorithm does not do the verification of the first few code points that are necessary to ensure the
 * returned code points would constitute an <ident-token>. If that is the intended use, ensure that the stream
 * starts with an ident sequence before calling this algorithm.
 */
const consumeIndentSequence = (context) => {
    // Let result initially be an empty string.
    // Repeatedly consume the next input code point from the stream:
    while (!context.isEof()) {
        // ident code point
        if (isIdentCodePoint(context.code)) {
            // Append the code point to result.
            context.consumeCodePoint();
            continue;
        }
        // the stream starts with a valid escape
        if (checkForValidEscape(context.code, context.nextCode)) {
            // Consume an escaped code point. Append the returned code point to result.
            context.consumeCodePoint();
            consumeEscapedCodePoint(context);
            continue;
        }
        // anything else
        // Reconsume the current input code point. Return result.
        return;
    }
};

/**
 * @file Tokenizing logic for URLs
 */
/**
 * § 4.3.14. Consume the remnants of a bad url
 *
 * Consume the remnants of a bad url from a stream of code points, "cleaning up" after the tokenizer realizes that it’s
 * in the middle of a <bad-url-token> rather than a <url-token>. It returns nothing; its sole use is to consume enough
 * of the input stream to reach a recovery point where normal tokenizing can resume.
 *
 * @param context Tokenizer context
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-remnants-of-bad-url}
 */
function consumeBadUrlRemnants(context) {
    // Repeatedly consume the next input code point from the stream:
    // eslint-disable-next-line no-constant-condition
    for (; !context.isEof(); context.consumeCodePoint()) {
        // U+0029 RIGHT PARENTHESIS ())
        if (context.code === 41 /* CodePoint.RightParenthesis */) {
            // Don’t forget to consume it.
            context.consumeCodePoint();
            return;
        }
        // the input stream starts with a valid escape
        if (checkForValidEscape(context.getRelativeCode(1), context.getRelativeCode(2))) {
            // Consume an escaped code point. This allows an escaped right parenthesis ("\)") to be encountered
            // without ending the <bad-url-token>. This is otherwise identical to the "anything else" clause.
            context.consumeCodePoint();
            consumeEscapedCodePoint(context);
            continue;
        }
        // anything else
        // Do nothing.
    }
}
/**
 * Helper function for consuming a bad url token.
 *
 * @param context Tokenizer context
 * @param start Token start offset
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-remnants-of-bad-url}
 */
function consumeBadUrlToken(context, start) {
    consumeBadUrlRemnants(context);
    context.onToken(exports.TokenType.BadUrl, start, context.offset);
}
/**
 * § 4.3.6. Consume a url token
 *
 * Consume a url token from a stream of code points. It returns either a <url-token> or a <bad-url-token>.
 *
 * @param context Reference to the tokenizer context instance
 * @param start Token start offset
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-url-token}
 * @note This algorithm assumes that the initial "url(" has already been consumed. This algorithm also assumes that
 * it’s being called to consume an "unquoted" value, like url(foo). A quoted value, like url("foo"), is parsed as a
 * <function-token>. Consume an ident-like token automatically handles this distinction; this algorithm shouldn’t be
 * called directly otherwise.
 */
const consumeUrlToken = (context, start) => {
    // Initially create a <url-token> with its value set to the empty string.
    // Consume as much whitespace as possible.
    while (isWhitespace(context.code)) {
        context.consumeCodePoint();
    }
    // Repeatedly consume the next input code point from the stream:
    // eslint-disable-next-line no-constant-condition
    while (context.offset <= context.length) {
        // TODO: Use switch-case here, but need to resolve non-printable code points first
        // U+0029 RIGHT PARENTHESIS ())
        if (context.code === 41 /* CodePoint.RightParenthesis */) {
            // Consume it.
            context.consumeCodePoint();
            // Return the <url-token>.
            context.onToken(exports.TokenType.Url, start, context.offset);
            return;
        }
        // EOF
        if (context.isEof()) {
            // This is a parse error. Return the <url-token>.
            context.onToken(exports.TokenType.Url, start, context.offset);
            context.onError("Unexpected end of file while parsing URL." /* ErrorMessage.UnexpectedEofInUrl */, start, context.offset);
            return;
        }
        // whitespace
        if (isWhitespace(context.code)) {
            // Consume as much whitespace as possible. If the next input code point is U+0029 RIGHT PARENTHESIS ())
            // or EOF, consume it and return the <url-token> (if EOF was encountered, this is a parse error);
            // otherwise, consume the remnants of a bad url, create a <bad-url-token>, and return it.
            while (isWhitespace(context.code)) {
                context.consumeCodePoint();
            }
            if (context.code === 41 /* CodePoint.RightParenthesis */ || context.isEof()) {
                context.consumeCodePoint();
                context.onToken(exports.TokenType.Url, start, context.offset);
                context.onError("Unexpected end of file while parsing URL." /* ErrorMessage.UnexpectedEofInUrl */, start, context.offset);
                return;
            }
            context.onError("Unexpected character in URL." /* ErrorMessage.UnexpectedCharInUrl */, start, context.offset);
            consumeBadUrlToken(context, start);
            return;
        }
        // U+0022 QUOTATION MARK (")
        // U+0027 APOSTROPHE (')
        // U+0028 LEFT PARENTHESIS (()
        // non-printable code point
        if (context.code === 34 /* CodePoint.QuotationMark */
            || context.code === 39 /* CodePoint.Apostrophe */
            || context.code === 40 /* CodePoint.LeftParenthesis */
            || isNonPrintableCodePoint(context.code)) {
            // This is a parse error. Consume the remnants of a bad url, create a <bad-url-token>, and return it.
            context.onError("Unexpected character in URL." /* ErrorMessage.UnexpectedCharInUrl */, start, context.offset);
            consumeBadUrlToken(context, start);
            return;
        }
        // U+005C REVERSE SOLIDUS (\)
        if (context.code === 92 /* CodePoint.ReverseSolidus */) {
            // If the stream starts with a valid escape, consume an escaped code point and append the returned code
            // point to the <url-token>’s value.
            if (checkForValidEscape(context.code, context.nextCode)) {
                // Consume reversed solidus, then consume escaped code point
                context.consumeCodePoint();
                consumeEscapedCodePoint(context);
                continue;
            }
            // Otherwise, this is a parse error. Consume the remnants of a bad url, create a <bad-url-token>, and
            // return it.
            context.onError("Unexpected character in URL." /* ErrorMessage.UnexpectedCharInUrl */, start, context.offset);
            consumeBadUrlToken(context, start);
            return;
        }
        // anything else
        // Append the current input code point to the <url-token>’s value.
        context.consumeCodePoint();
    }
};

/**
 * @file Tokenizing logic for ident-like tokens
 */
const URL_FUNCTION_HASH = 193422222; // getStringHash('url')
/**
 * § 4.3.4. Consume an ident-like token
 *
 * Consume an ident-like token from a stream of code points. It returns an <ident-token>, <function-token>, <url-token>,
 * or <bad-url-token>.
 *
 * @param context Reference to the tokenizer context instance
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-an-ident-like-token}
 * @note We extended the algorithm to allow custom function handlers, but the tokenizer still strictly follows the spec.
 */
const consumeIdentLikeToken = (context) => {
    // Consume an ident sequence, and let string be the result.
    const start = context.offset;
    consumeIndentSequence(context);
    // If the ident sequence is followed by U+0028 LEFT PARENTHESIS ((), consume it as a function:
    if (context.code === 40 /* CodePoint.LeftParenthesis */) {
        // First, store the function’s name hash
        const fnHash = context.getHashFrom(start);
        // Consume the opening parenthesis.
        context.consumeCodePoint();
        // URL
        if (fnHash === URL_FUNCTION_HASH) {
            // While the next two input code points are whitespace, consume the next input code point
            // If the next one or two input code points are U+0022 QUOTATION MARK ("), U+0027 APOSTROPHE ('), or
            // whitespace followed by U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE ('), then create a <function-token>
            // with its value set to string and return it.
            // ! Different from the spec, but technically it is enough to check the next non-whitespace code point
            const nextNonWsCode = context.getNextNonWsCode();
            if (nextNonWsCode === 34 /* CodePoint.QuotationMark */ || nextNonWsCode === 39 /* CodePoint.Apostrophe */) {
                context.onToken(exports.TokenType.Function, start, context.offset);
                return;
            }
            // Otherwise, consume a url token, and return it.
            consumeUrlToken(context, start);
            return;
        }
        // This is a good time to call custom function handlers, if any.
        // ! This is not part of the spec, but it's a good way to extend the tokenizer and if you didn't added any
        // ! custom function handler, it will not affect the tokenizer in any way, it still strictly follows the spec.
        // For performance reasons, we use `has` and `get` separately to avoid declaring a new variable every time here
        if (context.hasFunctionHandler(fnHash)) {
            // Return the <function-token>.
            context.onToken(exports.TokenType.Function, start, context.offset);
            // Consume the function body
            // It's safe to call the handler directly because we already checked if it exists
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            context.getFunctionHandler(fnHash)(context);
            return;
        }
        // Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((), consume it. Create a <function-token>
        // with its value set to string and return it.
        context.onToken(exports.TokenType.Function, start, context.offset);
        return;
    }
    // Otherwise, create an <ident-token> with its value set to string and return it.
    context.onToken(exports.TokenType.Ident, start, context.offset);
};

/**
 * @file Tokenizing logic for numbers
 */
/**
 * § 4.3.12. Consume a number
 *
 * Consume a number from a stream of code points. It returns a numeric value, and a type which is either "integer" or
 * "number".
 *
 * @param context Reference to the tokenizer context instance
 * @note This algorithm does not do the verification of the first few code points that are necessary to ensure a number
 * can be obtained from the stream. Ensure that the stream starts with a number before calling this algorithm.
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-number}
 * @todo Uncomment type/repr handling if needed - currently we don't need them, and they're not used for performance
 * reasons
 */
const consumeNumber = (context) => {
    // Execute the following steps in order:
    // 1. Initially set type to "integer". Let repr be the empty string.
    // TODO: Uncomment type/repr handling if needed
    // let type = NumberType.Integer;
    // const repr: string[] = [];
    // 2. If the next input code point is U+002B PLUS SIGN (+) or U+002D HYPHEN-MINUS (-), consume it and append it
    // to repr.
    if (context.code === 43 /* CodePoint.PlusSign */ || context.code === 45 /* CodePoint.HyphenMinus */) {
        context.consumeCodePoint();
        // TODO: Append to repr
    }
    // 3. While the next input code point is a digit, consume it and append it to repr.
    while (isDigit(context.code)) {
        context.consumeCodePoint();
        // TODO: Append to repr
    }
    // 4. If the next 2 input code points are U+002E FULL STOP (.) followed by a digit, then:
    if (context.code === 46 /* CodePoint.FullStop */ && isDigit(context.nextCode)) {
        // 1. Consume them.
        context.consumeCodePoint(2);
        // 2.Append them to repr
        // TODO: Append to repr
        // 3. Set type to "number".
        // type = NumberType.Number;
        // 4. While the next input code point is a digit, consume it and append it to repr.
        while (isDigit(context.code)) {
            context.consumeCodePoint();
            // TODO: Append to repr
        }
    }
    // 5. If the next 2 or 3 input code points are U+0045 LATIN CAPITAL LETTER E (E) or U+0065 LATIN SMALL LETTER E
    // (e) ...
    if ((context.code === 69 /* CodePoint.LatinCapitalLetterE */ || context.code === 101 /* CodePoint.LatinSmallLetterE */)) {
        // ... optionally followed by U+002D HYPHEN-MINUS (-) or U+002B PLUS SIGN (+)
        // Note: we split this into two if statements to avoid declaring a shift variable for the sign
        if ((context.nextCode === 45 /* CodePoint.HyphenMinus */ || context.nextCode === 43 /* CodePoint.PlusSign */)
            && isDigit(context.getRelativeCode(2))) {
            // 1. Consume them.
            context.consumeCodePoint(3); // e, sign, digit
            // 2. Append them to repr.
            // TODO: Append to repr
            // 3. Set type to "number".
            // TODO: Set type
            // 4. While the next input code point is a digit, consume it and append it to repr.
            while (isDigit(context.code)) {
                context.consumeCodePoint();
                // TODO: Append to repr
            }
        }
        else if (isDigit(context.nextCode)) {
            // ... followed by a digit, then:
            // 1. Consume them.
            context.consumeCodePoint(2); // e, digit
            // 2. Append them to repr.
            // TODO: Append to repr
            // 3. Set type to "number".
            // TODO: Set type
            // 4. While the next input code point is a digit, consume it and append it to repr.
            while (isDigit(context.code)) {
                context.consumeCodePoint();
                // TODO: Append to repr
            }
        }
    }
    // 6. Convert repr to a number, and set the value to the returned value.
    // TODO: Convert repr to a number
    // const value = Number(repr.join(''));
    // 7. Return value and type.
    // TODO: Uncomment type handling if needed
    // return [value, type];
};

/**
 * @file Tokenizing logic for numeric tokens
 */
/**
 * § 4.3.3. Consume a numeric token
 *
 * Consume a numeric token from a stream of code points. It returns either a <number-token>, <percentage-token>, or
 * <dimension-token>.
 *
 * @param context Reference to the tokenizer context instance
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-numeric-token}
 */
const consumeNumericToken = (context) => {
    const start = context.offset;
    // Consume a number and let number be the result.
    consumeNumber(context);
    // If the next 3 input code points would start an ident sequence, then:
    if (checkForIdentStart(context.code, context.nextCode, context.getRelativeCode(2))) {
        // 1. Create a <dimension-token> with the same value and type flag as number, and a unit set initially to
        // the empty string.
        // 2. Consume an ident sequence. Set the <dimension-token>’s unit to the returned value.
        consumeIndentSequence(context);
        // 3. Return the <dimension-token>.
        context.onToken(exports.TokenType.Dimension, start, context.offset);
        return;
    }
    // Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%), consume it. Create a
    // <percentage-token> with the same value as number, and return it.
    if (context.code === 37 /* CodePoint.PercentageSign */) {
        context.consumeCodePoint();
        context.onToken(exports.TokenType.Percentage, start, context.offset);
        return;
    }
    // Otherwise, create a <number-token> with the same value and type flag as number, and return it.
    context.onToken(exports.TokenType.Number, start, context.offset);
};

/**
 * @file Tokenizing logic for strings
 */
/**
 * § 4.3.5. Consume a string token
 *
 * Consume a string token from a stream of code points. It returns either a <string-token> or <bad-string-token>.
 *
 * @param context Reference to the tokenizer context instance
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-string-token}
 */
const consumeStringToken = (context) => {
    // This algorithm may be called with an ending code point, which denotes the code point that ends the string.
    // If an ending code point is not specified, the current input code point is used.
    const endingCodePoint = context.code;
    // Initially create a <string-token> with its value set to the empty string.
    const start = context.offset;
    // Consume opening character
    context.consumeCodePoint();
    // Repeatedly consume the next input code point from the stream:
    // eslint-disable-next-line no-constant-condition
    while (context.isLessThanEqualToEof()) {
        switch (context.code) {
            // ending code point
            case endingCodePoint:
                // Consume it
                context.consumeCodePoint();
                // Return the <string-token>.
                context.onToken(exports.TokenType.String, start, context.offset);
                return;
            // EOF
            case -1 /* ImaginaryCodePoint.Eof */:
                // This is a parse error. Return the <string-token>.
                context.onToken(exports.TokenType.String, start, context.offset);
                context.onError("Unexpected end of file while parsing string token." /* ErrorMessage.UnexpectedEofInString */, start, context.offset);
                return;
            // newline
            case 13 /* CodePoint.CarriageReturn */:
            case 10 /* CodePoint.LineFeed */:
            case 12 /* CodePoint.FormFeed */:
                // Special case: CRLF is 2 code points
                if (context.code === 13 /* CodePoint.CarriageReturn */ && context.nextCode === 10 /* CodePoint.LineFeed */) {
                    // Do an extra consume
                    context.consumeCodePoint(1);
                }
                context.consumeCodePoint(1);
                // This is a parse error. Reconsume the current input code point, create a <bad-string-token>, and
                // return it.
                context.onToken(exports.TokenType.BadString, start, context.offset);
                context.onError("Unexpected newline while parsing string token." /* ErrorMessage.UnexpectedNewlineInString */, start, context.offset);
                return;
            // U+005C REVERSE SOLIDUS (\)
            case 92 /* CodePoint.ReverseSolidus */:
                // If the next input code point is EOF, do nothing.
                if (context.isNextEof()) {
                    context.consumeCodePoint();
                    context.onToken(exports.TokenType.String, start, context.offset);
                    context.onError("Unexpected end of file while parsing string token." /* ErrorMessage.UnexpectedEofInString */, start, context.offset);
                    return;
                }
                // Otherwise, if the next input code point is a newline, consume it.
                if (isNewline(context.nextCode)) {
                    context.consumeCodePoint(2);
                    break;
                }
                // Otherwise, (the stream starts with a valid escape) consume an escaped code point and append the
                // returned code point to the <string-token>’s value.
                if (checkForValidEscape(context.code, context.nextCode)) {
                    context.consumeCodePoint();
                    consumeEscapedCodePoint(context);
                }
                break;
            // anything else
            default:
                // Append the current input code point to the <string-token>’s value.
                context.consumeCodePoint();
        }
    }
};

/**
 * @file Tokenizing logic for whitespace
 */
/**
 * § 4.3.1. Consume a token (whitespace)
 *
 * @see {@link https://www.w3.org/TR/css-syntax-3/#consume-token}
 * @param context Reference to the tokenizer context instance
 */
const consumeWhitespaceToken = (context) => {
    // Consume as much whitespace as possible. Return a <whitespace-token>.
    const start = context.offset;
    context.consumeWhitespace();
    context.onToken(exports.TokenType.Whitespace, start, context.offset);
};

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
const tokenize = (source, onToken, onError = () => { }, functionHandlers) => {
    // Create tokenizer context
    const context = new TokenizerContext(source, onToken, onError, functionHandlers);
    // Repeatedly consume the next input code point from the stream:
    while (!context.isEof()) {
        switch (context.code) {
            // According to the spec, these are all whitespace code points:
            case 9 /* CodePoint.CharacterTabulation */:
            case 32 /* CodePoint.Space */:
            case 10 /* CodePoint.LineFeed */:
            case 12 /* CodePoint.FormFeed */:
            case 13 /* CodePoint.CarriageReturn */:
                // Consume as much whitespace as possible. Return a <whitespace-token>.
                consumeWhitespaceToken(context);
                break;
            // Digit
            case 48 /* CodePoint.DigitZero */:
            case 49 /* CodePoint.DigitOne */:
            case 50 /* CodePoint.DigitTwo */:
            case 51 /* CodePoint.DigitThree */:
            case 52 /* CodePoint.DigitFour */:
            case 53 /* CodePoint.DigitFive */:
            case 54 /* CodePoint.DigitSix */:
            case 55 /* CodePoint.DigitSeven */:
            case 56 /* CodePoint.DigitEight */:
            case 57 /* CodePoint.DigitNine */:
                consumeNumericToken(context);
                break;
            case 40 /* CodePoint.LeftParenthesis */:
                context.consumeTrivialToken(exports.TokenType.OpenParenthesis);
                break;
            case 41 /* CodePoint.RightParenthesis */:
                context.consumeTrivialToken(exports.TokenType.CloseParenthesis);
                break;
            case 44 /* CodePoint.Comma */:
                context.consumeTrivialToken(exports.TokenType.Comma);
                break;
            case 58 /* CodePoint.Colon */:
                context.consumeTrivialToken(exports.TokenType.Colon);
                break;
            case 59 /* CodePoint.SemiColon */:
                context.consumeTrivialToken(exports.TokenType.Semicolon);
                break;
            case 91 /* CodePoint.LeftSquareBracket */:
                context.consumeTrivialToken(exports.TokenType.OpenSquareBracket);
                break;
            case 93 /* CodePoint.RightSquareBracket */:
                context.consumeTrivialToken(exports.TokenType.CloseSquareBracket);
                break;
            case 123 /* CodePoint.LeftCurlyBracket */:
                context.consumeTrivialToken(exports.TokenType.OpenCurlyBracket);
                break;
            case 125 /* CodePoint.RightCurlyBracket */:
                context.consumeTrivialToken(exports.TokenType.CloseCurlyBracket);
                break;
            case 39 /* CodePoint.Apostrophe */:
            case 34 /* CodePoint.QuotationMark */:
                // Consume a string token and return it.
                consumeStringToken(context);
                break;
            case 35 /* CodePoint.NumberSign */:
                // If the next input code point is an ident code point or the next two input code points are a
                // valid escape, then:
                if (isIdentCodePoint(context.getRelativeCode(1))
                    || checkForValidEscape(context.getRelativeCode(1), context.getRelativeCode(2))) {
                    const start = context.offset;
                    // 1. Create a <hash-token>.
                    // 2. If the next 3 input code points would start an ident sequence, set the <hash-token>’s
                    // type flag to "id".
                    // TODO: Uncomment when needed
                    // const props = {
                    //     typeFlag: checkForIdentStart(
                    //         context.getRelativeCode(1),
                    //         context.getRelativeCode(2),
                    //         context.getRelativeCode(3),
                    //     ) ? 'id' : 'unrestricted',
                    // };
                    // Consume an ident sequence, and set the <hash-token>’s value to the returned string.
                    context.consumeCodePoint();
                    consumeIndentSequence(context);
                    // 4. Return the <hash-token>.
                    // TODO: Uncomment when needed
                    // context.onToken(TokenType.Hash, start, context.offset, props);
                    context.onToken(exports.TokenType.Hash, start, context.offset);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 43 /* CodePoint.PlusSign */:
                // If the input stream starts with a number, reconsume the current input code point, consume a
                // numeric token, and return it.
                if (checkForNumberStart(context.code, context.getRelativeCode(1), context.getRelativeCode(2))) {
                    consumeNumericToken(context);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 45 /* CodePoint.HyphenMinus */:
                // If the input stream starts with a number, reconsume the current input code point, consume a
                // numeric token, and return it.
                if (checkForNumberStart(context.code, context.getRelativeCode(1), context.getRelativeCode(2))) {
                    consumeNumericToken(context);
                    break;
                }
                // Otherwise, if the next 2 input code points are U+002D HYPHEN-MINUS U+003E GREATER-THAN SIGN
                // (>), consume them and return a <CDC-token>.
                if (context.getRelativeCode(1) === 45 /* CodePoint.HyphenMinus */
                    && context.getRelativeCode(2) === 62 /* CodePoint.GreaterThanSign */) {
                    context.consumeCodePoint(3);
                    context.onToken(exports.TokenType.Cdc, context.offset - 3, context.offset);
                    break;
                }
                // Otherwise, if the input stream starts with an ident sequence, reconsume the current input
                // code point, consume an ident-like token, and return it.
                if (checkForIdentStart(context.code, context.getRelativeCode(1), context.getRelativeCode(2))) {
                    consumeIdentLikeToken(context);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 46 /* CodePoint.FullStop */:
                // If the input stream starts with a number, reconsume the current input code point, consume a
                // numeric token, and return it.
                if (checkForNumberStart(context.code, context.getRelativeCode(1), context.getRelativeCode(2))) {
                    consumeNumericToken(context);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 60 /* CodePoint.LessThanSign */:
                // If the next 3 input code points are U+0021 EXCLAMATION MARK U+002D HYPHEN-MINUS U+002D
                // HYPHEN-MINUS (!--), consume them and return a <CDO-token>.
                if (context.getRelativeCode(1) === 33 /* CodePoint.ExclamationMark */
                    && context.getRelativeCode(2) === 45 /* CodePoint.HyphenMinus */
                    && context.getRelativeCode(3) === 45 /* CodePoint.HyphenMinus */) {
                    context.consumeCodePoint(4);
                    context.onToken(exports.TokenType.Cdo, context.offset - 4, context.offset);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 64 /* CodePoint.CommercialAt */:
                // If the next 3 input code points would start an ident sequence, consume an ident sequence,
                // create an <at-keyword-token> with its value set to the returned value, and return it.
                if (checkForIdentStart(context.getRelativeCode(1), context.getRelativeCode(2), context.getRelativeCode(3))) {
                    const start = context.offset;
                    // Consume commercial at character
                    context.consumeCodePoint();
                    // Consume ident sequence after commercial at character
                    consumeIndentSequence(context);
                    context.onToken(exports.TokenType.AtKeyword, start, context.offset);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            case 92 /* CodePoint.ReverseSolidus */:
                // If the input stream starts with a valid escape, reconsume the current input code point,
                // consume an ident-like token, and return it.
                if (checkForValidEscape(context.code, context.getRelativeCode(1))) {
                    consumeIdentLikeToken(context);
                    break;
                }
                // Otherwise, this is a parse error. Return a <delim-token> with its value set to the current
                // input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                context.onError("Invalid escape sequence." /* ErrorMessage.InvalidEscapeSequence */, context.offset - 1, context.offset);
                break;
            case 47 /* CodePoint.Solidus */:
                // If the next two input code point are U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*),
                // If the preceding paragraph ended by consuming an EOF code point, this is a parse error.
                if (context.getRelativeCode(1) === 42 /* CodePoint.Asterisk */) {
                    const start = context.offset;
                    // Consume U+002F SOLIDUS (/) and U+002A ASTERISK (*)
                    context.consumeCodePoint(2);
                    // consume them and all following code points up to and including the first U+002A ASTERISK
                    // (*) followed by a U+002F SOLIDUS (/), or up to an EOF code point. Return to the start of
                    // this step.
                    context.consumeUntilCommentEnd();
                    if (context.isEof()) {
                        context.onError("Unterminated comment." /* ErrorMessage.UnterminatedComment */, start, context.length - 2);
                    }
                    context.onToken(exports.TokenType.Comment, start, context.offset);
                    break;
                }
                // Otherwise, return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
                break;
            // anything else
            default:
                // Can't be optimized because of the control threshold
                if (isIdentStartCodePoint(context.code)) {
                    // Reconsume the current input code point, consume an ident-like token, and return it.
                    consumeIdentLikeToken(context);
                    break;
                }
                // Return a <delim-token> with its value set to the current input code point.
                context.consumeTrivialToken(exports.TokenType.Delim);
        }
    }
};

/**
 * @file Custom tokenizing logic for Extended CSS's pseudo-classes
 */
/**
 * Generic handler for the Extended CSS's pseudo-classes
 *
 * @param context Reference to the tokenizer context instance
 */
const handleRegularExtendedCssPseudo = (context) => {
    // Save the current offset, because we will need it later
    const start = context.offset;
    // Consume as much whitespace as possible
    context.consumeWhitespace();
    // If the first non-whitespace code point is an apostrophe or a quotation mark, it means that we are dealing
    // with a string parameter.
    // In this case, we simply abort the custom handler here, and let the standard tokenizer handle the string and
    // everything that comes after it as specified in the spec.
    // This behavior is similar to the standard CSS's url() function, it is also handled differently if its parameter
    // is a string.
    if (context.code === 39 /* CodePoint.Apostrophe */ || context.code === 34 /* CodePoint.QuotationMark */) {
        // Report whitespace tokens (if any)
        // It is important to report them, because we already consumed them - and the report is faster here than
        // a re-consume
        if (context.offset > start) {
            context.onToken(exports.TokenType.Whitespace, start, context.offset);
        }
        // We simply abort the custom handler
        return;
    }
    // Otherwise, we need to find the closing parenthesis based on the parenthesis balance
    // Parenthesis balance: 1, because we start after the opening parenthesis:
    // :contains(param)
    //           ^ we starts from here, so we already have 1 open parenthesis
    let balance = 1;
    // Don't forget to report already consumed whitespace chars as delim-tokens (if any)
    // Note: we handle the parameter characters as delim-tokens, this is why we don't need to report them here
    // as whitespace-tokens
    for (let i = start; i < context.offset; i += 1) {
        context.onToken(exports.TokenType.Delim, i, i + 1);
    }
    // Consume until we find the closing parenthesis or we reach the end of the source
    while (!context.isEof()) {
        if (context.code === 40 /* CodePoint.LeftParenthesis */ && context.prevCode !== 92 /* CodePoint.ReverseSolidus */) {
            // If we find an unescaped opening parenthesis, we increase the balance
            balance += 1;
        }
        else if (context.code === 41 /* CodePoint.RightParenthesis */ && context.prevCode !== 92 /* CodePoint.ReverseSolidus */) {
            // If we find an unescaped closing parenthesis, we decrease the balance
            balance -= 1;
            // If the balance is 0, it means that we found the closing parenthesis
            if (balance === 0) {
                break;
            }
        }
        // Consume the current character as a delim-token
        context.consumeTrivialToken(exports.TokenType.Delim);
    }
};

/**
 * @file Custom tokenizing logic for Extended CSS's `:xpath()` pseudo-class
 * @note `:xpath()` is a bit tricky, because it can contain unescaped parentheses inside strings in the XPath
 * expression.
 */
/**
 * Handler for the Extended CSS's `:xpath()` pseudo-class
 *
 * @param context Reference to the tokenizer context instance
 */
const handleXpathExtendedCssPseudo = (context) => {
    // Save the current offset, because we will need it later
    const start = context.offset;
    // Consume as much whitespace as possible
    context.consumeWhitespace();
    // If the first non-whitespace code point is an apostrophe or a quotation mark, it means that we are dealing
    // with a string parameter.
    // In this case, we simply abort the custom handler here, and let the standard tokenizer handle the string and
    // everything that comes after it as specified in the spec.
    // This behavior is similar to the standard CSS's url() function, it is also handled differently if its parameter
    // is a string.
    if (context.code === 39 /* CodePoint.Apostrophe */ || context.code === 34 /* CodePoint.QuotationMark */) {
        // Report whitespace tokens (if any)
        // It is important to report them, because we already consumed them - and the report is faster here than
        // a re-consume
        if (context.offset > start) {
            context.onToken(exports.TokenType.Whitespace, start, context.offset);
        }
        // We simply abort the custom handler
        return;
    }
    // Otherwise, we need to find the closing parenthesis based on the parenthesis balance
    // Parenthesis balance: 1, because we start after the opening parenthesis:
    // :xpath(param)
    //        ^ we starts from here, so we already have 1 open parenthesis
    let balance = 1;
    // Don't forget to report already consumed whitespace chars as delim-tokens (if any)
    // Note: we handle the parameter characters as delim-tokens, this is why we don't need to report them here
    // as whitespace-tokens
    for (let i = start; i < context.offset; i += 1) {
        context.onToken(exports.TokenType.Delim, i, i + 1);
    }
    // :xpath() is a bit tricky, because it can contain unescaped parentheses inside strings in the XPath expression,
    // like this:
    // :xpath(//div[@class="foo(bar)"])
    // but in this case, not required the whole XPath expression to be a string
    let inString = false;
    // Consume until we find the closing parenthesis or we reach the end of the source
    while (!context.isEof()) {
        // If we find an unescaped quote mark, we toggle the "inString" flag
        // It is important, because we should omit parentheses inside strings.
        if (context.code === 34 /* CodePoint.QuotationMark */ && context.prevCode !== 92 /* CodePoint.ReverseSolidus */) {
            inString = !inString;
        }
        // If we are not inside a string, we should check parentheses balance
        if (!inString) {
            if (context.code === 40 /* CodePoint.LeftParenthesis */ && context.prevCode !== 92 /* CodePoint.ReverseSolidus */) {
                // If we find an unescaped opening parenthesis, we increase the balance
                balance += 1;
            }
            else if (context.code === 41 /* CodePoint.RightParenthesis */ && context.prevCode !== 92 /* CodePoint.ReverseSolidus */) {
                // If we find an unescaped closing parenthesis, we decrease the balance
                balance -= 1;
                // If the balance is 0, it means that we found the closing parenthesis of the
                // pseudo-class
                if (balance === 0) {
                    break;
                }
            }
        }
        // Consume the current character as a delim-token
        context.consumeTrivialToken(exports.TokenType.Delim);
    }
};

/**
 * @file Map utility functions
 */
/**
 * Simple utility function to merge two maps.
 *
 * @param map1 First map
 * @param map2 Second map
 * @returns Merged map
 * @note If a key is present in both maps, the value from the second map will be used
 * @note This function does not modify the original maps, it returns a new map
 */
function mergeMaps(map1, map2) {
    const result = new Map();
    for (const [key, value] of map1) {
        result.set(key, value);
    }
    for (const [key, value] of map2) {
        result.set(key, value);
    }
    return result;
}

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
const ABP_CONTAINS_HASH = 1989084725; // getStringHash('-abp-contains')
const CONTAINS_HASH = 2399470598; // getStringHash('contains')
const HAS_TEXT_HASH = 1221663855; // getStringHash('has-text')
const MATCHES_CSS_HASH = 102304302; // getStringHash('matches-css')
const MATCHES_CSS_AFTER_HASH = 2923888231; // getStringHash('matches-css-after')
const MATCHES_CSS_BEFORE_HASH = 1739713050; // getStringHash('matches-css-before')
const MATCHES_PROPERTY_HASH = 1860790666; // getStringHash('matches-property')
const MATCHES_ATTR_HASH = 3376104318; // getStringHash('matches-attr')
const XPATH_HASH = 196571984; // getStringHash('xpath')
/**
 * Map of Extended CSS's pseudo-classes and their respective handler functions
 */
const EXT_CSS_PSEUDO_HANDLERS = new Map([
    // Note: alternatively, you can use `getStringHash` to get the hash of the pseudo-class name, but we use
    // pre-calculated hashes here for performance reasons
    [ABP_CONTAINS_HASH, handleRegularExtendedCssPseudo],
    [CONTAINS_HASH, handleRegularExtendedCssPseudo],
    [HAS_TEXT_HASH, handleRegularExtendedCssPseudo],
    [MATCHES_CSS_HASH, handleRegularExtendedCssPseudo],
    [MATCHES_CSS_AFTER_HASH, handleRegularExtendedCssPseudo],
    [MATCHES_CSS_BEFORE_HASH, handleRegularExtendedCssPseudo],
    [MATCHES_PROPERTY_HASH, handleRegularExtendedCssPseudo],
    [MATCHES_ATTR_HASH, handleRegularExtendedCssPseudo],
    [XPATH_HASH, handleXpathExtendedCssPseudo],
]);
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
function tokenizeExtended(source, onToken, onError = () => { }, functionHandlers = new Map()) {
    tokenize(source, onToken, onError, 
    // Register custom function handlers for Extended CSS's pseudo-classes, but do not call mergeMaps if there are
    // no custom function handlers are provided
    functionHandlers.size > 0
        ? mergeMaps(EXT_CSS_PSEUDO_HANDLERS, functionHandlers)
        : EXT_CSS_PSEUDO_HANDLERS);
}

/**
 * @file CSS identifier decoder.
 */
const EMPTY_STRING = '';
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
const decodeIdent = (ident) => {
    const decodedIdent = [];
    for (let i = 0; i < ident.length; i += 1) {
        const codePoint = ident.charCodeAt(i);
        // 4.3.7. Consume an escaped code point
        // https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
        if (codePoint === 92 /* CodePoint.ReverseSolidus */) {
            // hex digit
            if (isHexDigit(ident.charCodeAt(i + 1))) {
                // Consume as many hex digits as possible, but no more than 5.
                // Note that this means 1-6 hex digits have been consumed in total.
                let n = 0;
                let j = 0; // consumed hex digits
                while (j < MAX_HEX_DIGITS && isHexDigit(ident.charCodeAt(i + j + 1))) {
                    // Interpret the hex digits as a hexadecimal number.
                    n = n * 16 + parseInt(ident[i + j + 1], 16);
                    j += 1;
                }
                decodedIdent.push(
                // If this number is zero, or is for a surrogate, or is greater than the maximum allowed code
                // point, return U+FFFD REPLACEMENT CHARACTER (�).
                // Otherwise, return the code point with that value.
                String.fromCodePoint(n === 0 || isSurrogate(n) || isGreaterThanMaxAllowedCodePoint(n)
                    ? 65533 /* CodePoint.ReplacementCharacter */
                    : n));
                i += j;
                // If the next input code point is whitespace, consume it as well.
                const nextCodePoint = ident.charCodeAt(i + 1);
                if (isWhitespace(nextCodePoint)) {
                    // Consume whitespace character
                    i += 1;
                    // Special case: consume +1 character if the sequence is CR LF
                    if (nextCodePoint === 13 /* CodePoint.CarriageReturn */ && ident.charCodeAt(i + 1) === 10 /* CodePoint.LineFeed */) {
                        i += 1;
                    }
                }
            }
            // do nothing for EOF
        }
        else {
            // anything else
            // Return the current input code point.
            decodedIdent.push(ident[i]);
        }
    }
    return decodedIdent.join(EMPTY_STRING);
};

const version = "1.1.1";

/**
 * @file Package version
 */
// ! Notice:
// Don't export version from package.json directly, because if you run `tsc` in the root directory, it will generate
// `dist/types/src/version.d.ts` with wrong relative path to `package.json`. So we need this little "hack"
const CSS_TOKENIZER_VERSION = version;

exports.CSS_TOKENIZER_VERSION = CSS_TOKENIZER_VERSION;
exports.TokenizerContext = TokenizerContext;
exports.decodeIdent = decodeIdent;
exports.getBaseTokenName = getBaseTokenName;
exports.getFormattedTokenName = getFormattedTokenName;
exports.tokenize = tokenize;
exports.tokenizeExtended = tokenizeExtended;
