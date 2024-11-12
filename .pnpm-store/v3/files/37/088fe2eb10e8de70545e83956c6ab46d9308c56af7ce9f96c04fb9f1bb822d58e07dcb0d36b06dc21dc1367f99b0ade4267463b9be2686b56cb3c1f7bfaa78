# temp-fs

[![Build Status](https://travis-ci.org/jakwings/node-temp-fs.svg)](https://travis-ci.org/jakwings/node-temp-fs)
[![NPM version](https://badge.fury.io/js/temp-fs.svg)](http://badge.fury.io/js/temp-fs)

A temporary file and directory creator for io.js and Node.js™.

Just like raszi/node-tmp and bruce/node-temp, it can safely create temporary
files and directories without worrying a lot of about race conditions as long
as you don't do some tricky things. ;-) You can also let this module track the
files or directories you created and delete them when the program exits.


## Installation

```bash
npm install temp-fs
```

```javascript
var tempfs = require('temp-fs');

// Create a tempfile in the system-provided tempdir.
tempfs.open(function (err, file) {
    if (err) { throw err; }

    console.log(file.path, file.fd);
    // async
    file.unlink(function () {
        console.log('File delected');
    });
    // sync
    // No problem even if unlink() is called twice.
    file.unlink();
});

// Create a tempdir in current directory.
tempfs.mkdir({
    dir: '.',
    recursive: true,  // It and its content will be remove recursively.
    track: true  // Track this directory.
}, function (err, dir) {
    if (err) { throw err; }

    console.log(dir.path, dir.recursive);
    throw new Error('Since it is tracked, tempfs will remove it for you.');
    dir.unlink();
});
```


## APIs

### options

*   `limit: Number`

    The maximum number of chance to retry before throwing an error. It should
    be a finite number. Default: 5

*   `recursive: Boolean`

    Whether `unlink()` should remove a directory recursively. Default: false

*   `track: Boolean`

    If set to `true`, let temp-fs manage the the current file/directory for you
    even if the global tracking is off. If set to `false`, don't let temp-fs
    manage it even if the global tracking is on. Otherwise, use the current
    global setting.

*   `mode: Number`

    File mode (default: 0600) or directory mode (default: 0700) to use.

*   `name: String`

    If set, join the two paths `options.dir || tempfs.dir()` and
    `options.name` together and use the result as the customized
    filename/pathname.

*   `dir: String`

    Where to put the generated tempfile or tempdir. Also see `options.name`
    above. Default: tempfs.dir()

*   `prefix: String`

    The prefix for the generated random name. Default: "tmp-"

*   `suffix: String`

    The suffix for the generated random name. Default: ""

*   `template: String`

    A string containing some capital letters Xs for substitution with random
    characters. Then it is used as part of the filename/dirname. Just like what
    you do with the `mktemp (3)` function in the C library.

### tempfs.track(on = true)

Use it to switch global files/directories tracking on or off. Turn it on if
you don't want to manually delete everything. When it is turned off, all
recorded files and directories will not be removed but still kept in case it
is turned on again before the program exits.

This switch does not affect manually tracked files through `options.track`.
They will be removed automatically on exit.

**Note: When an uncaught exception occurs, all tracked temporary files and
directories will be removed no matter it is on or off.**

### tempfs.dir()

Return the path of a system-provided tempdir as `require('os').tmpdir()` does.
You should not make any assumption about whether the path contains a trailing
path separator, or it is a real path. On most system it is not a fixed path,
and it can be changed by the user environment. When in doubt, check it first.

### tempfs.name([options])

Return a customized/random filename/dirname. Options are documented at
[options](#options).

### tempfs.open([options], [callback])

Try to open a unique tempfile asynchronously. The callback function receives
two arguments `error` and `file`. If `error` is null, `file` has these
properties:

*   `path`: The absolute path to the tempfile.
*   `fd`: An integer file descriptor.
*   `unlink`: A special function for you to delete the file. If you invoke it
    with a callback function, it will become asynchronous. If the file is not
    tracked, it may throw when an error occurs or the first argument of the
    callback function will be an Error object.

### tempfs.openSync([options]): file

The synchronous version of `tempfs.open`. It will throw when an error happens.

### tempfs.mkdir([options], [callback])

Try to create a new tempdir asynchronously. The callback function receives two
arguments `error` and `dir`. If `error` is null, `dir` has these properties:

*   `path`: The absolute path to the tempdir.
*   `recursive`: Whether unlink() will remove the tempdir recursively.
*   `unlink`: A special function for you to remove the directory. If you
    invoke it with a callback function, it will become asynchronous. If the
    directory is not tracked, it may throw when an error occurs or the first
    argument of the callback function will be an Error object.

### tempfs.mkdirSync([options]): dir

The synchronous version of `tempfs.mkdir`. It will throw when an error happens.

### tempfs.clear([callback])

Remove all tracked files and directories asynchronously.

### tempfs.clearSync()

Remove all tracked files and directories synchronously.


## License

The MIT License (MIT)
