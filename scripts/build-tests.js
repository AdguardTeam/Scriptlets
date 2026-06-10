import fs from 'fs-extra';
import { rolldown } from 'rolldown';
import copy from 'rolldown-plugin-copy';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { inlineScriptToHtml } from './generate-html';
import { generateHtmlTestFilename } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESTS_DIR = '../tests';
const TESTS_DIST = path.resolve(__dirname, TESTS_DIR, 'dist');
const TEST_FILE_NAME_MARKER = '.test.js';

const MULTIPLE_TEST_FILES_DIRS = [
    'scriptlets',
    'redirects',
    'helpers',
];

/**
 * Prepares rolldown config for a single test file.
 * Returns metadata alongside config for post-processing.
 *
 * @param {string} fileName test file name (e.g. "abort-current-inline-script.test.js")
 * @param {string} subDir subdirectory with test files (e.g. "scriptlets")
 * @returns {{ config: object, subDir: string, finalFileName: string }}
 */
const getTestConfig = (fileName, subDir) => {
    const dirPath = path.resolve(__dirname, TESTS_DIR, subDir);
    const finalFileName = fileName.slice(0, -TEST_FILE_NAME_MARKER.length);
    const config = {
        input: {
            tests: `${dirPath}/${fileName}`,
        },
        output: {
            dir: TESTS_DIST,
            // Prefix with subDir to avoid collisions (e.g. "scriptlets--abort.test.js")
            entryFileNames: `${subDir}--${fileName}`,
            format: 'iife',
        },
    };
    return {
        config,
        subDir,
        finalFileName,
    };
};

/**
 * Returns list of file names in tests/{subDir} ending with .test.js.
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
 * Returns list of file names in tests/{subDir} ending with .test.js
 * except index.test.js.
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
 * Returns list of { config, subDir, finalFileName } for tests.
 *
 * @param {object} limitData Optional data object for limited tests running. If not provided, all tests will be run.
 * @param {string} limitData.type Type of tests to run: scriptlets | redirects | helpers | api.
 * @param {string} limitData.name Optional name scriptlets or redirects test to run.
 *
 * @returns {object[]} Array of objects with config, subDir, finalFileName.
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

export const buildScriptletsForTests = async () => {
    const config = {
        input: path.resolve(__dirname, '../tests/scriptlets-entrypoint.js'),
        output: {
            dir: path.join(TESTS_DIST, 'scriptlets'),
            entryFileNames: 'index.js',
        },
        plugins: [
            copy({
                targets: [{
                    src: [path.resolve(__dirname, '../dist/redirects.yml')],
                    dest: path.join(TESTS_DIST, 'scriptlets'),
                }],
            }),
        ],
    };
    const build = await rolldown(config);
    await build.write(config.output);
};

export const buildTests = async (limitData) => {
    if (!fs.existsSync(TESTS_DIST)) {
        fs.mkdirSync(TESTS_DIST);
    } else {
        fs.emptyDirSync(TESTS_DIST);
    }

    const testConfigs = getTestConfigs(limitData);

    // Build each test JS with Rolldown, then inline into HTML, then delete JS
    for (const { config, subDir, finalFileName } of testConfigs) {
        // Step 1: Build JS with Rolldown
        const build = await rolldown(config);
        await build.write(config.output);

        // Step 2: Read the built JS
        const jsFileName = `${subDir}--${finalFileName}${TEST_FILE_NAME_MARKER}`;
        const jsPath = path.join(TESTS_DIST, jsFileName);
        const scriptContent = await fs.readFile(jsPath, 'utf8');

        // Step 3: Generate HTML with inlined script
        await inlineScriptToHtml({
            templatePath: path.resolve(__dirname, TESTS_DIR, 'template.html'),
            scriptContent,
            outputPath: path.join(TESTS_DIST, generateHtmlTestFilename(subDir, finalFileName)),
            injectionMarker: '<!-- test script injection -->',
        });

        // Step 4: Delete the JS file (code is now inlined in HTML)
        await fs.remove(jsPath);
    }

    // Copy static test assets
    const staticFiles = [
        'tests/styles.css',
        'tests/scriptlets/test-files',
        'node_modules/qunit/qunit/qunit.js',
        'node_modules/sinon/pkg/sinon.js',
        'node_modules/js-reporters/dist/js-reporters.js',
    ];
    for (const src of staticFiles) {
        const srcPath = path.resolve(__dirname, '..', src);
        // eslint-disable-next-line no-await-in-loop
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
            // eslint-disable-next-line no-await-in-loop
            await fs.copy(srcPath, path.join(TESTS_DIST, path.basename(src)));
        } else {
            // eslint-disable-next-line no-await-in-loop
            await fs.copy(srcPath, path.join(TESTS_DIST, path.basename(src)));
        }
    }

    await buildScriptletsForTests();
};
