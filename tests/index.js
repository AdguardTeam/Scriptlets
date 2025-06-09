/* eslint-disable no-console */
import path from 'node:path';
import fs from 'node:fs';
import { runQunitWithBrowser, printFailedTests, printResultSummary } from 'node-qunit-puppeteer';
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

const TESTS_RUN_TIMEOUT = 30000;
const TESTS_DIST = './dist';
const TEST_FILE_NAME_MARKER = '.html';

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
        puppeteerArgs: ['--no-sandbox', '--allow-file-access-from-files'],
    };

    const result = await runQunitWithBrowser(browser, qunitArgs);
    printResultSummary(result, console);
    if (result.stats.failed > 0) {
        printFailedTests(result, console);
        return false;
    }
    return true;
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

        // Create a single browser instance to be shared across all tests
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--allow-file-access-from-files'],
            // Using headless mode for better performance
            headless: 'new',
        });

        // Run tests one after another
        const testResults = [];
        for (const fileName of testFiles) {
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
    runQunitTests,
};
