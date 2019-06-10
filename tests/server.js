/* eslint-disable no-console */
const http = require('http');
const ServeStatic = require('serve-static');

const serve = new ServeStatic('tests/dist', { index: ['tests.html'] });
const requestHandler = (request, response) => {
    serve(request, response, () => {});
};

const PORT = 8585;
const server = http.createServer(requestHandler);

server.listen(PORT, () => console.log(`server is listening on ${PORT}`));

module.exports = {
    server,
    port: PORT,
};
