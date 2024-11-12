# browserstack-local-nodejs

[![Build Status](https://travis-ci.org/browserstack/browserstack-local-nodejs.svg?branch=master)](https://travis-ci.org/browserstack/browserstack-local-nodejs)

Nodejs bindings for BrowserStack Local.

## Installation

```
npm install browserstack-local
```

## Example

```js
var browserstack = require('browserstack-local');

//creates an instance of Local
var bs_local = new browserstack.Local();

// replace <browserstack-accesskey> with your key. You can also set an environment variable - "BROWSERSTACK_ACCESS_KEY".
var bs_local_args = { 'key': '<browserstack-accesskey>' };

// starts the Local instance with the required arguments
bs_local.start(bs_local_args, function() {
  console.log("Started BrowserStackLocal");

  // check if BrowserStack local instance is running
  console.log(bs_local.isRunning());

  // stop the Local instance
  bs_local.stop(function() {
    console.log("Stopped BrowserStackLocal");
  });
});

```

## Arguments

Apart from the key, all other BrowserStack Local modifiers are optional. For the full list of modifiers, refer [BrowserStack Local modifiers](https://www.browserstack.com/local-testing#modifiers). For examples, refer below -

#### Verbose Logging
To enable verbose logging -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'verbose': 'true' }
```
Note - Possible values for 'verbose' modifier are '1', '2', '3' and 'true'

#### Folder Testing
To test local folder rather internal server, provide path to folder as value of this option -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'f': '/my/awesome/folder' }
```

#### Force Start
To kill other running Browserstack Local instances -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'force': 'true' }
```

#### Only Automate
To disable local testing for Live and Screenshots, and enable only Automate -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'onlyAutomate': 'true' }
```

#### Force Local
To route all traffic via local(your) machine -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'forceLocal': 'true' }
```

#### Proxy
To use a proxy for local testing -

* proxyHost: Hostname/IP of proxy, remaining proxy options are ignored if this option is absent
* proxyPort: Port for the proxy, defaults to 3128 when -proxyHost is used
* proxyUser: Username for connecting to proxy (Basic Auth Only)
* proxyPass: Password for USERNAME, will be ignored if USERNAME is empty or not specified
* useCaCertificate: Path to ca cert file, if required

```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'proxyHost': '127.0.0.1', 'proxyPort': '8000', 'proxyUser': 'user', 'proxyPass': 'password', 'useCaCertificate': '/Users/test/cert.pem' }
```

#### Local Proxy
To use local proxy in local testing -

* localProxyHost: Hostname/IP of proxy, remaining proxy options are ignored if this option is absent
* localProxyPort: Port for the proxy, defaults to 8081 when -localProxyHost is used
* localProxyUser: Username for connecting to proxy (Basic Auth Only)
* localProxyPass: Password for USERNAME, will be ignored if USERNAME is empty or not specified

```
bs_local_args = { 'key': '<browserstack-accesskey>', 'localProxyHost': '127.0.0.1', 'localProxyPort': '8000', 'localProxyUser': 'user', 'localProxyPass': 'password' }
```

#### PAC (Proxy Auto-Configuration)
To use PAC (Proxy Auto-Configuration) in local testing -

* pac-file: PAC (Proxy Auto-Configuration) file’s absolute path

```
bs_local_args = { 'key': '<browserstack-accesskey>', 'pac-file': '<pac_file_abs_path>' }
```

#### Local Identifier
If doing simultaneous multiple local testing connections, set this uniquely for different processes -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'localIdentifier': 'randomstring' }
```

## Additional Arguments

#### Binary Path
 
 By default, BrowserStack local wrappers try downloading and executing the latest version of BrowserStack binary in ~/.browserstack or the present working directory or the tmp folder by order. But you can override these by passing the -binarypath argument.
 Path to specify local Binary path -
 ```js
 bs_local_args = { 'key': '<browserstack-accesskey>', 'binarypath': '/browserstack/BrowserStackLocal' }
 ```

#### Logfile
To save the logs to the file while running with the '-v' argument, you can specify the path of the file. By default the logs are saved in the local.log file in the present woring directory.
To specify the path to file where the logs will be saved -
```js
bs_local_args = { 'key': '<browserstack-accesskey>', 'verbose': 'true', 'logFile': '/browserstack/logs.txt' }
```

## Contribute

### Instructions

To run the test suite run, `npm test`.

### Reporting bugs

You can submit bug reports either in the Github issue tracker.

Before submitting an issue please check if there is already an existing issue. If there is, please add any additional information give it a "+1" in the comments.

When submitting an issue please describe the issue clearly, including how to reproduce the bug, which situations it appears in, what you expect to happen, what actually happens, and what platform (operating system and version) you are using.

### Pull Requests

We love pull requests! We are very happy to work with you to get your changes merged in, however, please keep the following in mind.

* Adhere to the coding conventions you see in the surrounding code.
* Include tests, and make sure all tests pass.
* Before submitting a pull-request, clean up the git history by going over your commits and squashing together minor changes and fixes into the corresponding commits. You can do this using the interactive rebase command.

