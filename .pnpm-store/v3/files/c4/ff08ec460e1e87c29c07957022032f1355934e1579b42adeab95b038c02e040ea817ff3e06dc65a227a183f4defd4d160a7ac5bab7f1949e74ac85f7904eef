var fs = require('fs');
var ps = require('path');
var cs = require('crypto');
var rm = require('rimraf');


var IS_WINDOWS = process.platform === 'win32';
var SYS_DIR_MODE = 0700;
var SYS_FILE_MODE = 0600;
var SYS_FILE_FLAGS = 'wx+';
var TEMPLATE_RE = /X+/g;
var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';


var tracking = false;
var trackedDirs = {};
var trackedFiles = {};
var manuallyTrackedDirs = {};
var manuallyTrackedFiles = {};

process.addListener('exit', function (exitcode) {
  if (tracking) {
    clearSync();
  } else {
    clearManuallyTracked();
  }
});

var onUncaughtException = function (err) {
  process.removeListener('uncaughtException', onUncaughtException);
  clearSync();
  throw err;
};
process.addListener('uncaughtException', onUncaughtException);

/* History:
 * https://github.com/joyent/node/blob/a11bf99ce0dae4d8f4de8a9c0c32159c1a9ecfbf/lib/os.js#L42-L47
 * https://github.com/joyent/node/blob/120e5a24df76deb5019abec9744ace94f0f3746a/lib/os.js#L45-L56
 * https://github.com/iojs/io.js/blob/6c80e38b014b7be570ffafa91032a6d67d7dd4ae/lib/os.js#L25-L40
 * https://github.com/iojs/io.js/blob/76937051f852accd60c18b6a63277061d98d3909/lib/os.js#L28-L43
 *
 * Reason for my choice:
 *   Never trust the return string.
 */
function tmpdir() {
  if (IS_WINDOWS) {
    return process.env.TEMP || process.env.TMP ||
           (process.env.SystemRoot || process.env.windir) + '\\temp';
  } else {
    return process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
  }
}

function track(on) {
  tracking = (on == null ? true : Boolean(on));
}

function clearManuallyTracked() {
  var unlinkers = [];
  for (var k in manuallyTrackedFiles) {
    manuallyTrackedFiles[k] && unlinkers.push(manuallyTrackedFiles[k]);
  }
  for (var k in manuallyTrackedDirs) {
    manuallyTrackedDirs[k] && unlinkers.push(manuallyTrackedDirs[k]);
  }
  for (var i = 0, l = unlinkers.length; i < l; i++) {
    unlinkers[i]();
  }
}

function clearSync() {
  var unlinkers = [];
  for (var k in trackedFiles) {
    trackedFiles[k] && unlinkers.push(trackedFiles[k]);
  }
  for (var k in manuallyTrackedFiles) {
    manuallyTrackedFiles[k] && unlinkers.push(manuallyTrackedFiles[k]);
  }
  for (var k in trackedDirs) {
    trackedDirs[k] && unlinkers.push(trackedDirs[k]);
  }
  for (var k in manuallyTrackedDirs) {
    manuallyTrackedDirs[k] && unlinkers.push(manuallyTrackedDirs[k]);
  }
  for (var i = 0, l = unlinkers.length; i < l; i++) {
    unlinkers[i]();
  }
}

function clear(callback) {
  var jobs = [];
  for (var k in trackedFiles) {
    if (trackedFiles[k]) {
      jobs.push(trackedFiles[k]);
    }
  }
  for (var k in manuallyTrackedFiles) {
    if (manuallyTrackedFiles[k]) {
      jobs.push(manuallyTrackedFiles[k]);
    }
  }
  for (var k in trackedDirs) {
    if (trackedDirs[k]) {
      jobs.push(trackedDirs[k]);
    }
  }
  for (var k in manuallyTrackedDirs) {
    if (manuallyTrackedDirs[k]) {
      jobs.push(manuallyTrackedDirs[k]);
    }
  }
  parallel(jobs, callback);
}

function generateSimpleFileUnlinker(path) {
  var called = false;
  var unlink = function unlink(callback) {
    if (called) {
      return;
    }
    called = true;
    if (callback) {
      fs.unlink(path, function (err) {
        callback && callback(err);
      });
    } else {
      fs.unlinkSync(path);
    }
  };
  return unlink;
}

