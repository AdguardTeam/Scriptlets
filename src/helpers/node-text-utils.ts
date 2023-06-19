import { hit } from './hit';
import { nodeListToArray } from './array-utils';
import { getAddedNodes } from './observer';
import { toRegExp } from './string-utils';

type NodeHandler = (nodes: Node[]) => void;

/**
 * Grabs existing nodes and passes them to a given handler.
 *
 * @param selector CSS selector to find nodes by
 * @param handler handler to pass nodes to
 */
export const handleExistingNodes = (
    selector: string,
    handler: NodeHandler,
): void => {
    const nodeList = document.querySelectorAll(selector);
    const nodes = nodeListToArray(nodeList);
    handler(nodes);
};

/**
 * Extracts added nodes from mutations and passes them to a given handler.
 *
 * @param mutations mutations to find eligible nodes in
 * @param handler handler to pass eligible nodes to
 */
export const handleMutations = (
    mutations: MutationRecord[],
    handler: NodeHandler,
): void => {
    const addedNodes = getAddedNodes(mutations);
    handler(addedNodes);
};

/**
 * Checks if given node's text content should be replaced
 *
 * @param node  node to check
 * @param nodeNameMatch regexp or string to match node name
 * @param textContentMatch regexp or string to match node's text content
 * @returns true if node's text content should be replaced
 */
export const isTargetNode = (
    node: Node,
    nodeNameMatch: RegExp | string,
    textContentMatch: RegExp | string,
): boolean => {
    const { nodeName, textContent } = node;
    const nodeNameLowerCase = nodeName.toLowerCase();
    return textContent !== null
        && textContent !== ''
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
 * @param source source of the scriptlet
 * @param node node to replace text content in
 * @param pattern pattern to match text content
 * @param replacement replacement for matched text content
 */
export const replaceNodeText = (
    source: Source,
    node: Node,
    pattern: RegExp | string,
    replacement: string,
): void => {
    const { textContent } = node;
    if (textContent) {
        node.textContent = textContent.replace(pattern, replacement);
        hit(source);
    }
};

/**
 * Modifies arguments for trusted-replace-node-text and remove-node-text scriptlets
 *
 * @param nodeName string or stringified regexp to match node name
 * @param textMatch string or stringified regexp to match node's text content
 * @param pattern string or stringified regexp to match replace pattern
 * @returns derivative params
 */
export const parseNodeTextParams = (
    nodeName: string,
    textMatch: string,
    pattern: string | null = null,
) => {
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
