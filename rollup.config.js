import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';
import clear from 'rollup-plugin-clear';
import json from '@rollup/plugin-json';
import generateHtml from 'rollup-plugin-generate-html';

import project from './package.json';

const banner = `
/**
 * AdGuard Scriptlets
 * Version ${project.version}
 */
`;

const footer = `
/**
 * -------------------------------------------
 * |                                         |
 * |  If you want to add your own scriptlet  |
 * |  please put your code below             |
 * |                                         |
 * -------------------------------------------
 */
`;

const TESTS_DIST = 'tests/dist';
const TMP_DIR = 'tmp';
const DIST_REDIRECT_FILES = 'dist/redirect-files';

const mainConfig = {
    input: {
        scriptlets: 'src/scriptlets/scriptlets-wrapper.js',
    },
    output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        banner,
        footer,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        json({
            preferConst: true,
            indent: '  ',
            compact: true,
            namedExports: true,
        }),
        babel({
            babelHelpers: 'runtime',
        }),
    ],
};

const umdConfig = {
    input: {
        'scriptlets.umd': 'src/scriptlets/scriptlets-cjs-wrapper.js',
    },
    output: {
        dir: 'dist/umd',
        entryFileNames: '[name].js',
        // umd is preferred over cjs to avoid variables renaming in tsurlfilter
        format: 'umd',
        exports: 'named',
        strict: false,
        banner,
        footer,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        json({
            preferConst: true,
            indent: '  ',
            compact: true,
            namedExports: true,
        }),
        babel({
            babelHelpers: 'runtime',
        }),
        copy({
            targets: [
                { src: 'types/scriptlets.d.ts', dest: 'dist/umd/' },
            ],
        }),
    ],
};

const redirectsBuild = {
    input: 'src/redirects/redirects.js',
    output: {
        dir: 'dist',
        name: 'Redirects',
        format: 'iife',
        strict: false,
        banner,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        json({
            preferConst: true,
            indent: '  ',
            compact: true,
            namedExports: true,
        }),
        babel({
            babelHelpers: 'runtime',
        }),
    ],
};

const testConfig = {
    input: {
        tests: 'tests/index.test.js',
    },
    output: {
        dir: TESTS_DIST,
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        sourcemap: true,
    },
    plugins: [
        clear({
            targets: [TESTS_DIST],
        }),
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        json({
            preferConst: true,
            indent: '  ',
            compact: true,
            namedExports: true,
        }),
        babel({
            babelHelpers: 'runtime',
        }),
        copy({
            targets: [{
                src: [
                    'tests/tests.html',
                    'tests/styles.css',
                    'tests/scriptlets/fetch-objects',
                    'node_modules/qunit/qunit/qunit.js',
                    'node_modules/sinon/pkg/sinon.js',
                    'dist/scriptlets.js',
                ],
                dest: TESTS_DIST,
            }],
        }),
    ],
};

const tmpRedirectsConfig = {
    input: {
        tmpRedirects: 'src/redirects/redirects-wrapper.js',
    },
    output: {
        name: 'tmpRedirects',
        dir: TMP_DIR,
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        json({
            preferConst: true,
            indent: '  ',
            compact: true,
            namedExports: true,
        }),
        babel({
            babelHelpers: 'runtime',
        }),
    ],
};

const clickToLoadConfig = {
    input: 'src/redirects/blocking-redirects/click2load.js',
    output: {
        dir: DIST_REDIRECT_FILES,
        name: 'click2load',
        format: 'iife',
    },
    plugins: [
        resolve(),
        babel({ babelHelpers: 'runtime' }),
        cleanup(),
        generateHtml({
            filename: `${DIST_REDIRECT_FILES}/click2load.html`,
            template: 'src/redirects/blocking-redirects/click2load.html',
            selector: 'body',
            inline: true,
        }),
    ],
};

/**
 * We need extra script file to calculate sha256 for extension.
 * Since using generateHtml will bundle and inline script code to html webpage
 * but no dist file will be created, clickToLoadScriptConfig is needed separately.
 * The extra script file will be removed from dist/redirect-files later while redirects.build.js run
 */
const clickToLoadScriptConfig = {
    input: 'src/redirects/blocking-redirects/click2load.js',
    output: {
        dir: DIST_REDIRECT_FILES,
        name: 'click2load',
        format: 'iife',
    },
    plugins: [
        resolve(),
        babel({ babelHelpers: 'runtime' }),
        cleanup(),
    ],
};

const isCleanBuild = process.env.CLEAN === 'true'; // strip comments
if (isCleanBuild) {
    mainConfig.plugins.push(cleanup());
    tmpRedirectsConfig.plugins.push(cleanup());
}

const isTest = process.env.UI_TEST === 'true';

let resultConfig = [];

if (isTest) {
    resultConfig = [mainConfig, testConfig];
} else {
    resultConfig = [
        // bundle click2load redirect first
        clickToLoadScriptConfig,
        clickToLoadConfig,
        mainConfig,
        redirectsBuild,
        umdConfig,
        tmpRedirectsConfig,
    ];
}

module.exports = resultConfig;
