module.exports = {
    extends: [
        'airbnb-base',
        'plugin:jsdoc/recommended',
    ],
    parser: '@babel/eslint-parser',
    parserOptions: {
        babelOptions: {
            rootMode: 'upward',
        },
    },
    env: {
        browser: true,
        qunit: true,
    },
    rules: {
        'max-len': [
            'error',
            {
                code: 120,
                ignoreUrls: true,
            },
        ],
        indent: ['error', 4, { SwitchCase: 1 }],
        'no-param-reassign': 0,
        'no-shadow': 0,
        'import/prefer-default-export': 0,
        'arrow-body-style': 0,
        'import/no-extraneous-dependencies': 0,
        'no-continue': 'off',
        'no-await-in-loop': 0,
        'no-restricted-syntax': 0,
        // jsdoc rules
        'jsdoc/check-tag-names': ['error', { definedTags: ['scriptlet', 'trustedScriptlet', 'redirect'] }],
        'jsdoc/tag-lines': 'off',
        'jsdoc/require-jsdoc': 0,
        'jsdoc/require-param': 0,
        'jsdoc/valid-types': 0,
        'jsdoc/no-undefined-types': 0,
        'jsdoc/require-param-description': 0,
        'jsdoc/require-returns-description': 0,
    },
    settings: {
        jsdoc: {
            preferredTypes: {
                object: 'Object',
            },
        },
    },
};
