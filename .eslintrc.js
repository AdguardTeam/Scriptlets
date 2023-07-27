const path = require('path');

module.exports = {
    parser: '@babel/eslint-parser',
    parserOptions: {
        babelOptions: {
            rootMode: 'upward',
        },
    },
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
                project: 'tsconfig.eslint.json',
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
        'import/prefer-default-export': 0,
        'no-continue': 0,
        'no-await-in-loop': 0,
        'max-len': ['error', { code: 120, ignoreUrls: true }],
        'arrow-body-style': 0,
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
        'no-constant-condition': ['error', { checkLoops: false }],
        // jsdoc rules
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
        'jsdoc/require-returns-description': 0,
    },
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                tsconfigRootDir: path.join(__dirname),
                project: 'tsconfig.eslint.json',
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
    ],
};
