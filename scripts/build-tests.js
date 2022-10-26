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

const TESTS_DIST = path.resolve(__dirname, '../tests/dist');
const TEST_FILE_NAME_MARKER = '.test.js';

/**
 * Prepares rollup config for test file
 * @param {string} fileName test file name
 * @param {string} dirPath resolved directory path
 * @param {string} subDir subdirectory with test files
 */
const getTestConfig = (fileName, dirPath, subDir) => {
    if (!fs.existsSync(TESTS_DIST)) {
        fs.mkdirSync(TESTS_DIST);
    } else {
        fs.emptyDirSync(TESTS_DIST);
    }

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
                        'node_modules/js-reporters/dist/js-reporters.js',
                    ],
                    dest: TESTS_DIST,
                }],
            }),
        ],
    });
};

const getTestConfigs = () => {
    const TESTS_DIR = '../tests';
    const MULTIPLE_TEST_FILES_DIRS = [
        'scriptlets',
        'redirects',
        'helpers',
    ];
    const ONE_TEST_FILE_DIRS = [
        'lib-tests',
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
};

const buildTests = async () => {
    const testConfigs = getTestConfigs();

    await rollupStandard(testConfigs);
};

buildTests();
