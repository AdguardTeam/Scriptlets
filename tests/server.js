/* eslint-disable no-console */
import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_QUERY_MARKER = '?test';

const PORT = 54136;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
};

const getContentType = (filePath) => {
    const extname = path.extname(filePath).toLowerCase();
    return mimeTypes[extname] || 'application/octet-stream';
};

const server = {
    init() {
        return http.createServer((req, res) => {
            let filename = req.url;
            const queryPosition = filename.indexOf(TEST_QUERY_MARKER);
            if (queryPosition > -1) {
                filename = req.url.slice(0, queryPosition);
            }

            const fullPath = path.join(__dirname, 'dist', filename);

            fs.stat(fullPath, (err, stats) => {
                if (err) {
                    console.log(err.message);
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }

                if (stats.isFile()) {
                    // It's a file, serve it
                    fs.readFile(fullPath, (err, data) => {
                        if (err) {
                            console.log(err.message);
                            res.writeHead(500);
                            res.end(JSON.stringify(err));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': getContentType(fullPath) });
                        res.end(data);
                    });
                } else {
                    // Neither a file nor a directory
                    res.writeHead(404);
                    res.end();
                }
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

export {
    server,
    PORT as port,
    start,
    stop,
};
