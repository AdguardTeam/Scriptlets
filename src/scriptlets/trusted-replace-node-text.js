import {
    observeDocumentWithTimeout,
    handleExistingNodes,
    handleMutations,
    replaceNodeText,
    isTargetNode,
    parseNodeTextParams,
    logMessage,
    hit,
    nodeListToArray,
    getAddedNodes,
    toRegExp,
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
 * example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement)
 * ```
 *
 * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
 * Must target lowercased node names, e.g `div` instead of `DIV`.
 * - `textMatch` — required, string or RegExp to match against node's text content.
 * If matched, the `pattern` will be replaced by the `replacement`. Case sensitive.
 * - `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
 * By default only first occurrence is replaced. To replace all occurrences use `g` flag in RegExp - `/pattern/g`.
 * - `replacement` — required, string to replace text content matched by `pattern`.
 * - `...extraArgs` — optional, string, if includes 'verbose' will log original and modified text content.
 *
 * > `verbose` may be useful for debugging but it is not allowed for prod versions of filter lists.
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
    const {
        selector,
        nodeNameMatch,
        textContentMatch,
        patternMatch,
    } = parseNodeTextParams(nodeName, textMatch, pattern);

    const shouldLog = extraArgs.includes('verbose');

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
            if (shouldLog) {
                const originalText = node.textContent;
                if (originalText) {
                    logMessage(source, `Original text content: ${originalText}`);
                }
            }
            replaceNodeText(source, node, patternMatch, replacement);
            if (shouldLog) {
                const modifiedText = node.textContent;
                if (modifiedText) {
                    logMessage(source, `Modified text content: ${modifiedText}`);
                }
            }
        }
    });

    // Apply dedicated handler to already rendered nodes...
    if (document.documentElement) {
        handleExistingNodes(selector, handleNodes);
    }

    // and newly added nodes
    observeDocumentWithTimeout((mutations) => handleMutations(mutations, handleNodes));
}

export const trustedReplaceNodeTextNames = [
    'trusted-replace-node-text',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceNodeText.primaryName = trustedReplaceNodeTextNames[0];

trustedReplaceNodeText.injections = [
    observeDocumentWithTimeout,
    handleExistingNodes,
    handleMutations,
    replaceNodeText,
    isTargetNode,
    parseNodeTextParams,
    logMessage,
    // following helpers should be imported and injected
    // because they are used by helpers above
    hit,
    nodeListToArray,
    getAddedNodes,
    toRegExp,
];
