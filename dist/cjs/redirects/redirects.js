"use strict";

var _defineProperty = require("@babel/runtime/helpers/defineProperty");

var jsYaml = require("js-yaml");

var getErrorMessage = require("../helpers/get-error-message.js");

function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter((function(r) {
            return Object.getOwnPropertyDescriptor(e, r).enumerable;
        }))), t.push.apply(t, o);
    }
    return t;
}

function _objectSpread(e) {
    for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), !0).forEach((function(r) {
            _defineProperty(e, r, t[r]);
        })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach((function(r) {
            Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
        }));
    }
    return e;
}

class Redirects {
    constructor(rawYaml) {
        try {
            var arrOfRedirects = jsYaml.safeLoad(rawYaml);
            this.redirects = arrOfRedirects.reduce((function(acc, redirect) {
                return _objectSpread(_objectSpread({}, acc), {}, {
                    [redirect.title]: redirect
                });
            }), {});
        } catch (e) {
            console.log(`Unable to load YAML into JavaScript: ${getErrorMessage.getErrorMessage(e)}`);
            throw e;
        }
    }
    getRedirect(title) {
        var _this = this;
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
            return this.redirects[title];
        }
        var values = Object.keys(this.redirects).map((function(key) {
            return _this.redirects[key];
        }));
        return values.find((function(redirect) {
            var {aliases: aliases} = redirect;
            if (!aliases) {
                return false;
            }
            return aliases.includes(title);
        }));
    }
    isBlocking(title) {
        var redirect = this.redirects[title];
        if (redirect) {
            return !!redirect.isBlocking;
        }
        return false;
    }
}

exports.Redirects = Redirects;
