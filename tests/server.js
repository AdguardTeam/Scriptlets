/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8585;

const server = http.createServer((req, res) => {
    const indexFile = 'tests.html';
    const filename = req.url === '/' ? indexFile : req.url;
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

server.listen(PORT, () => {
    console.log(`Server running at port: ${PORT}`);
});

module.exports = {
    server,
    port: PORT,
};
