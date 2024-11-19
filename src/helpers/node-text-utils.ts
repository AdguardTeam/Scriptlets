import { hit } from './hit';
import { nodeListToArray } from './array-utils';
import { getAddedNodes } from './observer';
import { toRegExp } from './string-utils';
import { type Source } from '../scriptlets';
import { createTrustedScript } from './trusted-types-utils';

type NodeHandler = (nodes: Node[]) => void;

/**
 * Grabs existing nodes and passes them to a given handler.
 *
 * @param selector CSS selector to find nodes by
 * @param handler handler to pass nodes to
 * @param parentSelector CSS selector to find parent nodes by
 */
export const handleExistingNodes = (
    selector: string,
    handler: NodeHandler,
    parentSelector?: string,
): void => {
    /**
     * Processes nodes within a given parent element based on the provided selector.
     * If the selector is '#text', it will filter and handle text nodes.
     * Otherwise, it will handle elements that match the provided selector.
     *
     * @param parent Parent node in which to search for nodes.
     */
    const processNodes = (parent: ParentNode) => {
        // If the selector is '#text', filter and handle text nodes.
        if (selector === '#text') {
            const textNodes = nodeListToArray(parent.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE);
            handler(textNodes);
        } else {
            // Handle elements that match the provided selector
            const nodes = nodeListToArray(parent.querySelectorAll(selector));
            handler(nodes);
        }
    };
    // If a parent selector is provided, process nodes within each parent element.
    // If not, process nodes within the document.
    const parents = parentSelector ? document.querySelectorAll(parentSelector) : [document];
    parents.forEach((parent) => processNodes(parent));
};

/**
 * Extracts added nodes from mutations and passes them to a given handler.
 *
 * @param mutations mutations to find eligible nodes in
 * @param handler handler to pass eligible nodes to
 * @param selector CSS selector to find nodes by
 * @param parentSelector CSS selector to find parent nodes by
 */
export const handleMutations = (
    mutations: MutationRecord[],
    handler: NodeHandler,
    selector?: string,
    parentSelector?: string,
): void => {
    const addedNodes = getAddedNodes(mutations);
    if (selector && parentSelector) {
        addedNodes.forEach(() => {
            handleExistingNodes(selector, handler, parentSelector);
        });
    } else {
        handler(addedNodes);
    }
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
        let modifiedText = textContent.replace(pattern, replacement);

        // For websites that use Trusted Types
        // https://w3c.github.io/webappsec-trusted-types/dist/spec/
        if (node.nodeName === 'SCRIPT') {
            modifiedText = createTrustedScript(source, modifiedText);
        }

        node.textContent = modifiedText;

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
