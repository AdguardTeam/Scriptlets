"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nodeFlagsWithValue = void 0;
exports.splitArgs = splitArgs;
const _nodeFlagsWithValue = require("../data/node-flags-with-value.json");
const nodeFlagsWithValue = exports.nodeFlagsWithValue = new Set(_nodeFlagsWithValue);
const nodeFlagsWithNoFile = new Set(["-p", "--print", "-e", "--eval"]);
function splitArgs(argv, extraOptionsWithValue) {
  const programArgs = [];
  let explicitSeparator = false;
  let ignoreFileName = null;
  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-") break;
    if (arg === "--") {
      explicitSeparator = true;
      i++;
      break;
    }
    if (arg[0] === "-") {
      var _ignoreFileName;
      programArgs.push(arg);
      if ((nodeFlagsWithValue.has(arg) || extraOptionsWithValue != null && extraOptionsWithValue.has(arg)) && i < argv.length - 1 && argv[i + 1][0] !== "-") {
        i++;
        programArgs.push(argv[i]);
      }
      if (nodeFlagsWithNoFile.has(arg)) (_ignoreFileName = ignoreFileName) != null ? _ignoreFileName : ignoreFileName = true;
    } else if (i === 0 && arg === "inspect") {
      programArgs.push(arg);
      ignoreFileName = false;
    } else {
      break;
    }
  }
  const fileName = !ignoreFileName && i < argv.length ? argv[i++] : null;
  const userArgs = argv.slice(i);
  return {
    programArgs,
    fileName,
    userArgs,
    explicitSeparator
  };
}

//# sourceMappingURL=split-args.js.map
