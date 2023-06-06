import { hit } from './hit';
import { nodeListToArray } from './array-utils';
import { getAddedNodes } from './observer';
import { toRegExp } from './string-utils';

/**
 * Grabs existing nodes and passes them to a given handler.
 *
 * @param {string} selector CSS selector to find nodes by
 * @param {Function} handler handler to pass nodes to
 */
export const handleExistingNodes = (selector, handler) => {
    const nodeList = document.querySelectorAll(selector);
    const nodes = nodeListToArray(nodeList);
    handler(nodes);
};

/**
 * Extracts added nodes from mutations and passes them to a given handler.
 *
 * @param {MutationRecord[]} mutations mutations to find eligible nodes in
 * @param {Function} handler handler to pass eligible nodes to
 */
export const handleMutations = (mutations, handler) => {
    const addedNodes = getAddedNodes(mutations);
    handler(addedNodes);
};

/**
 * Checks if given node's text content should be replaced
 *
 * @param {Node} node  node to check
 * @param {RegExp|string} nodeNameMatch regexp or string to match node name
 * @param {RegExp|string} textContentMatch regexp or string to match node's text content
 * @returns {boolean} true if node's text content should be replaced
 */
export const isTargetNode = (
    node,
    nodeNameMatch,
    textContentMatch,
) => {
    const { nodeName, textContent } = node;
    const nodeNameLowerCase = nodeName.toLowerCase();
    return textContent !== ''
        && (nodeNameMatch instanceof RegExp
            ? nodeNameMatch.test(nodeNameLowerCase)
            : nodeNameMatch === nodeNameLowerCase
        )
        && (textContentMatch instanceof RegExp
            ? textContentMatch.test(textContent)
            : textContent.includes(textContentMatch)
        );
};

/**
 * Replaces given node's text content with a given replacement.
 *
 * @param {string} source source of the scriptlet
 * @param {Node} node node to replace text content in
 * @param {RegExp|string} pattern pattern to match text content
 * @param {string} replacement replacement for matched text content
 */
export const replaceNodeText = (source, node, pattern, replacement) => {
    node.textContent = node.textContent.replace(pattern, replacement);
    hit(source);
};

/**
 * Modifies arguments for trusted-replace-node-text and remove-node-text scriptlets
 *
 * @param {string} nodeName string or stringified regexp to match node name
 * @param {string} textMatch string or stringified regexp to match node's text content
 * @param {string} pattern string or stringified regexp to match replace pattern
 * @returns {Object} derivative params
 */
export const parseNodeTextParams = (nodeName, textMatch, pattern = null) => {
    const REGEXP_START_MARKER = '/';

    const isStringNameMatch = !(nodeName.startsWith(REGEXP_START_MARKER) && nodeName.endsWith(REGEXP_START_MARKER));
    const selector = isStringNameMatch ? nodeName : '*';
    const nodeNameMatch = isStringNameMatch
        ? nodeName
        : toRegExp(nodeName);
    const textContentMatch = !textMatch.startsWith(REGEXP_START_MARKER)
        ? textMatch
        : toRegExp(textMatch);

    let patternMatch;
    if (pattern) {
        patternMatch = !pattern.startsWith(REGEXP_START_MARKER)
            ? pattern
            : toRegExp(pattern);
    }

    return {
        selector,
        nodeNameMatch,
        textContentMatch,
        patternMatch,
    };
};
