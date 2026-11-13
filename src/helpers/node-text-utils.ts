import { hit } from './hit';
import { nodeListToArray } from './array-utils';
import { toRegExp } from './string-utils';
import { type Source } from '../scriptlets';
import { getTrustedTypesApi, type PolicyApi } from './trusted-types-utils';
import { logMessage } from './log-message';
import { parseUboOptions, uboPatternToRegExp } from './ubo-utils';

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

/**
 * Settings of `replaceNodesText()`, which are parsed from the arguments of a scriptlet once,
 * by `getAdgNodeTextReplacement()` or `getUboNodeTextReplacement()`.
 */
export interface NodeTextReplacement {
    /**
     * Checks whether the text of a node with the name, e.g. `SCRIPT` or `#text`, may be replaced.
     */
    isTargetNodeName: (nodeName: string) => boolean;

    /**
     * Returns the replaced text of a node, or `null` if the text is not matched,
     * e.g. by the pattern, `textMatch`, `includes` or `excludes`.
     */
    getModifiedText: (text: string) => string | null;

    /**
     * Maximum number of nodes whose text is matched.
     */
    sedCount: number;

    /**
     * If true, added nodes are processed until the page is unloaded.
     */
    stay: boolean;

    /**
     * Milliseconds after the document is interactive, i.e. `DOMContentLoaded`,
     * during which added nodes are processed, or `null` for the default time.
     */
    quitAfter: number | null;

    /**
     * Default time in milliseconds since the scriptlet has run, during which added nodes are processed,
     * or `null` to process them until the document is interactive.
     */
    timeout: number | null;

    /**
     * If true, nodes in the content of `<template>` elements are processed as well.
     */
    shouldHandleTemplates: boolean;

    /**
     * If true, the original and the modified text are logged.
     */
    shouldLog: boolean;

    /**
     * Returns the nodes whose text may be replaced, e.g. the text nodes of the elements
     * matched by `parentSelector` of `remove-node-text`, or `null` to find them in the document.
     * If set, it is called for the present nodes and again on each addition of nodes,
     * instead of processing the added nodes, so the replacement has to be idempotent,
     * e.g. removing the whole text.
     */
    findTargetNodes: (() => Node[]) | null;
}

/**
 * Parses the arguments of AdGuard `trusted-replace-node-text`. Positional arguments are parsed
 * by `parseNodeTextParams()`, so they are matched as before the options have been added:
 * - `nodeName` — lowercase node name, or a regular expression matched against it;
 * - `textMatch` — string or regular expression which the text has to contain, the text must not be empty;
 * - `pattern` — the first occurrence of a string, or a regular expression with its own flags;
 * - `replacement` — text to replace with, may contain `$1` etc.
 *
 * Extra arguments may be `verbose` and the options `excludes`, `sedCount`, `stay` and `quitAfter`,
 * each followed by its value, e.g. `'sedCount', '1'`. Added nodes are processed for 10 seconds by default.
 *
 * Requires `logMessage`, `parseNodeTextParams` and `toRegExp` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param nodeName Node name, or a regular expression to match it.
 * @param textMatch Text which the node has to contain, or a regular expression to match it.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param extraArgs Extra arguments, i.e. `verbose` and options.
 *
 * @returns Settings of the replacement, or `null` if an option is invalid, which is logged.
 */
