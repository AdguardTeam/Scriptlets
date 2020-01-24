import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';
import clear from 'rollup-plugin-clear';

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

const bundleBuild = {
    input: {
        scriptlets: 'src/scriptlets/index.js',
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

const testBuild = {
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

const debugLib = {
    input: 'src/scriptlets/index.js',
    output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'iife',
        strict: false,
        sourcemap: true,
    },
    watch: {
        include: ['*/**'],
        chokidar: false,
    },
    plugins: [
        clear({
            targets: [LIB_TESTS_DIST],
        }),
        resolve(),
        commonjs({
            include: 'node_modules/**',
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

const testLibTests = {
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
        chokidar: false,
    },
    plugins: [
        clear({
            targets: [LIB_TESTS_DIST],
        }),
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
        copy({
            targets: [{
                src: [
                    'tests/lib-tests/index.test.js',
                    'dist/scriptlets.js',
                ],
                dest: LIB_TESTS_DIST,
            }],
        }),
    ],
};

const tmpRedirectsBuild = {
    input: {
        tmpRedirects: 'src/redirects/index.js',
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
        babel({
            exclude: 'node_modules/**',
            runtimeHelpers: true,
        }),
    ],
};

const isCleanBuild = process.env.CLEAN === 'true'; // strip comments
if (isCleanBuild) {
    bundleBuild.plugins.push(cleanup());
    tmpRedirectsBuild.plugins.push(cleanup());
}

const isTest = process.env.UI_TEST === 'true';
const isLibTest = process.env.UI_LIB_TEST === 'true';
const isDebugLib = process.env.DEBUG_LIB === 'true';

let resultBuilds = [];

if (isDebugLib) {
    resultBuilds = [bundleBuild, debugLib];
} else if (isLibTest) {
    resultBuilds = [debugLib, testLibTests];
} else if (isTest) {
    resultBuilds = [bundleBuild, testBuild];
} else {
    resultBuilds = [bundleBuild, tmpRedirectsBuild];
}

// const resultBuilds = isTest
//     ? [bundleBuild, testBuild]
//     : [bundleBuild, tmpRedirectsBuild];

module.exports = resultBuilds;
