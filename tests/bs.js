const puppeteer = require('puppeteer');
const BrowserStackLocal = require('browserstack-local');
const path = require('path');
const fs = require('fs');
const { runQunitPuppeteer, printResultSummary, printFailedTests } = require('node-qunit-puppeteer');
const dotenv = require('dotenv');

dotenv.config();

const {
    start, port, stop, server,
} = require('./server');

const bsLocal = new BrowserStackLocal.Local();

// function markTest(page, status, reason) {
//     return page.evaluate(
//         (_) => {},
//         `browserstack_executor: ${JSON.stringify({
//             action: 'setSessionStatus',
//             arguments: { status, reason },
//         })}`,
//     );
// }
const TESTS_RUN_TIMEOUT = 30000;

const runQunit = async (indexFile) => {
    console.log(indexFile);
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

async function testFn() {
    console.log('Started BrowserStackLocal');

    // Check if BrowserStack local instance is running
    console.log(`BrowserStackLocal running: ${bsLocal.isRunning()}`);

    const caps = {
        browser: 'safari',
        browser_version: '10',
        os: 'os x',
        build: 'scriptlets-bs',
        name: 'Test scriptlets',
        'browserstack.username': process.env.BROWSERSTACK_USER,
        'browserstack.accessKey': process.env.BROWSERSTACK_KEY,
        'browserstack.wsLocalSupport': 'true',
        'browserstack.local': 'true', // Setting this capability to true would inform BrowserStack that publicly inaccessible URLs have to be resolved through your local network using the tunnel connection created by 'browserstack-local' node package
    };

    const testServer = server.init();

    // Use `.connect()` to initiate an Automate session on BrowserStack
    console.log('before connect');
    const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://cdp.browserstack.com/puppeteer?caps=${encodeURIComponent(JSON.stringify(caps))}`,
    });

    // BrowserStack specific code ends here
    const TESTS_DIST = './dist';
    const TEST_FILE_NAME_MARKER = '.html';

    const dirPath = path.resolve(__dirname, TESTS_DIST);
    const testFiles = fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter((el) => el.includes(TEST_FILE_NAME_MARKER));

    try {
        await start(testServer, port);

        // eslint-disable-next-line no-restricted-syntax
        for (const fileName of testFiles) {
            // \n is needed to divide logging
            console.log(`\nTesting ${fileName}:`);
            // eslint-disable-next-line no-await-in-loop
            await runQunit(fileName);
        }
    } catch (e) {
        console.log(e);
        await browser.close();

        await stop(testServer);

        // Stop the Local instance after your test run is completed
        bsLocal.stop(() => console.log('Stopped BrowserStackLocal'));

        process.exit(1);
    }

    // const page = await browser.newPage();

    // await page.goto('http://localhost:45691');
    // try {
    //     await page.waitForFunction(
    //         `document
    //             .querySelector("body")
    //             .innerText
    //             .includes("This is an internal server for BrowserStack Local")`,
    //     );
    //     // Following line of code is responsible for marking the status of the
    //     // test on BrowserStack as 'passed'. You can use this code in your
    //     // after hook after each test
    //     await markTest(page, 'passed', 'Local is up and running');
    // } catch {
    //     await markTest(page, 'failed', 'BrowserStack Local binary is not running');
    // }

    await browser.close();

    await stop(testServer);

    // Stop the Local instance after your test run is completed
    bsLocal.stop(() => console.log('Stopped BrowserStackLocal'));
}

// Starts the Local instance with the required arguments
bsLocal.start({
    key: process.env.BROWSERSTACK_KEY,
    verbose: true,
    force: true,
}, testFn);