export const getAdgNodeTextReplacement = (
    source: Source,
    nodeName: string,
    textMatch: string,
    pattern: string,
    replacement: string,
    extraArgs: unknown[],
): NodeTextReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const VERBOSE_ARG = 'verbose';
    const OPTION_NAMES = ['excludes', 'sedCount', 'stay', 'quitAfter'];
    const DIGITS_REGEXP = /^\d+$/;
    const REGEXP_START_MARKER = '/';
    // Default time of processing added nodes, since the scriptlet has run
    const DEFAULT_TIMEOUT_MS = 10000;

    // Remove quotes' escapes for cases where scriptlet rule argument has own escaped quotes
    // https://github.com/AdguardTeam/Scriptlets/issues/440
    const fixQuotes = (str: unknown): unknown => {
        if (typeof str !== 'string') {
            return str;
        }
        return str
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"');
    };

    const fixedPattern = fixQuotes(pattern) as string;
    const fixedReplacement = fixQuotes(replacement) as string;

    const {
        nodeNameMatch,
        textContentMatch,
        patternMatch,
    } = parseNodeTextParams(nodeName, textMatch, fixedPattern);

    // `verbose` may be at any position, and each option is followed by its value
    let shouldLog = false;
    const options: Record<string, string> = Object.create(null);
    for (let i = 0; i < extraArgs.length; i += 1) {
        const arg = extraArgs[i];
        if (typeof arg === 'string' && OPTION_NAMES.includes(arg) && i + 1 < extraArgs.length) {
            options[arg] = String(extraArgs[i + 1]);
            i += 1;
        } else if (arg === VERBOSE_ARG) {
            shouldLog = true;
        }
    }

    const { excludes, sedCount, quitAfter } = options;
    if (
        (typeof sedCount !== 'undefined' && (!DIGITS_REGEXP.test(sedCount) || parseInt(sedCount, 10) === 0))
        || (typeof quitAfter !== 'undefined' && !DIGITS_REGEXP.test(quitAfter))
    ) {
        logMessage(source, `Invalid option value: sedCount '${sedCount}', quitAfter '${quitAfter}'`);
        return null;
    }

    let excludesMatch: RegExp | string | null = null;
    if (typeof excludes !== 'undefined' && excludes !== '') {
        excludesMatch = excludes.startsWith(REGEXP_START_MARKER) ? toRegExp(excludes) : excludes;
    }

    /**
     * Checks whether the text contains a string or is matched by a regular expression.
     *
     * @param text Text to check.
     * @param match String or regular expression.
     *
     * @returns True if the text is matched.
     */
    const isMatched = (text: string, match: RegExp | string): boolean => {
        if (match instanceof RegExp) {
            match.lastIndex = 0;
            return match.test(text);
        }
        return text.includes(match);
    };

    return {
        isTargetNodeName: (name: string): boolean => {
            const lowerCaseName = name.toLowerCase();
            if (nodeNameMatch instanceof RegExp) {
                nodeNameMatch.lastIndex = 0;
                return nodeNameMatch.test(lowerCaseName);
            }
            return nodeNameMatch === lowerCaseName;
        },
        getModifiedText: (text: string): string | null => {
            if (
                text === ''
                || !isMatched(text, textContentMatch)
                || (excludesMatch !== null && isMatched(text, excludesMatch))
                || typeof patternMatch === 'undefined'
                || !isMatched(text, patternMatch)
            ) {
                return null;
            }
            if (patternMatch instanceof RegExp) {
                patternMatch.lastIndex = 0;
            }
            return text.replace(patternMatch, fixedReplacement);
        },
        sedCount: typeof sedCount !== 'undefined' ? parseInt(sedCount, 10) : Number.MAX_SAFE_INTEGER,
        stay: typeof options.stay !== 'undefined' && options.stay !== '' && options.stay !== '0',
        quitAfter: typeof quitAfter !== 'undefined' ? parseInt(quitAfter, 10) : null,
        timeout: DEFAULT_TIMEOUT_MS,
        shouldHandleTemplates: false,
        shouldLog,
        findTargetNodes: null,
    };
};

/**
 * Parses the arguments of uBO `trusted-replace-node-text`, i.e. of rules converted from uBO syntax,
 * as uBO `replaceNodeTextFn()` does. They differ from AdGuard arguments:
 * - `nodeName` is matched against the whole node name, case-insensitively, e.g. `script` or `#text`,
 *   or by a regular expression;
 * - there is no `textMatch`, the node is processed if `pattern` matches its text;
 * - a literal `pattern` replaces all its occurrences, a regular expression uses its own flags,
 *   and an empty one replaces the whole text;
 * - named options follow `replacement`:
 *     - `includes, value` or `condition, value` — the text has to match it;
 *     - `excludes, value` — the text must not match it;
 *     - `sedCount, n` — at most `n` nodes are processed;
 *     - `stay, 1` — nodes are processed until the page is unloaded;
 *     - `quitAfter, ms` — nodes are processed for `ms` after the document is interactive.
 *
 * By default added nodes are processed until the document is interactive, i.e. `DOMContentLoaded`, as in uBO,
 * and so are nodes in the content of templates. Unlike uBO, which matches any text by an invalid regular expression,
 * it logs it and the rule is not applied. As in uBO, an invalid `sedCount` or `quitAfter` is ignored.
 *
 * Requires `logMessage`, `parseUboOptions` and `uboPatternToRegExp` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param nodeName Node name, or a regular expression to match it.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with, may contain `$1` etc. if `pattern` is a regular expression.
 * @param args Named options which follow `replacement`, e.g. `['sedCount', '1']`.
 *
 * @returns Settings of the replacement, or `null` if a regular expression is invalid, which is logged.
 */
