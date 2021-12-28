/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');
const {
    server,
    port,
    start,
    stop,
} = require('./server');

const TESTS_RUN_TIMEOUT = 30000;
const TESTS_DIST = './dist';
const TEST_FILE_NAME_MARKER = '.html';

const testServer = server.init();

const runQunit = async (indexFile) => {
    const qunitArgs = {
        targetUrl: `http://localhost:${port}/${indexFile}?test`,
        timeout: TESTS_RUN_TIMEOUT,
        // needed for logging to console while testing run via `yarn test`
        // redirectConsole: true,
        puppeteerArgs: ['--no-sandbox', '--allow-file-access-from-files'],
    };

    const result = await runQunitPuppeteer(qunitArgs);
    printResultSummary(result, console);
    if (result.stats.failed > 0) {
        printFailedTests(result, console);
    }
};

(async () => {
    await start(testServer, port);

    const dirPath = path.resolve(__dirname, TESTS_DIST);
    const testFiles = fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter((el) => el.includes(TEST_FILE_NAME_MARKER));

    let errorOccurred = false;

    try {
        console.log('Running tests..');

        // eslint-disable-next-line no-restricted-syntax
        for (const fileName of testFiles) {
            // \n is needed to divide logging
            console.log(`\nTesting ${fileName}:`);
            // eslint-disable-next-line no-await-in-loop
            await runQunit(fileName);
        }
    } catch (e) {
        console.log(e);
        await stop(testServer);
        // do not fail all tests run if some test failed
        errorOccurred = true;
    }

    if (errorOccurred) {
        process.exit(1);
    }

    await stop(testServer);
})();
