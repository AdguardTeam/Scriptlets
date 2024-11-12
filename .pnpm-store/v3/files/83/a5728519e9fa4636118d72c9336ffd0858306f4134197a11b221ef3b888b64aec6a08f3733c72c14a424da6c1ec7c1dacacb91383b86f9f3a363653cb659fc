const https = require('https'),
  fs = require('fs'),
  HttpsProxyAgent = require('https-proxy-agent'),
  url = require('url');

const binaryPath = process.argv[2], httpPath = process.argv[3], proxyHost = process.argv[4], proxyPort = process.argv[5], useCaCertificate = process.argv[6];

var fileStream = fs.createWriteStream(binaryPath);

var options = url.parse(httpPath);
if(proxyHost && proxyPort) {
  options.agent = new HttpsProxyAgent({
    host: proxyHost,
    port: proxyPort
  });
  if (useCaCertificate) {
    try {
      options.ca = fs.readFileSync(useCaCertificate);
    } catch(err) {
      console.log("failed to read cert file", err)
    }
  }
}

https.get(options, function (response) {
  response.pipe(fileStream);
  response.on('error', function(err) {
    console.error('Got Error in binary download response', err);
  });
  fileStream.on('error', function (err) {
    console.error('Got Error while downloading binary file', err);
  });
  fileStream.on('close', function () {
    console.log('Done');
  });
}).on('error', function(err) {
  console.error('Got Error in binary downloading request', err);
});