export const getUboNodeTextReplacement = (
    source: Source,
    nodeName: string,
    pattern: string,
    replacement: string,
    args: unknown[],
): NodeTextReplacement | null => {
    const options = parseUboOptions(args);

    const includes = options.includes || options.condition;
    const { excludes } = options;

    const nodeNameRegExp = uboPatternToRegExp(nodeName, 'i', true);
    const patternRegExp = uboPatternToRegExp(pattern, 'gms');
    const includesRegExp = includes ? uboPatternToRegExp(String(includes), 'ms') : null;
    const excludesRegExp = excludes ? uboPatternToRegExp(String(excludes), 'ms') : null;

    if (
        nodeNameRegExp === null
        || patternRegExp === null
        || (includes && includesRegExp === null)
        || (excludes && excludesRegExp === null)
    ) {
        logMessage(source, 'Invalid regular expression in arguments');
        return null;
    }

    /**
     * Checks whether the text is matched by the regular expression, regardless of its previous matches.
     *
     * @param regexp Regular expression.
     * @param text Text to check.
     *
     * @returns True if the text is matched.
     */
    const test = (regexp: RegExp, text: string): boolean => {
        regexp.lastIndex = 0;
        return regexp.test(text);
    };

    return {
        isTargetNodeName: (name: string): boolean => test(nodeNameRegExp, name),
        getModifiedText: (text: string): string | null => {
            if (
                (includesRegExp !== null && !test(includesRegExp, text))
                || (excludesRegExp !== null && test(excludesRegExp, text))
                || !test(patternRegExp, text)
            ) {
                return null;
            }
            patternRegExp.lastIndex = 0;
            return pattern !== '' ? text.replace(patternRegExp, replacement) : replacement;
        },
        sedCount: typeof options.sedCount === 'number' && options.sedCount > 0
            ? options.sedCount
            : Number.MAX_SAFE_INTEGER,
        stay: !!options.stay,
        quitAfter: typeof options.quitAfter === 'number' ? options.quitAfter : null,
        timeout: null,
        shouldHandleTemplates: true,
        shouldLog: true,
        findTargetNodes: null,
    };
};

/**
 * Replaces the text of DOM nodes, which are present when the scriptlet runs and which are added later,
 * by the settings parsed from the arguments of `trusted-replace-node-text`:
 * - present elements and text nodes are found in document order, skipping the currently running script,
 *   or by `findTargetNodes` if it is set;
 * - added nodes are processed while the scriptlet's own changes are not observed,
 *   or the nodes are found by `findTargetNodes` again;
 * - a node is written only if its text has changed, and then `hit()` is called;
 * - an error of processing a node is logged once for the node, and other nodes are still processed;
 * - processing stops once `sedCount` nodes have been matched, and otherwise after `timeout`,
 *   or `quitAfter` after the document is interactive, or when it is interactive, unless `stay` is set.
 *
 * Requires `hit`, `logMessage` and `getTrustedTypesApi` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param replacement Settings of the replacement.
 */
