var browserstack = require('./index');

var local = new browserstack.Local();
var webdriver = require('selenium-webdriver');
var identifier = 'adqqwdqwd';

var capabilities = {
  build: 'build',
  'browserName': 'chrome',
  'os': 'OS X',
  'browserstack.local': true
  //'browserstack.localIdentifier': identifier
}

var options = {
  'key': process.env.BROWSERSTACK_ACCESS_KEY,
  //hosts: [{
  //  name: 'localhost',
  //  port: 8080,
  //  sslFlag: 0
  //}],
  //'-f': __dirname,
  //'-binaryPath': '/var/BrowserStackLocal'
};

// try {
  local.start(options, function() {
    console.log('Is Running ' + local.isRunning());
    console.log('Started');

    capabilities['browserstack.user'] = process.env.BROWSERSTACK_USERNAME;
    capabilities['browserstack.key'] = process.env.BROWSERSTACK_ACCESS_KEY;
    capabilities['browserstack.local'] = true;
    //capabilities['browserstack.localIdentifier'] = identifier;

    driver = new webdriver.Builder().usingServer('http://hub.browserstack.com/wd/hub').withCapabilities(capabilities).build();
    console.log('Is Running ' + local.isRunning());
    driver.get("http://www.google.com").then(function() {
      console.log('Is Running ' + local.isRunning());
      driver.quit().then(function() {
        console.log('Is Running ' + local.isRunning());
        local.stop(function() {
          console.log('Is Running ' + local.isRunning());
          console.log('Stopped');
        });
      });
    });
  });
// }
// catch(error){
//   console.log("Got Error From Local " + error);
//   process.exit();
// }


