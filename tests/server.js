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

/**
 * Starts the server on the given port and resolves with the port it actually
 * bound to. When `port` is 0 the OS assigns a free ephemeral port, and the
 * resolved value is that assigned port.
 *
 * The shared CI BuildKit builder can run several builds at once, and a fixed
 * port may already be held by a concurrent or leftover process. Without an
 * 'error' listener, EADDRINUSE is an unhandled 'error' event that terminates
 * the process — so on EADDRINUSE we fall back to an ephemeral port instead of
 * crashing the whole QUnit stage.
 *
 * @param {http.Server} server Server instance to start.
 * @param {number} port Preferred port; 0 picks an ephemeral one.
 * @returns {Promise<number>} The port the server is listening on.
 */
const start = async (server, port) => {
    const listen = (listenPort) => new Promise((resolve, reject) => {
        // Without an 'error' listener, EADDRINUSE crashes the process.
        server.once('error', reject);
        server.listen(listenPort, () => {
            server.off('error', reject);
            const boundPort = server.address().port;
            console.log(`Server running at port: ${boundPort}`);
            resolve(boundPort);
        });
    });

    try {
        return await listen(port);
    } catch (err) {
        if (err.code === 'EADDRINUSE' && port !== 0) {
            console.log(`Port ${port} is already in use, switching to an ephemeral port`);
            // Try again with an ephemeral port (0) to let the OS pick a free one.
            return listen(0);
        }
        throw err;
    }
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
