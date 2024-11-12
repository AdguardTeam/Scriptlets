const SPEC_IMPORT = 'ImportSpecifier';
const SPEC_DEFAULT_IMPORT = 'ImportDefaultSpecifier';
const SPEC_NAMESPACE_IMPORT = 'ImportNamespaceSpecifier';
const nonSplittableImportTypes = new Set([SPEC_DEFAULT_IMPORT, SPEC_NAMESPACE_IMPORT]);

const applyAliasAndType = (currentNode) => {
  const localName = currentNode.local.name;
  if (!currentNode.imported) {
    return localName;
  }
  const importedName = currentNode.imported.name;
  const importedNameWithPrefix = currentNode.imported.parent.importKind === 'type'
    ? `type ${importedName}`
    : importedName;
  return importedName !== localName
    ? `${importedNameWithPrefix} as ${localName}`
    : importedNameWithPrefix;
};

const outputComment = (commentNode) => {
  const commentNodeType = commentNode && commentNode.type;
  switch (commentNodeType) {
    case 'Block':
      return `\n\n/*${commentNode.value}*/\n`;
    case 'Line':
      return `\n\n//${commentNode.value}\n`;
    default:
      return '';
  }
};

const getCommentLineCount = (commentNode) => {
  let newLineCount = 0;
  if (commentNode) {
    const newLinesInComment = commentNode.value.match(/\n/g);
    if (Array.isArray(newLinesInComment)) {
      newLineCount = newLinesInComment.length;
    }
  }
  return 1 + newLineCount;
};

const getCommentsInsideImport = (node) => {
  const comments = [];
  if (node.parent.comments) {
    const [nodeStartPos, nodeEndPos] = node.range;
    node.parent.comments.some((comment) => {
      const [commentStartPos] = comment.range;
      if (commentStartPos > nodeEndPos) {
        // Comments after the import are ignored
        return true;
      }

      if (commentStartPos > nodeStartPos) {
        // The comment starts inside the import
        comments.push(comment);
      }
      return false;
    });
  }
  return comments;
};

/**
 * Special case for when semicolons are omitted in code style but
 * there is an IIFE with a comment and a semicolon before it on
 * the next token, resulting in the comment being treated as part
 * of the import statement
 */
const findTrailingCommentInImport = (node, comments) => {
  let trailingCommentBeforeEnd = null;
  const [, nodeSourceEndPos] = node.source.range;
  comments.some((comment) => {
    const [commentStartPos] = comment.range;
    if (commentStartPos > nodeSourceEndPos) {
      // The comment starts after the import source token
      trailingCommentBeforeEnd = comment;
      return true;
    }
    return false;
  });
  return trailingCommentBeforeEnd;
};

/**
 * Special case for when there is a comment inside the import
 * between the last specifier and the source line
 */
const findCommentBeforeLastLine = (node, comments) => {
  let commentBeforeLastLine = null;
  if (node.specifiers.length > 0) {
    const lastSpecifierEndLine = node.specifiers[node.specifiers.length - 1].loc.end.line;
    const sourceLine = node.source.loc.start.line;
    comments.some((comment) => {
      const commentStartLine = comment.loc.start.line;
      if (commentStartLine > lastSpecifierEndLine) {
        const commentEndLine = comment.loc.end.line;
        if (commentEndLine < sourceLine) {
          // The comment is between the last specifier and the source line
          commentBeforeLastLine = comment;
          return true;
        }
      }
      return false;
    });
  }
  return commentBeforeLastLine;
};

