import path from 'path';
import fs from 'fs-extra';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import generateHtml from 'rollup-plugin-generate-html';
import { rollupStandard } from './rollup-runners';
import { generateHtmlTestFilename } from './helpers';

const TESTS_DIR = '../tests';
const TESTS_DIST = path.resolve(__dirname, TESTS_DIR, 'dist');
const TEST_FILE_NAME_MARKER = '.test.js';

const MULTIPLE_TEST_FILES_DIRS = [
    'scriptlets',
    'redirects',
    'helpers',
];

/**
 * Prepares rollup config for test file
 *
 * @param {string} fileName test file name
 * @param {string} subDir subdirectory with test files
 * @returns {object} rollup config
 */
const getTestConfig = (fileName, subDir) => {
    if (!fs.existsSync(TESTS_DIST)) {
        fs.mkdirSync(TESTS_DIST);
    } else {
        fs.emptyDirSync(TESTS_DIST);
    }

    const dirPath = path.resolve(__dirname, TESTS_DIR, subDir);

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
            resolve({ extensions: ['.js', '.ts'] }),
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
                extensions: ['.js', '.ts'],
                babelHelpers: 'runtime',
            }),
            generateHtml({
                // add subDir to final file name to avoid files rewriting
                // because there are some equal file names in different directories
                filename: `${TESTS_DIST}/${generateHtmlTestFilename(subDir, finalFileName)}`,
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
                        'node_modules/js-reporters/dist/js-reporters.js',
                    ],
                    dest: TESTS_DIST,
                }],
            }),
        ],
    });
};

/**
 * Returns list of file names in <repo root>/tests/`subDir` which has `.test.js` ending.
 *
 * @param {string} subDir Subdirectory with test files.
 *
 * @returns {string[]} List of test files.
 */
const getTestFilesFromDir = (subDir) => {
    const dirPath = path.resolve(__dirname, TESTS_DIR, subDir);
    return fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter((el) => el.includes(TEST_FILE_NAME_MARKER));
};

/**
 * Returns list of file names in <repo root>/tests/`subDir` which has `.test.js` ending
 * except `index.test.js`.
 *
 * @param {string} subDir Subdirectory with test files.
 *
 * @returns {string[]} List of test files.
 */
const getMultipleTestFilesFromDir = (subDir) => {
    return getTestFilesFromDir(subDir)
        .filter((el) => el !== 'index.test.js');
};

/**
 * Returns list of rollup configs for tests.
 *
 * @param {object} limitData Optional data object for limited tests running. If not provided, all tests will be run.
 * @param {string} limitData.type Type of tests to run: scriptlets | redirects | helpers | api.
 * @param {string} limitData.name Optional name scriptlets or redirects test to run.
 *
 * @returns {object[]} Array of rollup configs for tests.
 */
const getTestConfigs = (limitData) => {
    // run limited list of tests if limitData is provided
    if (limitData && limitData.type) {
        const { type } = limitData;
        let filesList = getMultipleTestFilesFromDir(type);

        const { name } = limitData;
        if (name) {
            filesList = filesList.filter((el) => el === `${name}${TEST_FILE_NAME_MARKER}`);
        }

        return filesList.map((filename) => getTestConfig(filename, type));
    }

    // otherwise run all tests
    const allConfigs = [];
    MULTIPLE_TEST_FILES_DIRS.forEach((subDir) => {
        getMultipleTestFilesFromDir(subDir).forEach((filename) => {
            allConfigs.push(getTestConfig(filename, subDir));
        });
    });

    return allConfigs;
};

export const buildTests = async (limitData) => {
    const testConfigs = getTestConfigs(limitData);
    await rollupStandard(testConfigs);
};
