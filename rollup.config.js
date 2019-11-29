import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';

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

const bundleBuild = {
    input: {
        scriptlets: 'src/index.js',
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
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
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
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const testBuild = {
    input: {
        tests: 'tests/index.test.js',
    },
    output: {
        dir: 'tests/dist',
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
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
        copy({
            targets: [
                'tests/tests.html',
                'tests/styles.css',
                'node_modules/qunit/qunit/qunit.js',
                'node_modules/sinon/pkg/sinon.js',
                'dist/scriptlets.js',
            ],
            outputFolder: 'tests/dist',
        }),
    ],
};

const tmpRedirects = {
    input: {
        tmpRedirects: 'scripts/build-tmp-redirects.js',
    },
    output: {
        name: 'tmpRedirects',
        dir: 'tmp',
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
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const isCleanBuild = process.env.CLEAN === 'true'; // strip comments
if (isCleanBuild) {
    bundleBuild.plugins.push(cleanup());
    tmpRedirects.plugins.push(cleanup());
}

const isTest = process.env.UI_TEST === 'true';
const resultBuilds = isTest
    ? [bundleBuild, testBuild]
    : [bundleBuild, redirectsBuild, tmpRedirects];

module.exports = resultBuilds;
