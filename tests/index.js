/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { runQunitPuppeteer, printFailedTests, printResultSummary } = require('node-qunit-puppeteer');

// todo separate server for tests and qunit
const getFile = (filepath) => {
    if (!filepath) { return ''; }
    return fs.readFileSync(path.resolve(__dirname, filepath));
};

// Yes, I know
const map = {
    '/': 'tests.html',
    '/styles.css': 'styles.css',
    '/node_modules/qunit/qunit/qunit.js': '../node_modules/qunit/qunit/qunit.js',
    '/dist/scriptlets.js': '../dist/scriptlets.js',
    '/dist/tests.js': 'dist/tests.js',
};
const requestHandler = (request, response) => {
    const file = getFile(map[request.url]);
    response.write(file);
    response.end();
};
const PORT = 8081;
const HOSTNAME = 'scriptlets.adguard.com';
const server = http.createServer(requestHandler);

server.listen(PORT, () => console.log(`server is listening on ${PORT}`));

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
