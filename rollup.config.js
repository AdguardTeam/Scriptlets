import path from 'path';
import fs from 'fs';
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
const TEST_FILE_NAME_MARKER = '.test.js';

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

/**
 * Prepares rollup config for test file
 * @param {string} fileName test file name
 * @param {string} dirPath resolved directory path
 * @param {string} subDir subdirectory with test files
 */
const getTestConfig = (fileName, dirPath, subDir) => {
    // cut off '.test.js' test file name ending
    const finalFileName = fileName.slice(0, -TEST_FILE_NAME_MARKER.length);
    return ({
        input: {
            tests: `${dirPath}/${fileName}`,
        },
        output: {
            dir: TESTS_DIST,
            entryFileNames: `${fileName}`,
            format: 'iife',
        },
        plugins: [
            clear({
                targets: [TESTS_DIST],
            }),
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
            cleanup(),
            json({
                preferConst: true,
                indent: '  ',
                compact: true,
                namedExports: true,
            }),
            babel({
                babelHelpers: 'runtime',
            }),
            generateHtml({
                // add subDir to final file name to avoid files rewriting
                // because there are some equal file names in different directories
                filename: `${TESTS_DIST}/${subDir}-${finalFileName}.html`,
                template: 'tests/template.html',
                selector: 'body',
                inline: true,
            }),
            copy({
                targets: [{
                    src: [
                        'tests/styles.css',
                        'tests/scriptlets/test-files',
                        'node_modules/qunit/qunit/qunit.js',
                        'node_modules/sinon/pkg/sinon.js',
                        'dist/scriptlets.js',
                    ],
                    dest: TESTS_DIST,
                }],
            }),
        ],
    });
};

const testConfigs = (() => {
    const TESTS_DIR = 'tests';
    const MULTIPLE_TEST_FILES_DIRS = [
        'scriptlets',
        'redirects',
    ];
    const ONE_TEST_FILE_DIRS = [
        'lib-tests',
        'helpers',
    ];

    const multipleFilesConfigs = MULTIPLE_TEST_FILES_DIRS
        .map((subDir) => {
            const dirPath = path.resolve(__dirname, TESTS_DIR, subDir);
            const filesList = fs.readdirSync(dirPath, { encoding: 'utf8' })
                .filter((el) => {
                    // skip index files for scriptlets and redirects
                    return el !== 'index.test.js'
                        // for testing specific scriptlet or redirect you should filter by its name
                        //  or just uncomment next line and fix test name
                        // && el === 'gemius.test.js'
                        // please note that oneFileConfigs will still be run
                        && el.includes(TEST_FILE_NAME_MARKER);
                });
            return filesList.map((filename) => getTestConfig(filename, dirPath, subDir));
        })
        .flat(1);

    const oneFileConfigs = ONE_TEST_FILE_DIRS
        .map((subDir) => {
            const dirPath = path.resolve(__dirname, TESTS_DIR, subDir);
            const filesList = fs.readdirSync(dirPath, { encoding: 'utf8' })
                .filter((el) => el.includes(TEST_FILE_NAME_MARKER));
            return filesList.map((filename) => getTestConfig(filename, dirPath, subDir));
        })
        .flat(1);

    const configs = [
        ...oneFileConfigs,
        ...multipleFilesConfigs,
    ];

    return configs;
})();

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
    resultConfig = [mainConfig, ...testConfigs];
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
