"use strict";

var _package = require("./package.json.js");

var scriptlets = require("./scriptlets/scriptlets.js");

var SCRIPTLETS_VERSION = _package.version;

exports.scriptlets = scriptlets.scriptlets;

exports.SCRIPTLETS_VERSION = SCRIPTLETS_VERSION;
