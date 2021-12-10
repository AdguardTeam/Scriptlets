/* eslint-disable no-console */
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');
const { server, port } = require('./server');

const qunitArgs = {
    targetUrl: `http://localhost:${port}?test`,
    timeout: 15000,
    // needed for logging to console while testing run via `yarn test`
    // redirectConsole: true,
    puppeteerArgs: ['--no-sandbox', '--allow-file-access-from-files'],
};

runQunitPuppeteer(qunitArgs)
    .then((result) => {
        printResultSummary(result, console);

        if (result.stats.failed > 0) {
            printFailedTests(result, console);
        }
    })
    .then(() => {
        server.close();
    })
    .catch((ex) => {
        server.close();
        console.error(ex);
        process.exit(1);
    });
