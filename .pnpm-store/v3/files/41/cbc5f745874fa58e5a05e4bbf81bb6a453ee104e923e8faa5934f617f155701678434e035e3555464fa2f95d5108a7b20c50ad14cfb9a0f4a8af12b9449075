var https = require('https'),
  url = require('url'),
  fs = require('fs'),
  path = require('path'),
  os = require('os'),
  childProcess = require('child_process'),
  HttpsProxyAgent = require('https-proxy-agent'),
  LocalError = require('./LocalError');

function LocalBinary(){
  this.hostOS = process.platform;
  this.is64bits = process.arch == 'x64';

  this.getDownloadPath = function () {
    if(this.hostOS.match(/darwin|mac os/i)){
      return 'https://www.browserstack.com/local-testing/downloads/binaries/BrowserStackLocal-darwin-x64';
    } else if(this.hostOS.match(/mswin|msys|mingw|cygwin|bccwin|wince|emc|win32/i)) {
      this.windows = true;
      return 'https://www.browserstack.com/local-testing/downloads/binaries/BrowserStackLocal.exe';
    } else {
      if(this.is64bits) {
        if(this.isAlpine())
          return 'https://www.browserstack.com/local-testing/downloads/binaries/BrowserStackLocal-alpine';
        else
          return 'https://www.browserstack.com/local-testing/downloads/binaries/BrowserStackLocal-linux-x64';
      } else {
        return 'https://www.browserstack.com/local-testing/downloads/binaries/BrowserStackLocal-linux-ia32';
      }
    }
  };

  this.isAlpine = function() {
    try {
      return childProcess.execSync('grep -w "NAME" /etc/os-release').includes('Alpine');
    } catch(e) {
      return false;
    }
  };

  this.httpPath = this.getDownloadPath();



  this.retryBinaryDownload = function(conf, destParentDir, callback, retries, binaryPath) {
    var that = this;
    if(retries > 0) {
      console.log('Retrying Download. Retries left', retries);
      fs.stat(binaryPath, function(err) {
        if(err == null) {
          fs.unlinkSync(binaryPath);
        }
        if(!callback) {
          return that.downloadSync(conf, destParentDir, retries - 1);
        }
        that.download(conf, destParentDir, callback, retries - 1);
      });
    } else {
      console.error('Number of retries to download exceeded.');
    }
  };

  this.downloadSync = function(conf, destParentDir, retries) {
    console.log('Downloading in sync');
    var that = this;
    if(!this.checkPath(destParentDir))
      fs.mkdirSync(destParentDir);

    var destBinaryName = (this.windows) ? 'BrowserStackLocal.exe' : 'BrowserStackLocal';
    var binaryPath = path.join(destParentDir, destBinaryName);

    let cmd, opts;
    cmd = 'node';
    opts = [path.join(__dirname, 'download.js'), binaryPath, this.httpPath];
    if(conf.proxyHost && conf.proxyPort) {
      opts.push(conf.proxyHost, conf.proxyPort);
      if (conf.useCaCertificate) {
        opts.push(conf.useCaCertificate);
      }
    } else if (conf.useCaCertificate) {
      opts.push(undefined, undefined, conf.useCaCertificate);
    }

    try{
      const obj = childProcess.spawnSync(cmd, opts);
      let output;
      if(obj.stdout.length > 0) {
        if(fs.existsSync(binaryPath)){
          fs.chmodSync(binaryPath, '0755');
          return binaryPath;
        }else{
          console.log('failed to download');
          return that.retryBinaryDownload(conf, destParentDir, null, retries, binaryPath);
        }
      } else if(obj.stderr.length > 0) {
        output = Buffer.from(JSON.parse(JSON.stringify(obj.stderr)).data).toString();
        console.error(output);
        return that.retryBinaryDownload(conf, destParentDir, null, retries, binaryPath);
      }
    } catch(err) {
      console.error('Download failed with error', err);
      return that.retryBinaryDownload(conf, destParentDir, null, retries, binaryPath);
    }
  };

  this.download = function(conf, destParentDir, callback, retries){
    var that = this;
    if(!this.checkPath(destParentDir))
      fs.mkdirSync(destParentDir);

    var destBinaryName = (this.windows) ? 'BrowserStackLocal.exe' : 'BrowserStackLocal';
    var binaryPath = path.join(destParentDir, destBinaryName);
    var fileStream = fs.createWriteStream(binaryPath);

    var options = url.parse(this.httpPath);
    if(conf.proxyHost && conf.proxyPort) {
      options.agent = new HttpsProxyAgent({
        host: conf.proxyHost,
        port: conf.proxyPort
      });
    }
    if (conf.useCaCertificate) {
      try {
        options.ca = fs.readFileSync(conf.useCaCertificate);
      } catch(err) {
        console.log("failed to read cert file", err)
      }
    }

    https.get(options, function (response) {
      response.pipe(fileStream);
      response.on('error', function(err) {
        console.error('Got Error in binary download response', err);
        that.retryBinaryDownload(conf, destParentDir, callback, retries, binaryPath);
      });
      fileStream.on('error', function (err) {
        console.error('Got Error while downloading binary file', err);
        that.retryBinaryDownload(conf, destParentDir, callback, retries, binaryPath);
      });
      fileStream.on('close', function () {
        fs.chmod(binaryPath, '0755', function() {
          callback(binaryPath);
        });
      });
    }).on('error', function(err) {
      console.error('Got Error in binary downloading request', err);
      that.retryBinaryDownload(conf, destParentDir, callback, retries, binaryPath);
    });
  };

  this.binaryPath = function(conf, callback){
    var destParentDir = this.getAvailableDirs();
    var destBinaryName = (this.windows) ? 'BrowserStackLocal.exe' : 'BrowserStackLocal';
    var binaryPath = path.join(destParentDir, destBinaryName);
    if(this.checkPath(binaryPath, fs.X_OK)){
      if(!callback) {
        return binaryPath;
      }
      callback(binaryPath);
    } else {
      if(!callback) {
        return this.downloadSync(conf, destParentDir, 5);
      }
      this.download(conf, destParentDir, callback, 5);
    }
  };

  this.checkPath = function(path, mode){
    mode = mode || (fs.R_OK | fs.W_OK);
    try {
      fs.accessSync(path, mode);
      return true;
    } catch(e){
      if(typeof fs.accessSync !== 'undefined') return false;

      // node v0.10
      try {
        fs.statSync(path);
        return true;
      } catch (e){
        return false;
      }
    }
  };

  this.getAvailableDirs = function(){
    for(var i=0; i < this.orderedPaths.length; i++){
      var path = this.orderedPaths[i];
      if(this.makePath(path))
        return path;
    }
    throw new LocalError('Error trying to download BrowserStack Local binary');
  };

  this.makePath = function(path){
    try {
      if(!this.checkPath(path)){
        fs.mkdirSync(path);
      }
      return true;
    } catch(e){
      return false;
    }
  };

  this.homedir = function() {
    if(typeof os.homedir === 'function') return os.homedir();

    var env = process.env;
    var home = env.HOME;
    var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

    if (process.platform === 'win32') {
      return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
    }

    if (process.platform === 'darwin') {
      return home || (user ? '/Users/' + user : null);
    }

    if (process.platform === 'linux') {
      return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
    }

    return home || null;
  };

  this.orderedPaths = [
    path.join(this.homedir(), '.browserstack'),
    process.cwd(),
    os.tmpdir()
  ];
}

module.exports = LocalBinary;
