/* eslint-disable no-console */
import path from 'node:path';
import fs from 'node:fs';
import { runQunitWithPage, printFailedTests, printResultSummary } from 'node-qunit-puppeteer';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

import {
    server,
    port,
    start,
    stop,
} from './server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESTS_RUN_TIMEOUT = 60000;
const TESTS_DIST = './dist';
const TEST_FILE_NAME_MARKER = '.html';

// Restart the browser every N tests to release Chrome's accumulated V8 heap
// and CDP overhead.  Under the CI Docker builder's 1800 m memory cap, a single
// long-lived browser grows RSS until page creation slows to a crawl and the
// QUnit timeout fires before the test page even finishes loading.
const BROWSER_RESTART_INTERVAL = 25;

// Standard Chrome-in-Docker flags needed for the CI builder.
const PUPPETEER_LAUNCH_ARGS = [
    '--no-sandbox',
    '--allow-file-access-from-files',
    // Chrome uses /dev/shm for shared memory, which is tiny (64 MB) inside the
    // CI Docker container.  Without this flag Chrome exhausts /dev/shm and
    // becomes extremely slow — page creation alone can take tens of seconds,
    // pushing individual QUnit pages past their timeout.
    '--disable-dev-shm-usage',
];

/**
 * Returns false if test failed and true if test passed
 *
 * @param {string} indexFile Path to the test file.
 * @param {puppeteer.Browser} browser Puppeteer browser instance to reuse.
 *
 * @returns {Promise<boolean>} Promise that resolves to true if test passed, false otherwise.
 */
const runQunit = async (indexFile, browser) => {
    const qunitArgs = {
        targetUrl: `http://localhost:${port}/${indexFile}?test`,
        timeout: TESTS_RUN_TIMEOUT,
        // needed for logging to console while testing run via `pnpm test`
        // redirectConsole: true,
        puppeteerArgs: PUPPETEER_LAUNCH_ARGS,
    };

    // Manage the page lifecycle ourselves. node-qunit-puppeteer's
    // runQunitWithBrowser opens a page per test but never closes it; reusing
    // one browser for the whole suite leaks pages (each loads the scriptlets
    // bundle) and grows Chrome's RSS until the CI builder is OOM-killed
    // (rpc ... EOF) under its 1800m cap.
    const page = await browser.newPage();
    try {
        const result = await runQunitWithPage(page, qunitArgs);
        printResultSummary(result, console);
        if (result.stats.failed > 0) {
            printFailedTests(result, console);
            return false;
        }
        return true;
    } finally {
        await page.close();
    }
};

const runQunitTests = async () => {
    const testServer = server.init();

    await start(testServer, port);

    const dirPath = path.resolve(__dirname, TESTS_DIST);
    const testFiles = fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter((el) => el.includes(TEST_FILE_NAME_MARKER));

    let errorOccurred = false;
    let testsPassed = true;

    try {
        console.log('Running tests sequentially with shared browser instance..');

        // Create a single browser instance to be shared across runs of tests,
        // restarting it periodically to release Chrome's accumulated memory.
        const launchBrowser = () => puppeteer.launch({
            args: PUPPETEER_LAUNCH_ARGS,
            // Using headless mode for better performance
            headless: 'new',
        });

        let browser = await launchBrowser();

        // Run tests one after another
        const testResults = [];
        for (let i = 0; i < testFiles.length; i += 1) {
            const fileName = testFiles[i];

            // Restart the browser periodically to keep Chrome's RSS bounded
            // under the CI Docker builder's memory cap.  Creating + closing
            // pages releases per-page memory, but V8 heap and CDP overhead
            // still accumulate inside a single long-lived browser process
            // until page creation slows to a crawl and the QUnit timeout fires
            // before the test page even finishes loading.
            if (i > 0 && i % BROWSER_RESTART_INTERVAL === 0) {
                console.log(`\nRestarting browser to release accumulated memory (test ${i + 1}/${testFiles.length})`);
                await browser.close();
                browser = await launchBrowser();
            }

            console.log(`\nStarted test: ${fileName}`);
            try {
                const testPassed = await runQunit(fileName, browser);
                console.log(`Completed test: ${fileName}`);
                testResults.push({ fileName, passed: testPassed, error: null });
            } catch (error) {
                console.log(`Error in test ${fileName}:`, error);
                testResults.push({ fileName, passed: false, error });
            }
        }

        // Close the shared browser instance
        await browser.close();

        // Process results after all tests complete
        testResults.forEach(({ fileName, passed, error }) => {
            if (error) {
                console.log(`\n❌ Test ${fileName} failed with error:`, error);
                errorOccurred = true;
            } else if (!passed) {
                console.log(`\n❌ Test ${fileName} did not pass`);
                testsPassed = false;
            } else {
                console.log(`\n✅ Test ${fileName} passed`);
            }
        });
    } catch (e) {
        console.log(e);
        await stop(testServer);
        // do not fail all tests run if some test failed
        errorOccurred = true;
    }

    if (errorOccurred || !testsPassed) {
        process.exit(1);
    }

    await stop(testServer);
};

export {
    runQunit,
    runQunitTests,
};
