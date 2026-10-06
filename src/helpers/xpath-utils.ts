/**
 * Checks whether the given string is a valid XPath expression which selects nodes.
 * Expression is evaluated against the only element of a separate document,
 * so the check does not traverse the page DOM, but predicates of steps which may select
 * this element are checked, e.g. type error in `descendant-or-self::*[count(1)]` is detected.
 * An element of the page document is not used, as Chromium resolves `id()` from it against the page,
 * even if the element is detached.
 *
 * @param expression XPath expression to check.
 *
 * @returns True if the expression is valid, false otherwise,
 * e.g. on syntax error or if it returns a number, like `count(//div)`.
 */
export const isValidXpath = (expression: string): boolean => {
    try {
        const validationDocument = document.implementation.createDocument(null, 'x');
        validationDocument.evaluate(
            expression,
            validationDocument.documentElement,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null,
        );
        return true;
    } catch {
        return false;
    }
};

/**
 * Checks whether the XPath expression contains an absolute location path, e.g. `//button`,
 * anywhere in it, e.g. in a union, a predicate or a function argument.
 * Inside shadow DOM, Chromium evaluates absolute paths against the document,
 * but Firefox evaluates them against the shadow root.
 *
 * Expression is split into tokens as defined by XPath 1.0, see https://www.w3.org/TR/xpath-10/#exprlex.
 * `/` or `//` starts an absolute path unless it follows a token which ends an operand,
 * e.g. a name test, a literal or `)`, as then it separates location steps, e.g. in `div/button`.
 * Likewise, a name or `*` which follows such a token is an operator, e.g. `and` or multiplication,
 * otherwise it is a name test, e.g. `and` in `div[and/button]`.
 *
 * @param expression XPath expression to check, should be validated before, e.g. by `isValidXpath()`.
 *
 * @returns True if the expression contains an absolute location path, false otherwise.
 */
export const hasAbsoluteXpath = (expression: string): boolean => {
    // Characters which cannot be a part of a name, in a form for a regexp character class
    const NON_NAME_CHARS = '\\s"\'()[\\]@,|/=<>!+*$:';
    const TOKEN_PATTERNS = [
        // 1: name, which cannot start with `-`, `.` or a digit, or `*`
        `([^${NON_NAME_CHARS}\\-.\\d][^${NON_NAME_CHARS}]*|\\*)`,
        // 2: `//` or `/`
        '(\\/\\/?)',
        // 3: token which ends an operand: literal, number, `..` or `.`, `)` or `]`
        '("[^"]*"|\'[^\']*\'|\\d+(?:\\.\\d*)?|\\.\\d+|\\.\\.?|[)\\]])',
        // `::`, `!=`, `<=` or `>=`, or any other single character
        '::|[!<>]=|\\S',
    ];
    const TOKEN_REGEXP = new RegExp(`\\s*(?:${TOKEN_PATTERNS.join('|')})`, 'g');

    // Whether the previous token ends an operand
    let isAfterOperand = false;
    let match = TOKEN_REGEXP.exec(expression);
    while (match) {
        const nameOrWildcard = match[1];
        const pathSeparator = match[2];
        const operandEnd = match[3];
        if (pathSeparator) {
            if (!isAfterOperand) {
                return true;
            }
            isAfterOperand = false;
        } else if (nameOrWildcard) {
            // Operator after an operand, which is followed by another operand,
            // otherwise name test, which ends an operand
            isAfterOperand = !isAfterOperand;
        } else {
            isAfterOperand = !!operandEnd;
        }
        match = TOKEN_REGEXP.exec(expression);
    }

    return false;
};

/**
 * Returns XPath expression of the selector wrapped in `xpath(...)`.
 *
 * @param selector Trimmed selector, e.g. `xpath(//button)` or `div > button`.
 *
 * @returns XPath expression, e.g. `//button`, or null if the selector is not an XPath one.
 * If the closing parenthesis is missing, empty string is returned, as it is not a valid XPath expression.
 */
export const getXpathExpression = (selector: string): string | null => {
    const XPATH_MARKER = 'xpath(';
    if (!selector.startsWith(XPATH_MARKER)) {
        return null;
    }
    return selector.endsWith(')')
        ? selector.slice(XPATH_MARKER.length, -1)
        : '';
};

/**
 * Evaluates XPath expression and returns the selected elements.
 * Other selected nodes, e.g. text nodes or attributes, are skipped.
 * If evaluation fails, e.g. on type error in a predicate like `//button[count(1)]`,
 * which may not be detected by `isValidXpath()`, nothing is selected by this evaluation,
 * so a union selects elements of its other parts until an element causing the error appears,
 * and inside a shadow root, the elements of other top-level elements are still selected.
 *
 * Shadow root cannot be an XPath context node, so the expression is evaluated
 * against each of its top-level elements. It should be relative, e.g. `descendant-or-self::button`,
 * and should not contain absolute paths, which are evaluated differently by browsers,
 * see `hasAbsoluteXpath()`. Nodes outside of the shadow tree are skipped anyway.
 * Positional predicates, e.g. `[last()]` or `(...)[2]`, are applied to each top-level element separately.
 *
 * @param expression XPath expression, should be validated before, e.g. by `isValidXpath()`.
 * @param context Element or shadow root to evaluate the expression against.
 *
 * @returns Selected elements, in document order if the context is an element.
 */
export const getXpathElements = (
    expression: string,
    context: Element | ShadowRoot,
): Element[] => {
    const isShadowRoot = context.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
    const contextNodes: Node[] = isShadowRoot
        ? Array.from(context.children)
        : [context];

    const elements: Element[] = [];
    // Same element may be selected from different top-level elements of the shadow root,
    // e.g. by `following-sibling::` axis
    const foundElements = new Set<Node>();
    contextNodes.forEach((contextNode) => {
        let result: XPathResult;
        try {
            result = document.evaluate(
                expression,
                contextNode,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null,
            );
        } catch {
            // Otherwise the error would be thrown on each DOM change
            return;
        }
        for (let i = 0; i < result.snapshotLength; i += 1) {
            const node = result.snapshotItem(i);
            if (
                !node
                || node.nodeType !== Node.ELEMENT_NODE
                || (isShadowRoot && node.getRootNode() !== context)
                || foundElements.has(node)
            ) {
                continue;
            }
            foundElements.add(node);
            elements.push(node as Element);
        }
    });

    return elements;
};
