const path = require('path');

const MAX_LINE_LENGTH = 120;

module.exports = {
    parser: '@babel/eslint-parser',
    parserOptions: {
        babelOptions: {
            rootMode: 'upward',
        },
    },
    ignorePatterns: ['tests/smoke/**'],
    env: {
        browser: true,
        qunit: true,
        jest: true,
    },
    extends: [
        'airbnb-base',
        'plugin:jsdoc/recommended',
    ],
    plugins: [
        'import',
        'import-newlines',
    ],
    settings: {
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: 'tsconfig.json',
            },
        },
    },
    rules: {
        indent: ['error', 4, {
            SwitchCase: 1,
        }],
        'import/extensions': ['error', 'never', { json: 'always' }],
        'no-param-reassign': 0,
        'no-shadow': 0,
        'no-bitwise': 0,
        'no-new': 0,
        'function-call-argument-newline': [
            'error',
            'consistent',
        ],
        'import/prefer-default-export': 0,
        'no-continue': 0,
        'no-await-in-loop': 0,
        'max-len': ['error', { code: MAX_LINE_LENGTH, ignoreUrls: true }],
        'arrow-body-style': 0,
        'import/no-extraneous-dependencies': 'off',
        'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
        'no-constant-condition': ['error', { checkLoops: false }],
        // jsdoc rules
        'jsdoc/check-param-names': 'error',
        'jsdoc/check-tag-names': ['error', {
            definedTags: [
                'scriptlet',
                'trustedScriptlet',
                'redirect',
                'added',
                'jest-environment',
            ],
        }],
        'jsdoc/tag-lines': 'off',
        'jsdoc/require-jsdoc': 0,
        'jsdoc/require-param': 0,
        'jsdoc/require-param-description': 0,
        'jsdoc/require-returns': 'off',
        'jsdoc/require-returns-description': 0,
        'jsdoc/no-defaults': 0,
        'import-newlines/enforce': ['error', { items: 3, 'max-len': MAX_LINE_LENGTH }],
        // Split external and internal imports with an empty line
        'import/order': [
            'error',
            {
                groups: [
                    ['builtin', 'external'],
                ],
                'newlines-between': 'always',
            },
        ],
        // Force proper import and export of types
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                fixStyle: 'inline-type-imports',
            },
        ],
    },
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                tsconfigRootDir: path.join(__dirname),
                project: 'tsconfig.json',
            },
            extends: [
                'airbnb-typescript/base',
            ],
            rules: {
                'jsdoc/require-param-type': 0,
                'jsdoc/require-returns-type': 0,
                '@typescript-eslint/ban-ts-comment': 0,
                '@typescript-eslint/member-delimiter-style': [
                    'error',
                    {
                        multiline: {
                            delimiter: 'semi',
                            requireLast: true,
                        },
                        singleline: {
                            delimiter: 'semi',
                            requireLast: false,
                        },
                    },
                ],
                '@typescript-eslint/no-explicit-any': 0,
                '@typescript-eslint/indent': ['error', 4],
                '@typescript-eslint/interface-name-prefix': 0,
                '@typescript-eslint/no-non-null-assertion': 0,
                '@typescript-eslint/type-annotation-spacing': [
                    'error',
                    {
                        after: true,
                    },
                ],
            },
        },
        // Array destructuring is not allowed according to the
        // ReferenceError: _slicedToArray is not defined
        {
            files: ['src/**/*.{js,ts}'],
            rules: {
                'prefer-destructuring': [
                    'error',
                    {
                        array: false,
                    },
                ],
                'no-restricted-syntax': [
                    'error',
                    'ArrayPattern',
                ],
            },
        },
    ],
};
