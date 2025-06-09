/* eslint-disable no-console */
import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_QUERY_MARKER = '?test';

const PORT = 54136;

/**
 * Maximum file size for caching — 5MB.
 */
const MAX_CACHE_SIZE = 5 * 1024 * 1024;

/**
 * File cache to improve performance.
 */
const fileCache = new Map();

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
            const contentType = getContentType(fullPath);

            // Check if file is cached and not a dynamic resource
            if (fileCache.has(fullPath) && !filename.includes('?')) {
                // Serve from cache
                console.log(`Serving ${filename} from cache`);
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'max-age=3600',
                });
                res.end(fileCache.get(fullPath));
                return;
            }

            // Fast-path synchronous file check to avoid async overhead if we know the file exists
            if (!fs.existsSync(fullPath)) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }

            const stats = fs.statSync(fullPath);

            if (stats.isFile()) {
                // It's a file, serve it
                try {
                    const data = fs.readFileSync(fullPath);

                    // Cache the file if not too large
                    if (stats.size < MAX_CACHE_SIZE) {
                        fileCache.set(fullPath, data);
                    }

                    res.writeHead(200, {
                        'Content-Type': contentType,
                        'Cache-Control': 'max-age=3600',
                    });
                    res.end(data);
                } catch (err) {
                    console.log(err.message);
                    res.writeHead(500);
                    res.end(JSON.stringify(err));
                }
            } else {
                // Neither a file nor a directory
                res.writeHead(404);
                res.end('Not a file');
            }
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
