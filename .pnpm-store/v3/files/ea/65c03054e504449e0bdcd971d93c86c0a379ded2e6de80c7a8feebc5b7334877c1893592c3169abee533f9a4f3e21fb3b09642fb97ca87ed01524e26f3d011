"use strict";

var _path = require("path");
var _child_process = require("child_process");
var _url = require("url");
var _v8flags = require("v8flags");
var _splitArgs = require("./split-args.js");
var _programSetup = require("./program-setup.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function getV8Flags() {
  function getNormalizedV8Flag(arg) {
    const matches = /--(?:no)?(.+)/.exec(arg);
    if (matches) {
      return `--${matches[1].replace(/_/g, "-")}`;
    }
    return arg;
  }
  return new Promise((resolve, reject) => {
    _v8flags((err, flags) => {
      if (err) {
        reject(err);
        return;
      }
      const flagsSet = new Set(flags.map(getNormalizedV8Flag));
      resolve(test => flagsSet.has(getNormalizedV8Flag(test)) || (process.allowedNodeEnvironmentFlags || require("node-environment-flags")).has(test));
    });
  });
}
const babelNodePath = _path.join(_path.dirname(__filename), "_babel-node");
_asyncToGenerator(function* () {
  {
    const args = [babelNodePath];
    let babelArgs = process.argv.slice(2);
    let userArgs;
    const argSeparator = babelArgs.indexOf("--");
    if (argSeparator > -1) {
      userArgs = babelArgs.slice(argSeparator);
      babelArgs = babelArgs.slice(0, argSeparator);
    }
    const isV8flag = yield getV8Flags();
    for (let i = 0; i < babelArgs.length; i++) {
      const arg = babelArgs[i];
      const flag = arg.split("=")[0];
      if (flag === "-d") {
        args.unshift("--debug");
        continue;
      } else if (flag === "-gc") {
        args.unshift("--expose-gc");
        continue;
      } else if (flag === "-r" || flag === "--require") {
        args.push(flag);
        args.push(babelArgs[++i]);
      } else if (flag === "debug" || flag === "inspect" || isV8flag(flag)) {
        args.unshift(arg);
      } else {
        args.push(arg);
      }
    }
    if (argSeparator > -1) {
      args.push(...userArgs);
    }
    yield spawn(args);
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
function spawn(_x) {
  return _spawn.apply(this, arguments);
}
function _spawn() {
  _spawn = _asyncToGenerator(function* (args) {
    try {
      const {
        default: kexec
      } = yield Promise.resolve().then(() => _interopRequireWildcard(require("kexec")));
      kexec(process.argv[0], args);
    } catch (err) {
      if (err.code !== "ERR_MODULE_NOT_FOUND" && err.code !== "MODULE_NOT_FOUND" && err.code !== "UNDECLARED_DEPENDENCY") {
        throw err;
      }
      const shouldPassthroughIPC = process.send !== undefined;
      const proc = _child_process.spawn(process.argv[0], args, {
        stdio: shouldPassthroughIPC ? ["inherit", "inherit", "inherit", "ipc"] : "inherit"
      });
      proc.on("exit", function (code, signal) {
        process.on("exit", function () {
          if (signal) {
            process.kill(process.pid, signal);
          } else {
            process.exitCode = code != null ? code : undefined;
          }
        });
      });
      if (shouldPassthroughIPC) {
        proc.on("message", message => process.send(message));
      }
      process.on("SIGINT", () => proc.kill("SIGINT"));
      process.on("SIGTERM", () => proc.kill("SIGTERM"));
    }
  });
  return _spawn.apply(this, arguments);
}

//# sourceMappingURL=babel-node.js.map
