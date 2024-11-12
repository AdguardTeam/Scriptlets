<!-- omit in toc -->
# CSS / Extended CSS Tokenizer

[![npm-badge]][npm-url] [![install-size-badge]][install-size-url] [![license-badge]][license-url]

This library provides two distinct CSS tokenizers:

1. **Standard CSS Tokenizer**: This tokenizer strictly adheres to the CSS Syntax Level 3 specification outlined by the
[W3C][css-syntax].
1. **Extended CSS Tokenizer**: Designed to extend the capabilities of the standard tokenizer, this component introduces
support for special pseudo-classes like `:contains()` and `:xpath()`.

Table of contents:

- [Installation](#installation)
- [Motivation](#motivation)
    - [What is Extended CSS?](#what-is-extended-css)
    - [Why do we need a custom tokenizer?](#why-do-we-need-a-custom-tokenizer)
- [The solution: Custom function handlers](#the-solution-custom-function-handlers)
    - [No new token types](#no-new-token-types)
- [Example usage](#example-usage)
- [API](#api)
    - [Tokenizer functions](#tokenizer-functions)
        - [`tokenize`](#tokenize)
        - [`tokenizeExtended`](#tokenizeextended)
    - [Utilities](#utilities)
        - [`TokenizerContext`](#tokenizercontext)
        - [`decodeIdent`](#decodeident)
    - [`CSS_TOKENIZER_VERSION`](#css_tokenizer_version)
    - [Token types](#token-types)
        - [`TokenType`](#tokentype)
        - [`getBaseTokenName`](#getbasetokenname)
        - [`getFormattedTokenName`](#getformattedtokenname)
- [Benchmark results](#benchmark-results)
- [Ideas \& Questions](#ideas--questions)
- [License](#license)

## Installation

You can install the library using

- [Yarn][yarn-pkg-manager-url] (recommended): `yarn add @adguard/css-tokenizer`
- [NPM][npm-pkg-manager-url]: `npm install @adguard/css-tokenizer`
- [PNPM][pnpm-pkg-manager-url]: `pnpm add @adguard/css-tokenizer`

## Motivation

To appreciate the necessity for a custom tokenizer, it's essential to understand the concept of Extended CSS, recognize
the challenges it poses, and discover how we can effectively address these issues.

### What is Extended CSS?

Extended CSS is a superset of CSS used by adblockers to provide more robust filtering capabilities. In practical terms,
Extended CSS introduces additional pseudo-classes that are not defined in the CSS specification. For more information,
please refer to the following resources:

<!--markdownlint-disable MD013-->
- <img src="https://cdn.adguard.com/website/github.com/AGLint/adg_logo.svg" alt="AdGuard logo" width="14px"> [AdGuard: *Extended CSS capabilities*][adg-ext-css]
- <img src="https://cdn.adguard.com/website/github.com/AGLint/ubo_logo.svg" alt="uBlock Origin logo" width="14px"> [uBlock Origin: *Procedural cosmetic filters*][ubo-procedural]
- <img src="https://cdn.adguard.com/website/github.com/AGLint/abp_logo.svg" alt="Adblock Plus logo" width="14px"> [Adblock Plus: *Extended CSS selectors*][abp-ext-css]
<!--markdownlint-enable MD013-->

### Why do we need a custom tokenizer?

The standard CSS tokenizer cannot handle Extended CSS's pseudo-classes *in every case*. For example, the `:contains()`
pseudo-class can have the following syntax:

```css
div:contains(i'm a parameter)
```

A standard CSS tokenizer interprets the single quotation mark (`'`) as a string delimiter, causing an error due to the
lack of a closing `)` character. This deviation from the expected syntax results in a parsing issue.

The `:xpath()` pseudo-class poses a similar challenge for a standard CSS tokenizer, as it can have syntax like this:

```css
div:xpath(//*...)
```

A standard tokenizer mistakenly identifies the `/*` sequence as the start of a comment, leading to incorrect parsing,
however, the `/*` sequence is the part of the [XPath expression][xpath-mdn].

## The solution: Custom function handlers

We've designed the standard CSS tokenizer to rigorously adhere to the CSS Syntax Level 3 specification. However, we've
also introduced the ability to handle certain pseudo-classes in a custom manner, akin to how the `<url-token>` is
managed in the CSS specs. When the tokenizer encounters a function token (pattern: `function-name(`), it searches for a
handler function in the `functionHandlers` map based on the function name and calls the custom handler if it exists.

The custom handler receives a single argument: the shared tokenizer context object, which can be used to manage the
function, similar to how other tokens are handled in the library.

This approach allows us to maintain a native, specification-compliant CSS tokenizer with minimal overhead while also
providing the flexibility to manage special pseudo-classes in a custom way.

In essence, the Extended CSS tokenizer is a standard CSS tokenizer with custom function handlers for special
pseudo-classes.

### No new token types

It's crucial to emphasize that our implementation remains committed to the token types specified in the CSS W3C
standards. We do not introduce new token types, ensuring that our tokenizer stays in harmony with the official CSS
Syntax Level 3 specification. This dedication to adhering to industry standards and best practices guarantees that our
library maintains compatibility and consistency with CSS-related tools and workflows.

By preserving the standard CSS token types, we aim to provide users with a reliable and seamless experience while
working with CSS, upholding the integrity of the language as defined by the W3C.

## Example usage

Here's a straightforward example of how to use the library:

```js
// `tokenize` is a regular CSS tokenizer (and doesn't support Extended CSS)
// `tokenizeExtended` is an Extended CSS tokenizer
const { tokenize, tokenizeExtended, getFormattedTokenName } = require('@adguard/css-tokenizer');

// Input to tokenize
const CSS_SOURCE = `div:contains(aa'bb) { display: none !important; }`;

const COLUMNS = Object.freeze({
    TOKEN: 'Token',
    START: 'Start',
    END: 'End',
    FRAGMENT: 'Fragment'
});

// Prepare the data array
const data = [];

// Tokenize the input - feel free to try `tokenize` and `tokenizeExtended`
tokenizeExtended(CSS_SOURCE, (token, start, end) => {
    data.push({
        [COLUMNS.TOKEN]: getFormattedTokenName(token),
        [COLUMNS.START]: start,
        [COLUMNS.END]: end,
        [COLUMNS.FRAGMENT]: CSS_SOURCE.substring(start, end),
    });
});

// Print the tokenization result as a table
console.table(data, Object.values(COLUMNS));
```

## API

### Tokenizer functions

#### `tokenize`

```ts
/**
 * CSS tokenizer function
 *
 * @param source Source code to tokenize
 * @param onToken Tokenizer callback which is called for each token found in source code
 * @param onError Error callback which is called when a parsing error is found (optional)
 * @param functionHandlers Custom function handlers (optional)
 */
function tokenize(
    source: string,
    onToken: OnTokenCallback,
    onError: OnErrorCallback = () => {},
    functionHandlers?: Map<number, TokenizerContextFunction>,
): void;
```

where

```ts
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
```

```ts
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
```

```ts
/**
 * Function handler
 *
 * @param context Reference to the tokenizer context instance
 * @param ...args Additional arguments (if any)
 */
type TokenizerContextFunction = (context: TokenizerContext, ...args: any[]) => void;
```

#### `tokenizeExtended`

`tokenizeExtended` is an extended version of the `tokenize` function that supports custom function handlers. This
function is designed to handle special pseudo-classes like `:contains()` and `:xpath()`.

```ts
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
function tokenizeExtended(
    source: string,
    onToken: OnTokenCallback,
    onError: OnErrorCallback = () => {},
    functionHandlers: Map<number, TokenizerContextFunction> = new Map(),
): void
```

### Utilities

#### `TokenizerContext`

A class that represents the tokenizer context. It is used to manage the tokenizer state and provides access to the
source code, current position, and other relevant information.

#### `decodeIdent`

```ts
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
function decodeIdent(ident: string): string;
```

### `CSS_TOKENIZER_VERSION`

```ts
/**
 * @adguard/css-tokenizer version
 */
const CSS_TOKENIZER_VERSION: string;
```

### Token types

#### `TokenType`

An enumeration of token types recognized by the tokenizer.
They are strictly based on the CSS Syntax Level 3 specification.

See https://www.w3.org/TR/css-syntax-3/#tokenization for more details.

#### `getBaseTokenName`

```ts
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
function getBaseTokenName(type: TokenType): string;
```

#### `getFormattedTokenName`

```ts
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
function getFormattedTokenName(type: TokenType): string;
```

> [!NOTE]
> Our API and token list is also compatible with the [CSSTree][css-tree-repo]'s tokenizer API, and in the long term, we
> plan to integrate this library into CSSTree via our [ECSSTree library][ecss-tree-repo], see
> [this issue][css-tree-issue] for more details.

## Benchmark results

You can find the benchmark results in the [benchmark/RESULTS.md][benchmark-results] file.

## Ideas & Questions

If you have any questions or ideas for new features, please [open an issue][new-issue-url] or a
[discussion][discussions-url]. We will be happy to discuss it with you.

## License

This project is licensed under the MIT license. See the [LICENSE][license-url] file for details.

[abp-ext-css]: https://help.eyeo.com/adblockplus/how-to-write-filters#elemhide-emulation
[adg-ext-css]: https://github.com/AdguardTeam/ExtendedCss/blob/master/README.md
[benchmark-results]: https://github.com/AdguardTeam/tsurlfilter/blob/master/packages/css-tokenizer/benchmark/RESULTS.md
[css-syntax]: https://www.w3.org/TR/css-syntax-3/
[css-tree-issue]: https://github.com/csstree/csstree/issues/253
[css-tree-repo]: https://github.com/csstree/csstree
[discussions-url]: https://github.com/AdguardTeam/tsurlfilter/discussions
[ecss-tree-repo]: https://github.com/AdguardTeam/ecsstree
[install-size-badge]: https://packagephobia.com/badge?p=@adguard/css-tokenizer
[install-size-url]: https://packagephobia.com/result?p=@adguard/css-tokenizer
[license-badge]: https://img.shields.io/npm/l/@adguard/css-tokenizer
[license-url]: https://github.com/AdguardTeam/tsurlfilter/blob/master/packages/css-tokenizer/LICENSE
[new-issue-url]: https://github.com/AdguardTeam/tsurlfilter/issues/new
[npm-badge]: https://img.shields.io/npm/v/@adguard/css-tokenizer
[npm-pkg-manager-url]: https://www.npmjs.com/get-npm
[npm-url]: https://www.npmjs.com/package/@adguard/css-tokenizer
[pnpm-pkg-manager-url]: https://pnpm.io/
[ubo-procedural]: https://github.com/gorhill/uBlock/wiki/Procedural-cosmetic-filters
[xpath-mdn]: https://developer.mozilla.org/en-US/docs/Web/XPath
[yarn-pkg-manager-url]: https://yarnpkg.com/en/docs/install
