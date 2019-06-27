/* eslint-disable no-console */
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');
const { server, port } = require('./server');

const qunitArgs = {
    targetUrl: `http://localhost:${port}/`,
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
        server.close();
    });
