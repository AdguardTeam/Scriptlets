"use strict";

var getErrorMessage = function getErrorMessage(error) {
    var isErrorWithMessage = function isErrorWithMessage(e) {
        return typeof e === "object" && e !== null && "message" in e && typeof e.message === "string";
    };
    if (isErrorWithMessage(error)) {
        return error.message;
    }
    try {
        return new Error(JSON.stringify(error)).message;
    } catch (_unused) {
        return new Error(String(error)).message;
    }
};

exports.getErrorMessage = getErrorMessage;
