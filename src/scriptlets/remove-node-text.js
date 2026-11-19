import {
    hit,
    logMessage,
    nodeListToArray,
    toRegExp,
    getTrustedTypesApi,
    handleExistingNodes,
    parseNodeTextParams,
    isValidSelector,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgNodeTextReplacement,
    getUboNodeTextReplacement,
    replaceNodesText,
    isDigits,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet remove-node-text
 *
 * @description
 * Removes text from DOM nodes.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/2bb446797a12086f2eebc0c8635b671b8b90c477
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-node-text', nodeName, textMatch[, parentSelector[, ...extraArgs]])
 * ```
 *
 * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
 * Must target lowercased node names, e.g `div` instead of `DIV`.
 * - `textMatch` — required, string or RegExp to match against node's text content.
 * If matched, the whole text will be removed. Case sensitive.
 * - `parentSelector` — optional, string, CSS selector to match parent node.
 *   If set, only the nodes inside of the matched parents are processed, and for `#text` only their own text nodes.
 *   Empty string means no parent selector, e.g. to set the options below.
 * - `...extraArgs` — optional, options, each followed by its value:
 *     - `excludes, value` — string or RegExp, do not remove the text if it contains or matches it
 *     - `sedCount, n` — remove the text of at most `n` nodes, positive integer; nodes are counted
 *       if their text is matched, the present ones first, and once `n` is reached,
 *       no more nodes are processed, regardless of `stay` and `quitAfter`
 *     - `stay, 1` — keep removing the text of added nodes until the page is unloaded,
 *       instead of 10 seconds after the scriptlet has run
 *     - `quitAfter, ms` — keep removing the text of added nodes for `ms` milliseconds after the document
 *       is interactive, i.e. on `DOMContentLoaded`, instead of 10 seconds after the scriptlet has run;
 *       `0` stops when the document is interactive
 *
 *   A rule with an invalid `parentSelector`, `sedCount` or `quitAfter` is not applied.
 *
 * Text of the nodes which are present when the scriptlet runs is removed, also of text nodes for `#text`,
 * and of the nodes added later, as long as added nodes are processed.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g. `example.org##+js(rmnt, script, adblock)`,
 * also by its other name `remove-node-text`:
 *
 * ```text
 * example.org##+js(rmnt, nodeName[, includes[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `nodeName` — matched against the whole node name case-insensitively, e.g. `script` or `#text`,
 *   or by a regular expression
 * - `includes` — optional, string or regular expression which the text has to match,
 *   if it is not set, the text of all the nodes with the name is removed
 * - there is no `parentSelector`, the options follow `includes` instead, as pairs of a name and a value:
 *     - `includes, value` or `condition, value` — the text has to match it, `includes` replaces the one above
 *     - `excludes, value` — the text must not match a string or a regular expression
 *     - `sedCount, n` — remove the text of at most `n` nodes, then stop, also with `stay`
 *     - `stay, 1` — keep removing the text of added nodes, instead of stopping when the document
 *       is interactive, i.e. on `DOMContentLoaded`
 *     - `quitAfter, ms` — keep removing the text of added nodes for `ms` milliseconds
 *       after the document is interactive
 * - a rule with an invalid regular expression is not applied
 *
 * ### Examples
 *
 * 1. Remove node's text content:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-node-text', 'div', 'some text')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div>some text</div>
 *     <span>some text</span>
 *
 *     <!-- after -->
 *     <div></div   >
 *     <span>some text</span>
 *     ```
 *
 * 2. Remove node's text content, matching both node name and condition by RegExp:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-node-text', '/[a-z]*[0-9]/', '/text/')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <qrce3>some text</qrce3>
 *     <span>some text</span>
 *
 *     <!-- after -->
 *     <qrce3></qrce3>
 *     <span>some text</span>
 *     ```
 *
 * 3. Remove node's text content, matching parent node:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-node-text', '#text', 'some text', '.container')
 *     ```
 *
 *     ```html
 *     <!-- before -->
 *     <div class="container">
 *          some text
 *      </div>
 *     <div class="section">
 *          some text
 *      </div>
 *     <!-- after -->
 *     <div class="container">
 *     </div>
 *     <div class="section">
 *          some text
 *      </div>
 *     ```
 *
 * 4. Remove the text of the first script which contains `adblock`, also if the script is added later:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-node-text', 'script', 'adblock', '', 'sedCount', '1')
 *     ```
 *
 * 5. Keep removing the text of added scripts which contain `adblock` until the page is unloaded:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-node-text', 'script', 'adblock', '', 'stay', '1')
 *     ```
 *
 * @added v1.9.37.
 */
/* eslint-enable max-len */
export function removeNodeText(source, nodeName, textMatch, parentSelector, ...extraArgs) {
    let nodeTextReplacement;

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments:
    // `nodeName, includes` followed by named options instead of `parentSelector`
    if (typeof source.name === 'string' && source.name.startsWith('ubo-')) {
        const options = typeof parentSelector === 'undefined'
            ? extraArgs
            : [parentSelector].concat(extraArgs);
        // As in uBO, the text is replaced with an empty one,
        // and `includes` of the options replaces the one before them
        nodeTextReplacement = getUboNodeTextReplacement(
            source,
            typeof nodeName === 'string' ? nodeName : '',
            '',
            '',
            ['includes', textMatch || ''].concat(options).map(unescapeUboArgument),
        );
    } else {
        // The whole text is removed by the pattern which matches any text
        const ALL_TEXT_PATTERN = '/^.*$/s';
        nodeTextReplacement = getAdgNodeTextReplacement(
            source,
            nodeName,
            textMatch,
            ALL_TEXT_PATTERN,
            '',
            extraArgs,
        );

        if (nodeTextReplacement !== null && parentSelector) {
            if (!isValidSelector(parentSelector)) {
                logMessage(source, `Invalid parent selector: '${parentSelector}'`);
                return;
            }
            const { selector } = parseNodeTextParams(nodeName, textMatch);
            // Only the nodes inside of the parents are processed, and for `#text` only their own text nodes
            nodeTextReplacement.findTargetNodes = () => {
                const nodes = [];
                handleExistingNodes(selector, (foundNodes) => {
                    foundNodes.forEach((node) => nodes.push(node));
                }, parentSelector);
                return nodes;
            };
        }
    }

    if (nodeTextReplacement === null) {
        return;
    }

    replaceNodesText(source, nodeTextReplacement);
}

export const removeNodeTextNames = [
    'remove-node-text',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'remove-node-text.js',
    'ubo-remove-node-text.js',
    'rmnt.js',
    'ubo-rmnt.js',
    'ubo-remove-node-text',
    'ubo-rmnt',
];

// eslint-disable-next-line prefer-destructuring
removeNodeText.primaryName = removeNodeTextNames[0];

removeNodeText.injections = [
    hit,
    logMessage,
    nodeListToArray,
    toRegExp,
    getTrustedTypesApi,
    handleExistingNodes,
    parseNodeTextParams,
    isValidSelector,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgNodeTextReplacement,
    getUboNodeTextReplacement,
    replaceNodesText,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