const fixer = (node, semi, spacer = '\n') => (eslintFixer) => {
  const comments = getCommentsInsideImport(node);
  const trailingComment = findTrailingCommentInImport(node, comments);
  const lastLineComment = findCommentBeforeLastLine(node, comments);
  let defaultImport = '';
  let namespaceImport = '';
  const objectImports = [];
  const {
    specifiers,
    importKind,
  } = node;
  specifiers.forEach((currentNode) => {
    switch (currentNode.type) {
      case SPEC_DEFAULT_IMPORT:
        defaultImport = applyAliasAndType(currentNode);
        break;
      case SPEC_NAMESPACE_IMPORT:
        namespaceImport = `* as ${currentNode.local.name}`;
        break;
      case SPEC_IMPORT:
        objectImports.push(applyAliasAndType(currentNode));
        break;
      default:
        break;
    }
  });
  const hasObjectImports = objectImports.length > 0;
  const namespaceImportValue = namespaceImport.length > 0
    ? hasObjectImports ? `${namespaceImport}, ` : namespaceImport
    : namespaceImport;
  const defaultImportValue = defaultImport.length > 0
    ? hasObjectImports || namespaceImportValue.length > 0 ? `${defaultImport}, ` : defaultImport
    : defaultImport;
  const objectImportsValue = hasObjectImports
    ? `{${spacer}${objectImports.join(`,${spacer}`)}${spacer}}`
    : '';

  let lastLineCommentForSingleLineImport = '';
  if (lastLineComment) {
    if (hasObjectImports && spacer === '\n') {
      // If there is a last line comment, add it to the object imports
      objectImports.push(outputComment(lastLineComment)
        .trim());
    } else {
      // or if there are no object imports, as a prefix for the whole import
      lastLineCommentForSingleLineImport = outputComment(lastLineComment)
        .trimStart();
    }
  }

  const importKeyword = importKind === 'type' ? 'import type' : 'import';
  const newValue = [
    lastLineCommentForSingleLineImport,
    importKeyword,
    ' ',
    defaultImportValue,
    namespaceImportValue,
    objectImportsValue,
    ' from ',
    node.source.raw,
    outputComment(trailingComment),
    semi || trailingComment ? ';' : '',
  ].join('');
  return eslintFixer.replaceText(node, newValue);
};