function generateSimpleDirUnlinker(path, recursive) {
  var called = false;
  var unlink = function unlink(callback) {
    if (called) {
      return;
    }
    called = true;
    if (callback) {
      if (recursive) {
        rm(path, {disableGlob: true}, function (err) {
          callback && callback(err);
        });
      } else {
        fs.rmdir(path, function (err) {
          callback && callback(err);
        });
      }
    } else {
      if (recursive) {
        rm.sync(path, {disableGlob: true});
      } else {
        fs.rmdirSync(path);
      }
    }
  };
  return unlink;
}

function generateFileUnlinker(fd, path, manually) {
  var called = false;
  var unlink = function unlink(callback) {
    if (called) {
      return;
    }
    called = true;
    if (callback) {
      fs.unlink(path, function (err) {
        if (manually) {
          delete manuallyTrackedFiles[fd];
        } else {
          delete trackedFiles[fd];
        }
        callback && callback(null);
      });
    } else {
      try {
        fs.unlinkSync(path);
      } finally {
        if (manually) {
          delete manuallyTrackedFiles[fd];
        } else {
          delete trackedFiles[fd];
        }
      }
    }
  };
  if (manually) {
    manuallyTrackedFiles[fd] = unlink;
  } else {
    trackedFiles[fd] = unlink;
  }
  return unlink;
}

function generateDirUnlinker(recursive, path, manually) {
  var called = false;
  var unlink = function unlink(callback) {
    if (called) {
      return;
    }
    called = true;
    if (callback) {
      var rmdir = recursive ? rm : function (path, opts, callback) {
        fs.rmdir(path, callback);
      };
      rmdir(path, {disableGlob: true}, function (err) {
        if (manually) {
          delete manuallyTrackedDirs[path];
        } else {
          delete trackedDirs[path];
        }
        callback && callback(null);
      });
    } else {
      try {
        if (recursive) {
          rm.sync(path, {disableGlob: true});
        } else {
          fs.rmdirSync(path);
        }
      } finally {
        if (manually) {
          delete manuallyTrackedDirs[path];
        } else {
          delete trackedDirs[path];
        }
      }
    }
  };
  if (manually) {
    manuallyTrackedDirs[path] = unlink;
  } else {
    trackedDirs[path] = unlink;
  }
  return unlink;
}

function parallel(jobs, callback) {
  var called = !callback;
  var count = jobs.length;
  var done = function () {
    if (count > 0 && !this.called) {
      this.called = true;
      count--;
    }
    if (count === 0 && !called) {
      called = true;
      callback();
    }
  };
  for (var i = 0, l = jobs.length; i < l; i++) {
    jobs[i](done.bind({}));
  }
}

function registerFilename(path, opts, callback) {
  fs.open(path, SYS_FILE_FLAGS, opts.mode || SYS_FILE_MODE, function (err, fd) {
    if (err) {
      callback(null);
      return;
    }
    var unlink;
    if (opts.track || (opts.track == null && tracking)) {
      if (!trackedFiles[fd] && !manuallyTrackedFiles[fd]) {
        unlink = generateFileUnlinker(fd, path, Boolean(opts.track));
      } else {
        throw new Error("Didn't you delete files via file.unlink()?");
      }
    } else {
      unlink = generateSimpleFileUnlinker(path);
    }
    callback({path: path, fd: fd, unlink: unlink});
  });
}

function generateFile() {
  var args = getArgs(arguments);
  var opts = args[0];
  var callback = args[1];
  var limit = (opts.limit != null && opts.limit < Infinity) ? opts.limit : 5;
  var registerCallback = function (file) {
    if (limit-- >= 0) {
      if (file) {
        callback && callback(null, file);
      } else {
        registerFilename(generateName(opts), opts, registerCallback);
      }
    } else {
      if (callback) {
        var err = new Error('Failed to get a temporary file within limits.');
        callback(err, null);
      }
    }
  };
  registerFilename(generateName(opts), opts, registerCallback);
}

function registerFilenameSync(path, opts) {
  try {
    var fd = fs.openSync(path, SYS_FILE_FLAGS, opts.mode || SYS_FILE_MODE);
    var unlink;
    if (opts.track || (opts.track == null && tracking)) {
      if (!trackedFiles[fd] && !manuallyTrackedFiles[fd]) {
        unlink = generateFileUnlinker(fd, path, Boolean(opts.track));
      } else {
        throw new Error("Didn't you delete files via file.unlink()?");
      }
    } else {
      unlink = generateSimpleFileUnlinker(path);
    }
    return {path: path, fd: fd, unlink: unlink};
  } catch (err) {
    return null;
  }
}

