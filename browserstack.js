/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const browserstackRunner = require('browserstack-runner');
const config = require('./browserstack.json');

const TESTS_DIST = './tests/dist';
const TEST_FILE_NAME_MARKER = '.html';
const WORKER_TIMEOUT_LIMIT = 25 * 60; // in seconds, 25 minutes per each browserstack worker

if (!process.env.TRAVIS) {
    // eslint-disable-next-line global-require
    require('dotenv').config();
}

config.username = process.env.BROWSERSTACK_USER;
config.key = process.env.BROWSERSTACK_KEY;

// browserstack does not support '*' in 'test_path' and requires array of test pages
const dirPath = path.resolve(__dirname, TESTS_DIST);
const testFiles = fs.readdirSync(dirPath, { encoding: 'utf8' })
    .filter((el) => el.includes(TEST_FILE_NAME_MARKER))
    .map((filename) => `tests/dist/${filename}`);

config.test_path = testFiles;

// config.timeout defaults to 5 minutes which are not enough for all tests running
config.timeout = WORKER_TIMEOUT_LIMIT;

browserstackRunner.run(config, (error) => {
    if (error) {
        throw error;
    }
    console.log('Test Finished');
});
