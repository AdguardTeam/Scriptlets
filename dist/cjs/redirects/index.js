"use strict";

var redirects = require("./redirects.js");

var redirectsMap = require("../tmp/redirects-map.js");

var getRedirectFilename = function getRedirectFilename(name) {
    return redirectsMap.redirectsMap[name];
};

exports.Redirects = redirects.Redirects;

exports.getRedirectFilename = getRedirectFilename;