function generateFileSync(opts) {
  opts = opts || {};
  var limit = (opts.limit != null && opts.limit < Infinity) ? opts.limit : 5;
  do {
    var file = registerFilenameSync(generateName(opts), opts);
    if (file) {
      return file;
    }
  } while (limit-- > 0);
  throw new Error('Failed to get a temporary file within limits.');
}

function registerDirname(path, opts, callback) {
  fs.mkdir(path, opts.mode || SYS_DIR_MODE, function (err) {
    if (err) {
      callback(null);
      return;
    }
    var unlink;
    var recursive = Boolean(opts.recursive);
    if (opts.track || (opts.track == null && tracking)) {
      if (!trackedDirs[path] && !manuallyTrackedDirs[path]) {
        unlink = generateDirUnlinker(recursive, path, Boolean(opts.track));
      } else {
        throw new Error("Didn't you delete directories via directory.unlink()?");
      }
    } else {
      unlink = generateSimpleDirUnlinker(path, recursive);
    }
    callback({path: path, recursive: recursive, unlink: unlink});
  });
}

function generateDir() {
  var args = getArgs(arguments);
  var opts = args[0];
  var callback = args[1];
  var limit = (opts.limit != null && opts.limit < Infinity) ? opts.limit : 5;
  var registerCallback = function (dir) {
    if (limit-- >= 0) {
      if (dir) {
        callback && callback(null, dir);
      } else {
        registerDirname(generateName(opts), opts, registerCallback);
      }
    } else {
      if (callback) {
        var err = new Error('Failed to get a temporary directory within limits.');
        callback(err, null);
      }
    }
  };
  registerDirname(generateName(opts), opts, registerCallback);
}

function registerDirnameSync(path, opts) {
  try {
    fs.mkdirSync(path, opts.mode || SYS_DIR_MODE);
    var unlink;
    var recursive = Boolean(opts.recursive);
    if (opts.track || (opts.track == null && tracking)) {
      if (!trackedDirs[path] && !manuallyTrackedDirs[path]) {
        unlink = generateDirUnlinker(recursive, path, Boolean(opts.track));
      } else {
        throw new Error("Didn't you delete directories via directory.unlink()?");
      }
    } else {
      unlink = generateSimpleDirUnlinker(path, recursive);
    }
    return {path: path, recursive: recursive, unlink: unlink};
  } catch (err) {
    return null;
  }
}

function generateDirSync(opts) {
  opts = opts || {};
  var limit = (opts.limit != null && opts.limit < Infinity) ? opts.limit : 5;
  do {
    var dir = registerDirnameSync(generateName(opts), opts);
    if (dir) {
      return dir;
    }
  } while (limit-- > 0);
  throw new Error('Failed to get a temporary directory within limits.');
}

function getArgs(args) {
  var opts, callback;
  if (typeof args[0] === 'function') {
    opts = args[1];
    callback = args[0];
  } else {
    opts = args[0];
    callback = args[1];
  }
  opts = opts || {};
  return [opts, callback];
}

function randomString(length) {
  var buffer;
  try {
    buffer = cs.randomBytes(length);
  } catch (err) {
    buffer = cs.pseudoRandomBytes(length);
  }
  var chars = [];
  for (var i = 0; i < length; i++) {
    chars.push(CHARS[buffer[i]%CHARS.length]);
  }
  return chars.join('');
}

function generateName(opts) {
  opts = opts || {};
  if (opts.name) {
    return ps.resolve(ps.join(opts.dir || tmpdir(), opts.name));
  }
  if (opts.template) {
    if (TEMPLATE_RE.test(opts.template)) {
      var name = opts.template.replace(TEMPLATE_RE, function (s) {
        return randomString(s.length);
      });
      return ps.resolve(ps.join(opts.dir || tmpdir(), name));
    } else {
      throw new Error('Invalid template string.');
    }
  }
  var name = [
    opts.prefix || 'tmp-',
    Date.now(),
    '-',
    randomString(12),
    opts.suffix || ''
  ].join('');
  return ps.resolve(ps.join(opts.dir || tmpdir(), name));
}


module.exports = {
  track: track,
  clear: clear,
  clearSync: clearSync,
  open: generateFile,
  openSync: generateFileSync,
  mkdir: generateDir,
  mkdirSync: generateDirSync,
  name: generateName,
  dir: tmpdir
};
