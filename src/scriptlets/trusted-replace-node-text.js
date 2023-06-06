import {
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
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-node-text
 *
 * @description
 * Replaces text in text content of matched DOM nodes.
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('trusted-replace-node-text', nodeName, textMatch, pattern, replacement)
 * ```
 *
 * - `nodeName` — required, string or RegExp, specifies DOM node name from which the text will be removed.
 * Must target lowercased node names, e.g `div` instead of `DIV`.
 * - `textMatch` — required, string or RegExp to match against node's text content.
 * If matched, the whole text will be removed. Case sensitive.
 * - `pattern` — required, string or regexp for matching contents of `node.textContent` that should be replaced.
 * - `replacement` — required, string to replace text content matched by `pattern`.
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
 * 2. Replace node's text content, matching both node name, text and pattern by RegExp:
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
 * @added v1.9.37.
 */
/* eslint-enable max-len */
export function trustedReplaceNodeText(source, nodeName, textMatch, pattern, replacement, ...extraArgs) {
    const uboAliases = [
        'replace-node-text.js',
        'rpnt.js',
        'sed.js',
    ];

    /**
     * UBO replaceNodeText scriptlet has different signature:
     * function replaceNodeText(nodeName, pattern, replacement, ...extraArgs) {...}
     *
     * with extra params being passed as ['paramname', paramvalue]
     */
    if (uboAliases.includes(source.name)) {
        replacement = pattern;
        pattern = textMatch;
        // eslint-disable-next-line prefer-destructuring, prefer-rest-params
        for (let i = 0; i < extraArgs.length; i += 1) {
            const arg = extraArgs[i];
            if (arg === 'condition') {
                textMatch = extraArgs[i + 1];
                break;
            }
        }
    }

    const {
        selector,
        nodeNameMatch,
        textContentMatch,
        patternMatch,
    } = parseNodeTextParams(nodeName, textMatch, pattern);

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
            replaceNodeText(source, node, patternMatch, replacement);
        }
    });

    // Apply dedicated handler to already rendered nodes...
    if (document.documentElement) {
        handleExistingNodes(selector, handleNodes);
    }

    // and newly added nodes
    observeDocumentWithTimeout((mutations) => handleMutations(mutations, handleNodes), {
        childList: true,
        subtree: true,
    });
}

trustedReplaceNodeText.names = [
    'trusted-replace-node-text',
    // trusted scriptlets support no aliases
];

trustedReplaceNodeText.injections = [
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
];
