"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var fs = __importStar(require("fs"));
var crypto = __importStar(require("crypto"));
var path = __importStar(require("path"));
var process = __importStar(require("process"));
var create_cache_key_function_1 = __importDefault(require("@jest/create-cache-key-function"));
var jsonc_parser_1 = require("jsonc-parser");
var core_1 = require("@swc/core");
var package_json_1 = require("./package.json");
function createTransformer(swcTransformOpts) {
    var _a, _b;
    var computedSwcOptions = buildSwcTransformOpts(swcTransformOpts);
    var cacheKeyFunction = (0, create_cache_key_function_1.default)([], [core_1.version, package_json_1.version, JSON.stringify(computedSwcOptions)]);
    var _c = (_b = (_a = swcTransformOpts === null || swcTransformOpts === void 0 ? void 0 : swcTransformOpts.experimental) === null || _a === void 0 ? void 0 : _a.customCoverageInstrumentation) !== null && _b !== void 0 ? _b : {}, canInstrument = _c.enabled, instrumentOptions = __rest(_c, ["enabled"]);
    return {
        canInstrument: !!canInstrument,
        process: function (src, filename, jestOptions) {
            // Determine if we actually instrument codes if jest runs with --coverage
            insertInstrumentationOptions(jestOptions, !!canInstrument, computedSwcOptions, instrumentOptions);
            return (0, core_1.transformSync)(src, __assign(__assign({}, computedSwcOptions), { module: __assign(__assign({}, computedSwcOptions.module), { type: jestOptions.supportsStaticESM
                        ? "es6"
                        : "commonjs" }), filename: filename }));
        },
        processAsync: function (src, filename, jestOptions) {
            insertInstrumentationOptions(jestOptions, !!canInstrument, computedSwcOptions, instrumentOptions);
            return (0, core_1.transform)(src, __assign(__assign({}, computedSwcOptions), { module: __assign(__assign({}, computedSwcOptions.module), { 
                    // async transform is always ESM
                    type: "es6" }), filename: filename }));
        },
        getCacheKey: function (src, filename) {
            var rest = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                rest[_i - 2] = arguments[_i];
            }
            // @ts-expect-error - type overload is confused
            var baseCacheKey = cacheKeyFunction.apply(void 0, __spreadArray([src, filename], rest, false));
            var options = typeof rest[0] === "string" ? rest[1] : rest[0];
            return crypto
                .createHash("sha1")
                .update(baseCacheKey)
                .update("\0", "utf8")
                .update(JSON.stringify({
                supportsStaticESM: options.supportsStaticESM,
            }))
                .digest("hex");
        },
    };
}
function getOptionsFromSwrc() {
    var swcrc = path.join(process.cwd(), ".swcrc");
    if (fs.existsSync(swcrc)) {
        var errors = [];
        var options = (0, jsonc_parser_1.parse)(fs.readFileSync(swcrc, "utf-8"), errors);
        if (errors.length > 0) {
            throw new Error("Error parsing ".concat(swcrc, ": ").concat(errors.join(", ")));
        }
        return options;
    }
    return {};
}
var nodeTargetDefaults = new Map([
    ["12", "es2018"],
    ["13", "es2019"],
    ["14", "es2020"],
    ["15", "es2021"],
    ["16", "es2021"],
    ["17", "es2022"],
    ["18", "es2022"],
    ["19", "es2022"],
    ["20", "es2022"],
    // TODO: Use es2023 once @swc/core supports it
    // ['18', 'es2023'],
    // ['19', 'es2023'],
    // ['20', 'es2023'],
]);
function buildSwcTransformOpts(swcOptions) {
    var _a, _b, _c;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    var _d = swcOptions && Object.keys(swcOptions).length > 0
        ? swcOptions
        : getOptionsFromSwrc(), experimental = _d.experimental, computedSwcOptions = __rest(_d, ["experimental"]);
    if (!computedSwcOptions.env && !((_a = computedSwcOptions.jsc) === null || _a === void 0 ? void 0 : _a.target)) {
        set(computedSwcOptions, "jsc.target", 
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        nodeTargetDefaults.get((_b = process.version) === null || _b === void 0 ? void 0 : _b.match(/v(\d+)/)[1]) ||
            "es2018");
    }
    set(computedSwcOptions, "jsc.transform.hidden.jest", true);
    if (!computedSwcOptions.sourceMaps) {
        set(computedSwcOptions, "sourceMaps", "inline");
    }
    if ((_c = computedSwcOptions.jsc) === null || _c === void 0 ? void 0 : _c.baseUrl) {
        set(computedSwcOptions, "jsc.baseUrl", path.resolve(computedSwcOptions.jsc.baseUrl));
    }
    return computedSwcOptions;
}
function insertInstrumentationOptions(jestOptions, canInstrument, swcTransformOpts, instrumentOptions) {
    var _a, _b, _c, _d;
    var shouldInstrument = jestOptions.instrument && canInstrument;
    if (!shouldInstrument) {
        return swcTransformOpts;
    }
    if ((_c = (_b = (_a = swcTransformOpts === null || swcTransformOpts === void 0 ? void 0 : swcTransformOpts.jsc) === null || _a === void 0 ? void 0 : _a.experimental) === null || _b === void 0 ? void 0 : _b.plugins) === null || _c === void 0 ? void 0 : _c.some(function (x) { return x[0] === "swc-plugin-coverage-instrument"; })) {
        return;
    }
    if (!swcTransformOpts.jsc) {
        swcTransformOpts.jsc = {};
    }
    if (!swcTransformOpts.jsc.experimental) {
        swcTransformOpts.jsc.experimental = {};
    }
    if (!Array.isArray(swcTransformOpts.jsc.experimental.plugins)) {
        swcTransformOpts.jsc.experimental.plugins = [];
    }
    (_d = swcTransformOpts.jsc.experimental.plugins) === null || _d === void 0 ? void 0 : _d.push([
        "swc-plugin-coverage-instrument",
        instrumentOptions !== null && instrumentOptions !== void 0 ? instrumentOptions : {},
    ]);
}
function set(obj, path, value) {
    var o = obj;
    var parents = path.split(".");
    var key = parents.pop();
    for (var _i = 0, parents_1 = parents; _i < parents_1.length; _i++) {
        var prop = parents_1[_i];
        if (o[prop] == null)
            o[prop] = {};
        o = o[prop];
    }
    o[key] = value;
}
module.exports = { createTransformer: createTransformer };
