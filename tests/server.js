/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

const getFile = (filepath) => {
    if (!filepath) { return ''; }
    return fs.readFileSync(path.resolve(__dirname, filepath));
};

// Yes, I know
const map = {
    '/': 'tests.html',
    '/styles.css': 'styles.css',
    '/node_modules/qunit/qunit/qunit.js': '../node_modules/qunit/qunit/qunit.js',
    '/node_modules/sinon/pkg/sinon.js': '../node_modules/sinon/pkg/sinon.js',
    '/dist/scriptlets.js': '../dist/scriptlets.js',
    '/dist/tests.js': 'dist/tests.js',
};

const prepareUrl = (requestUrl) => {
    let url;
    if (requestUrl.match(/testId/)) {
        url = '/';
    } else {
        url = requestUrl;
    }
    return url;
};

const requestHandler = (request, response) => {
    const url = prepareUrl(request.url);
    const file = getFile(map[url]);
    response.write(file);
    response.end();
};
const PORT = 8585;
const server = http.createServer(requestHandler);

server.listen(PORT, () => console.log(`server is listening on ${PORT}`));

module.exports = {
    server,
    port: PORT,
};
