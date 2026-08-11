module.exports = {
    extends: [
        '../.eslintrc.cjs',
    ],
    // QUnit/Puppeteer runtime deps live in the tests workspace package
    // (tests/package.json); CI's lint stage installs only the root package
    // via `pnpm install --filter @adguard/scriptlets`, so these modules are
    // not resolvable there. Treat them as core modules to skip resolution,
    // scoped to tests/ via this directory-level config.
    settings: {
        'import/core-modules': [
            'puppeteer',
            'node-qunit-puppeteer',
        ],
    },
    rules: {
        'jsdoc/require-jsdoc': 0,
        'function-paren-newline': 'off',
        'import/no-extraneous-dependencies': 'off',
        // tests/ is a pnpm workspace package only to own the QUnit/Puppeteer
        // runtime deps — it is not a real package boundary, so relative
        // imports from tests into src/ remain fine here.
        'import/no-relative-packages': 0,
    },
};
