import {
    hit,
    logMessage,
    toRegExp,
    getTrustedTypesApi,
    parseNodeTextParams,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgNodeTextReplacement,
    getUboNodeTextReplacement,
    replaceNodesText,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-node-text
 *
 * @description
 * Replaces text in text content of matched DOM nodes.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement[, ...extraArgs])
 * ```
 *
 * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
 * Must target lowercased node names, e.g `div` instead of `DIV`.
 * - `textMatch` — required, string or RegExp to match against node's text content.
 * If matched, the `pattern` will be replaced by the `replacement`. Case sensitive.
 * - `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
 * By default only first occurrence is replaced. To replace all occurrences use `g` flag in RegExp - `/pattern/g`.
 * - `replacement` — required, string to replace text content matched by `pattern`.
 * - `...extraArgs` — optional, `verbose` and options, each option followed by its value:
 *     - `verbose` — log original and modified text content
 *     - `excludes, value` — string or RegExp, do not replace the text if it contains or matches it
 *     - `sedCount, n` — replace the text of at most `n` nodes, positive integer; nodes are counted
 *       if their text is matched, the present ones first, and once `n` is reached,
 *       no more nodes are processed, regardless of `stay` and `quitAfter`
 *     - `stay, 1` — keep replacing the text of added nodes until the page is unloaded,
 *       instead of 10 seconds after the scriptlet has run
 *     - `quitAfter, ms` — keep replacing the text of added nodes for `ms` milliseconds after the document
 *       is interactive, i.e. on `DOMContentLoaded`, instead of 10 seconds after the scriptlet has run;
 *       `0` stops when the document is interactive
 *
 *   A rule with an invalid `sedCount` or `quitAfter` is not applied.
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * Text of the nodes which are present when the scriptlet runs is replaced, also of text nodes for `#text`,
 * and of the nodes added later, as long as added nodes are processed.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g. `example.org##+js(rpnt, script, ads, noads)`,
 * also by its other names `trusted-replace-node-text`, `trusted-rpnt` and `replace-node-text`:
 *
 * ```text
 * example.org##+js(rpnt, nodeName, pattern[, replacement[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `nodeName` — matched against the whole node name case-insensitively, e.g. `script` or `#text`,
 *   or by a regular expression
 * - there is no `textMatch`, the text of a node is replaced if `pattern` matches it
 * - `pattern` — a string replaces all its occurrences, a regular expression is used with its own flags only,
 *   e.g. `/ad/` replaces the first occurrence, and an empty pattern replaces the whole text
 * - `replacement` — optional, defaults to an empty string, i.e. the matched text is removed
 * - options are pairs of a name and a value which follow `replacement`:
 *     - `includes, value` or `condition, value` — the text has to match a string or a regular expression
 *     - `excludes, value` — the text must not match a string or a regular expression
 *     - `sedCount, n` — replace the text of at most `n` nodes, then stop, also with `stay`
 *     - `stay, 1` — keep replacing the text of added nodes, instead of stopping when the document is interactive,
 *       i.e. on `DOMContentLoaded`
 *     - `quitAfter, ms` — keep replacing the text of added nodes for `ms` milliseconds
 *       after the document is interactive
 * - a rule with an invalid regular expression is not applied
 *
 * ### Examples
 *
 * 1. Replace node's text content:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', 'div', 'some', 'text', 'other text')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>some text</div>
 *     <div>text</div>
 *     <span>some text</span>
 *
 *     <!-- after -->
 *     <div>some other text</div>
 *     <div>text</div>
 *     <span>some text</span>
 *     ```
 *
 * 1. Replace node's text content, matching both node name, text and pattern by RegExp:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', '/[a-z]*[0-9]/', '/s\dme/', '/t\dxt/', 'other text')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <qrce3>s0me t3xt</qrce3> // this node is going to be matched by both node name and text
 *     <qrce3>text</qrce3> // this node won't be matched by text content nor text content
 *     <span>some text</span>
 *
 *     <!-- after -->
 *     <qrce3>s0me other text</qrce3> // text content has changed
 *     <qrce3>text</qrce3>
 *     <span>some text</span>
 *     ```
 *
 * 1. Replace all occurrences in node's text content, matching both node name and text:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', 'p', 'bar', '/a/g', 'x')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <p>foa bar baz</p> // this node is going to be matched by both node name and text
 *
 *     <!-- after -->
 *     <p>fox bxr bxz</p> // text content has changed
 *     ```
 *
 * 1. Replace the text of the first script which contains `adblock`, unless it contains `nonce`,
 *    also if the script is added later:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', 'script', 'adblock', 'true', 'false', 'excludes', 'nonce', 'sedCount', '1')
 *     ```
 *
 * 1. Keep replacing the text of added scripts until the page is unloaded:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', 'script', 'adblock', 'true', 'false', 'stay', '1')
 *     ```
 *
 * 1. Replace node's text content and log original and modified text content:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-node-text', 'div', 'some', 'text', 'other text', 'verbose')
 *     ```
 *
 * @added v1.9.37.
 */
/* eslint-enable max-len */
export function trustedReplaceNodeText(source, nodeName, textMatch, pattern, replacement, ...extraArgs) {
    let nodeTextReplacement;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments:
    // `nodeName, pattern, replacement` followed by named options, so they are shifted by one
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        // The converter escapes each `'` of the arguments, but keeps `\"` as it is,
        // which uBO keeps as well, e.g. in a script which is a replacement
        const uboArgs = [textMatch, pattern, replacement].concat(extraArgs).map(unescapeUboArgument);
        nodeTextReplacement = getUboNodeTextReplacement(
            source,
            typeof nodeName === 'string' ? nodeName : '',
            typeof uboArgs[0] === 'string' ? uboArgs[0] : '',
            typeof uboArgs[1] === 'string' ? uboArgs[1] : '',
            uboArgs.slice(2),
        );
    } else {
        nodeTextReplacement = getAdgNodeTextReplacement(
            source,
            nodeName,
            textMatch,
            pattern,
            replacement,
            extraArgs,
        );
    }

    if (nodeTextReplacement === null) {
        return;
    }

    replaceNodesText(source, nodeTextReplacement);
}

export const trustedReplaceNodeTextNames = [
    'trusted-replace-node-text',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-replace-node-text.js',
    'ubo-trusted-replace-node-text',
    'ubo-trusted-rpnt.js',
    'ubo-trusted-rpnt',
    'ubo-replace-node-text.js',
    'ubo-replace-node-text',
    'ubo-rpnt.js',
    'ubo-rpnt',
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceNodeText.primaryName = trustedReplaceNodeTextNames[0];

trustedReplaceNodeText.injections = [
    hit,
    logMessage,
    toRegExp,
    getTrustedTypesApi,
    parseNodeTextParams,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgNodeTextReplacement,
    getUboNodeTextReplacement,
    replaceNodesText,
];