export const replaceNodesText = (source: Source, replacement: NodeTextReplacement): void => {
    const {
        isTargetNodeName,
        getModifiedText,
        stay,
        quitAfter,
        timeout,
        shouldHandleTemplates,
        shouldLog,
        findTargetNodes,
    } = replacement;

    let { sedCount } = replacement;

    // Trusted Types policy is created once, only for the first script whose text is replaced,
    // as the page may disallow it, e.g. by `trusted-types 'none'` in CSP,
    // which should not prevent replacing the text of other nodes
    let trustedTypesApi: PolicyApi | null = null;
    let isTrustedTypesPolicyFailed = false;

    /**
     * Returns the text to set to a script, as `TrustedScript` if the policy can be created.
     * Otherwise the text is returned as is, which can still be set if the page does not require
     * Trusted Types for scripts, and if it does, setting it throws, which is handled for the node.
     *
     * @param text Text of the script.
     *
     * @returns Text of the script, as `TrustedScript` if possible.
     */
    const getScriptText = (text: string): string => {
        if (trustedTypesApi === null && !isTrustedTypesPolicyFailed) {
            try {
                trustedTypesApi = getTrustedTypesApi(source);
            } catch (e) {
                isTrustedTypesPolicyFailed = true;
                logMessage(source, 'Trusted Types policy cannot be created, script text is set as is');
            }
        }
        return trustedTypesApi !== null ? trustedTypesApi.createScript(text) : text;
    };

    // Nodes whose processing has failed, so that the error is logged once for each node
    const failedNodes = new WeakSet<Node>();

    const handleNode = (node: Node): void => {
        try {
            const text = node.textContent;
            if (text === null) {
                return;
            }
            const modifiedText = getModifiedText(text);
            if (modifiedText === null) {
                return;
            }
            sedCount -= 1;
            if (modifiedText === text) {
                return;
            }
            if (shouldLog) {
                logMessage(source, `Original text content: ${text}`);
            }
            // For websites that use Trusted Types
            // https://w3c.github.io/webappsec-trusted-types/dist/spec/
            node.textContent = node.nodeName === 'SCRIPT'
                ? getScriptText(modifiedText)
                : modifiedText;
            hit(source);
            if (shouldLog) {
                logMessage(source, `Modified text content: ${modifiedText}`);
            }
        } catch (e) {
            if (!failedNodes.has(node)) {
                failedNodes.add(node);
                logMessage(source, `Failed to replace text of node: ${node.nodeName}`);
            }
        }
    };

    /**
     * Processes the matched node, or the nodes in the content of a template.
     *
     * @param node Node to process.
     */
    const handleMatchedNode = (node: Node): void => {
        if (isTargetNodeName(node.nodeName)) {
            handleNode(node);
        } else if (shouldHandleTemplates && node.nodeName === 'TEMPLATE') {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            handleTree((node as HTMLTemplateElement).content);
        }
    };

    /**
     * Processes the elements and text nodes of a tree in document order.
     *
     * @param root Root of the tree.
     */
    const handleTree = (root: Node): void => {
        // eslint-disable-next-line no-bitwise
        const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        const { currentScript } = document;
        let node = treeWalker.nextNode();
        while (node !== null && sedCount > 0) {
            if (node !== currentScript) {
                handleMatchedNode(node);
            }
            node = treeWalker.nextNode();
        }
    };

    /**
     * Processes the nodes returned by `findTargetNodes`.
     *
     * @param find Function which returns the nodes.
     */
    const handleFoundNodes = (find: () => Node[]): void => {
        const nodes = find();
        const { currentScript } = document;
        for (let i = 0; i < nodes.length && sedCount > 0; i += 1) {
            if (nodes[i] !== currentScript && isTargetNodeName(nodes[i].nodeName)) {
                handleNode(nodes[i]);
            }
        }
    };

    if (findTargetNodes !== null) {
        handleFoundNodes(findTargetNodes);
    } else if (document.documentElement) {
        handleTree(document.documentElement);
    }

    if (sedCount <= 0) {
        return;
    }

    let observer: MutationObserver | null = null;

    const handleAddedNodes = (mutations: MutationRecord[]): void => {
        if (findTargetNodes !== null) {
            // The nodes are found again once for all the added ones
            if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
                handleFoundNodes(findTargetNodes);
            }
            return;
        }
        for (let i = 0; i < mutations.length; i += 1) {
            const { addedNodes } = mutations[i];
            for (let j = 0; j < addedNodes.length; j += 1) {
                handleMatchedNode(addedNodes[j]);
                if (sedCount <= 0) {
                    return;
                }
            }
        }
    };

    /**
     * Stops processing of added nodes, after the ones added so far are processed.
     */
    const stop = (): void => {
        if (observer === null) {
            return;
        }
        const mutations = observer.takeRecords();
        observer.disconnect();
        observer = null;
        handleAddedNodes(mutations);
    };

    const options = { childList: true, subtree: true };
    observer = new MutationObserver((mutations) => {
        if (observer === null) {
            return;
        }
        // The scriptlet's own changes are not observed
        observer.disconnect();
        handleAddedNodes(mutations);
        if (sedCount <= 0) {
            observer = null;
            return;
        }
        observer.observe(document, options);
    });
    observer.observe(document, options);

    if (stay) {
        return;
    }

    if (quitAfter === null && timeout !== null) {
        setTimeout(stop, timeout);
        return;
    }

    const quit = (): void => {
        if (quitAfter) {
            setTimeout(stop, quitAfter);
        } else {
            stop();
        }
    };

    // Stop when the document is interactive, i.e. on `DOMContentLoaded`, or now if it is already
    if (document.readyState !== 'loading') {
        quit();
        return;
    }
    const onReadyStateChange = (): void => {
        if (document.readyState === 'loading') {
            return;
        }
        document.removeEventListener('readystatechange', onReadyStateChange, true);
        quit();
    };
    document.addEventListener('readystatechange', onReadyStateChange, true);
};
