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
