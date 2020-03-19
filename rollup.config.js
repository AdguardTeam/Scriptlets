import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';
import clear from 'rollup-plugin-clear';
import json from 'rollup-plugin-json';

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
const LIB_TESTS_DIST = 'tests/dist/lib-tests';
const TMP_DIR = 'tmp';

const mainConfig = {
    input: {
        scriptlets: 'src/scriptlets/scriptletsWrapper.js',
    },
    output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        sourcemap: true,
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
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const cjsConfig = {
    input: {
        scriptletsCjs: 'src/scriptlets/scriptlets.js',
    },
    output: {
        dir: 'dist/cjs',
        entryFileNames: '[name].js',
        format: 'cjs',
        exports: 'named',
        strict: false,
        sourcemap: true,
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
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
        copy({
            targets: [
                { src: 'types/scriptlets.d.ts', dest: 'dist/cjs/' },
            ],
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
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
        copy({
            targets: [{
                src: [
                    'tests/tests.html',
                    'tests/styles.css',
                    'node_modules/qunit/qunit/qunit.js',
                    'node_modules/sinon/pkg/sinon.js',
                    'dist/scriptlets.js',
                ],
                dest: TESTS_DIST,
            }],
        }),
    ],
};

const testLibConfig = {
    input: 'tests/lib-tests/index.test.js',
    output: {
        dir: LIB_TESTS_DIST,
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        sourcemap: true,
    },
    watch: {
        include: ['tests/lib-tests/**'],
    },
    plugins: [
        clear({
            targets: [LIB_TESTS_DIST],
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
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
        copy({
            targets: [{
                src: [
                    'tests/lib-tests/tests.html',
                    'tests/styles.css',
                    'node_modules/qunit/qunit/qunit.js',
                    'node_modules/sinon/pkg/sinon.js',
                    'dist/scriptlets.js',
                ],
                dest: LIB_TESTS_DIST,
            }],
        }),
    ],
};

const tmpRedirectsConfig = {
    input: {
        tmpRedirects: 'src/redirects/redirectsWrapper.js',
    },
    output: {
        name: 'tmpRedirects',
        dir: TMP_DIR,
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        sourcemap: true,
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
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const isCleanBuild = process.env.CLEAN === 'true'; // strip comments
if (isCleanBuild) {
    mainConfig.plugins.push(cleanup());
    tmpRedirectsConfig.plugins.push(cleanup());
}

const isTest = process.env.UI_TEST === 'true';
const isLibTest = process.env.UI_LIB_TEST === 'true';

let resultConfig = [];

if (isLibTest) {
    resultConfig = [mainConfig, testLibConfig];
} else if (isTest) {
    resultConfig = [mainConfig, testConfig];
} else {
    resultConfig = [mainConfig, cjsConfig, tmpRedirectsConfig];
}

module.exports = resultConfig;
