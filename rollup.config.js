import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';
import clear from 'rollup-plugin-clear';
import json from '@rollup/plugin-json';

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

const cjsConfig = {
    input: {
        scriptletsCjs: 'src/scriptlets/scriptlets-cjs-wrapper.js',
    },
    output: {
        dir: 'dist/cjs',
        entryFileNames: '[name].js',
        format: 'cjs',
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
                { src: 'types/scriptlets.d.ts', dest: 'dist/cjs/' },
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
    resultConfig = [mainConfig, redirectsBuild, cjsConfig, tmpRedirectsConfig];
}

module.exports = resultConfig;
