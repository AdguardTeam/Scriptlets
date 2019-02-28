/* eslint-disable no-console */
const path = require('path');
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');

const qunitArgs = {
    targetUrl: `file://${path.join(__dirname, 'tests.html')}`,
    timeout: 10000,
};

runQunitPuppeteer(qunitArgs)
    .then((result) => {
        printResultSummary(result, console);

        if (result.stats.failed > 0) {
            printFailedTests(result, console);
        }
    })
    .catch((ex) => {
        console.error(ex);
    });
