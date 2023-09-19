/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_QUERY_MARKER = '?test';

const PORT = 54136;

const server = {
    init() {
        return http.createServer((req, res) => {
            let filename = req.url;
            const queryPosition = filename.indexOf(TEST_QUERY_MARKER);
            if (queryPosition > -1) {
                filename = req.url.slice(0, queryPosition);
            }

            fs.readFile(path.join(__dirname, 'dist', filename), (err, data) => {
                // Required for test for trusted-replace-xhr-response
                // Checks if specific request header contains the same value few times
                // https://github.com/AdguardTeam/Scriptlets/issues/359
                if (filename?.includes('/test-files/test01.json')) {
                    const firstHeader = req.headers['first-header'];
                    const secondHeader = req.headers['second-header'];
                    if ((firstHeader && firstHeader.includes('foo, foo'))
                        || (secondHeader && secondHeader.includes('bar, bar'))) {
                        const error = 'Bad request: multiple values in header are not allowed.';
                        res.writeHead(400);
                        res.end(JSON.stringify(error));
                        return;
                    }
                }
                if (err) {
                    console.log(err.message);
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                res.writeHead(200);
                res.end(data);
            });
        });
    },
};

const start = (server, port) => {
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`Server running at port: ${port}`);
            resolve();
        });
    });
};

const stop = (server) => {
    return new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });
};

module.exports = {
    server,
    port: PORT,
    start,
    stop,
};