const DEFAULT_ITEMS = 4;
const MIN_ITEMS = 0;
const DEFAULT_MAX_LENGTH = Infinity;
const MIN_MAX_LENGTH = 17;
const DEFAULT_SEMICOLON = true;
const DEFAULT_FORCE_SINGLE_LINE = true;
const DEFAULT_ALLOW_BLANK_LINES = false;

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce multiple lines for import statements past a certain number of items',
      category: 'Stylistic Issues',
      url: 'https://github.com/SeinopSys/eslint-plugin-import-newlines',
    },
    fixable: 'whitespace',
    schema: {
      oneOf: [
        {
          type: 'array',
          minItems: 1,
          maxItems: 1,
          items: {
            type: 'object',
            properties: {
              items: {
                type: 'number',
                minimum: 0,
              },
              'max-len': {
                type: 'number',
                minimum: 17,
              },
              semi: {
                type: 'boolean',
              },
              forceSingleLine: {
                type: 'boolean',
              },
              allowBlankLines: {
                type: 'boolean',
              },
            },
          },
        },
        {
          type: 'array',
          minItems: 0,
          maxItems: 2,
          items: {
            type: 'number',
          },
        },
      ],
    },
    messages: {
      mustSplitMany: 'Imports must be broken into multiple lines if there are more than {{maxItems}} elements.',
      mustSplitLong: 'Imports must be broken into multiple lines if the line length exceeds {{maxLineLength}} characters, saw {{lineLength}}.',
      mustNotSplit: 'Imports must not be broken into multiple lines if there are {{maxItems}} or less elements.',
      noBlankBetween: 'Import lines cannot have blank lines between them.',
      limitLineCount: 'Import lines must have one element per line. (Expected import to span {{expectedLineCount}} lines, saw {{importLineCount}})',
    },
  },
  create(context) {
    let maxItems = DEFAULT_ITEMS;
    let maxLineLength = DEFAULT_MAX_LENGTH;
    // Legacy default, prior to a refactoring this value was not set for array type configurations
    let includeSemi = false;
    let forceSingleLine = DEFAULT_FORCE_SINGLE_LINE;
    let allowBlankLines = DEFAULT_ALLOW_BLANK_LINES;
    const firstOption = context.options[0];
    if (typeof firstOption === 'object') {
      // Supported object-based configuration
      ({
        items: maxItems = DEFAULT_ITEMS,
        'max-len': maxLineLength = DEFAULT_MAX_LENGTH,
        semi: includeSemi = DEFAULT_SEMICOLON,
        forceSingleLine = DEFAULT_FORCE_SINGLE_LINE,
        allowBlankLines = DEFAULT_ALLOW_BLANK_LINES,
      } = firstOption);
    } else {
      // Legacy array-based configuration
      [
        maxItems = DEFAULT_ITEMS,
        maxLineLength = DEFAULT_MAX_LENGTH,
      ] = context.options;
    }
    if (maxItems < MIN_ITEMS) {
      throw new Error(`Minimum items must not be less than ${MIN_MAX_LENGTH}`);
    }
    if (maxLineLength < MIN_MAX_LENGTH) {
      throw new Error(`Maximum line length must not be less than ${MIN_MAX_LENGTH}`);
    }
    return {
      ImportDeclaration(node) {
        const { specifiers } = node;

        // If blank lines are allowed, skip checking them by setting this to true
        let blankLinesChecked = allowBlankLines;
        const startColumn = node.loc.start.column;
        const commentsInsideImport = getCommentsInsideImport(node);
        const commentBeforeLastLine = findCommentBeforeLastLine(node, commentsInsideImport);
        // # of lines between the start of the import statement and the end of the import source
        const linesOfActualImport = node.source.loc.end.line - node.loc.start.line;
        // We include the line count of the last line comment in the calculation
        const commentsCompensation = commentBeforeLastLine
          ? getCommentLineCount(commentBeforeLastLine)
          : 0;
        const importLineCount = 1 + linesOfActualImport - commentsCompensation;
        const importedItems = specifiers.reduce((a, c) => a + (c.type === SPEC_IMPORT ? 1 : 0), 0);

        specifiers.slice(1).forEach((currentItem, index) => {
          const previousItem = specifiers[index];
          const previousEndLine = previousItem.loc.end.line;
          const currentStartLine = currentItem.loc.start.line;
          const lineDifference = currentStartLine - previousEndLine;
          if (!blankLinesChecked && lineDifference > 1) {
            context.report({
              node,
              messageId: 'noBlankBetween',
              fix: fixer(node, includeSemi),
            });
            blankLinesChecked = true;
          }
        });

        if (!blankLinesChecked) {
          const singleLine = importLineCount === 1;
          if (singleLine) {
            const line = context.getSourceCode().getText(node);
            if (line.length > maxLineLength) {
              const canBeSplit = specifiers.length > 2
                || specifiers.some((specifier) => !nonSplittableImportTypes.has(specifier.type));
              // There's nothing we can really do about a very long line
              // that has only default and namespace imports (barring a
              // refactor of the import statement itself) so we'll just
              // ignore it.
              if (canBeSplit) {
                context.report({
                  node,
                  messageId: 'mustSplitLong',
                  data: { maxLineLength, lineLength: line.length },
                  fix: fixer(node, includeSemi),
                });
              }
              return;
            }
            if (importedItems > maxItems) {
              context.report({
                node,
                messageId: 'mustSplitMany',
                data: { maxItems },
                fix: fixer(node, includeSemi),
              });
            }
            return;
          }

          // One item per line + line with import + line with from
          const expectedLineCount = importedItems + 2;
          if (importLineCount !== expectedLineCount) {
            context.report({
              node,
              messageId: 'limitLineCount',
              data: { expectedLineCount, importLineCount },
              fix: fixer(node, includeSemi),
            });
            return;
          }

          if (forceSingleLine && importedItems <= maxItems) {
            let fixedValue;
            const fix = fixer(node, includeSemi, ' ');
            fix({
              replaceText: (_node, value) => {
                fixedValue = value;
              },
            });
            // Only enforce this rule if fixing it would not cause going over the line length limit
            if (fixedValue.length + startColumn <= maxLineLength) {
              context.report({
                node,
                messageId: 'mustNotSplit',
                data: { maxItems },
                fix,
              });
            }
          }
        }
      },
    };
  },
};
