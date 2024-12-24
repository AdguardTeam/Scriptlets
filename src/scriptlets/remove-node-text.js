import {
    observeDocumentWithTimeout,
    handleExistingNodes,
    handleMutations,
    replaceNodeText,
    isTargetNode,
    parseNodeTextParams,
    hit,
    nodeListToArray,
    getAddedNodes,
    toRegExp,
    createTrustedScript,
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
 * ```adblock
 * example.org#%#//scriptlet('remove-node-text', nodeName, textMatch[, parentSelector])
 * ```
 *
 * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
 * Must target lowercased node names, e.g `div` instead of `DIV`.
 * - `textMatch` — required, string or RegExp to match against node's text content.
 * If matched, the whole text will be removed. Case sensitive.
 * - `parentSelector` — optional, string, CSS selector to match parent node.
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
 * @added v1.9.37.
 */
/* eslint-enable max-len */
export function removeNodeText(source, nodeName, textMatch, parentSelector) {
    const {
        selector,
        nodeNameMatch,
        textContentMatch,
    } = parseNodeTextParams(nodeName, textMatch);

    /**
     * Handles nodes by removing text content of matched nodes
     *
     * Note: instead of drilling down all the arguments for both replace-node-text
     * and trusted-replace-node-text scriptlets, only the handler is being passed
     *
     * @param {Node[]} nodes nodes to handle
     * @returns {void}
     */
    const handleNodes = (nodes) => nodes.forEach((node) => {
        const shouldReplace = isTargetNode(
            node,
            nodeNameMatch,
            textContentMatch,
        );
        if (shouldReplace) {
            const ALL_TEXT_PATTERN = /^.*$/s;
            const REPLACEMENT = '';
            replaceNodeText(source, node, ALL_TEXT_PATTERN, REPLACEMENT);
        }
    });

    // Apply dedicated handler to already rendered nodes...
    if (document.documentElement) {
        handleExistingNodes(selector, handleNodes, parentSelector);
    }

    // and newly added nodes
    observeDocumentWithTimeout((mutations) => handleMutations(mutations, handleNodes, selector, parentSelector));
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
    observeDocumentWithTimeout,
    handleExistingNodes,
    handleMutations,
    replaceNodeText,
    isTargetNode,
    parseNodeTextParams,
    // following helpers should be imported and injected
    // because they are used by helpers above
    hit,
    nodeListToArray,
    getAddedNodes,
    toRegExp,
    createTrustedScript,
];
