/* eslint-disable no-console */
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');
const server = require('./server');

const PORT = 8081;
const HOSTNAME = 'scriptlets.adguard.com';
const qunitArgs = {
    targetUrl: `http://${HOSTNAME}:${PORT}/`,
    timeout: 10000,
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
        console.error(ex);
    });
