import {
    hit,
    matchStackTrace,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet json-prune
 *
 * @description
 * Removes specified properties from the result of calling JSON.parse and returns the caller.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#json-prunejs-
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/snippets/-/blob/main/source/behavioral/json-prune.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps [, stack]]])
 * ```
 *
 * - `propsToRemove` — optional, string of space-separated properties to remove
 * - `obligatoryProps` — optional, string of space-separated properties
 *   which must be all present for the pruning to occur
 * - `stack` — optional, string or regular expression that must match the current function call stack trace;
 *   if regular expression is invalid it will be skipped
 *
 * > Note please that you can use wildcard `*` for chain property name,
 * > e.g. `ad.*.src` instead of `ad.0.src ad.1.src ad.2.src`.
 *
 * ### Examples
 *
 * 1. Removes property `example` from the results of JSON.parse call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'example')
 *     ```
 *
 *     For instance, the following call will return `{ one: 1}`
 *
 *     ```html
 *     JSON.parse('{"one":1,"example":true}')
 *     ```
 *
 * 1. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'one', 'obligatoryProp')
 *     ```
 *
 *     For instance, the following call will return `{ one: 1, two: 2}`
 *
 *     ```html
 *     JSON.parse('{"one":1,"two":2}')
 *     ```
 *
 * 1. A property in a list of properties can be a chain of properties
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'a.b', 'ads.url.first')
 *     ```
 *
 * 1. Removes property `content.ad` from the results of JSON.parse call if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'content.ad', '', 'test.js')
 *     ```
 *
 * 1. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 * 1. Call with no arguments will log the current hostname and json payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune')
 *     ```
 *
 * 1. Call with only second argument will log the current hostname and matched json payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('json-prune', '', '"id":"117458"')
 *     ```
 *
 * @added v1.1.0.
 */
/* eslint-enable max-len */
export function jsonPrune(source, propsToRemove, requiredInitialProps, stack = '') {
    const prunePaths = getPrunePath(propsToRemove);
    const requiredPaths = getPrunePath(requiredInitialProps);

    const nativeObjects = {
        nativeStringify: window.JSON.stringify,
    };

    const nativeJSONParse = JSON.parse;
    const jsonParseWrapper = (...args) => {
        // dealing with stringified json in args, which should be parsed.
        // so we call nativeJSONParse as JSON.parse which is bound to JSON object
        const root = nativeJSONParse.apply(JSON, args);
        return jsonPruner(source, root, prunePaths, requiredPaths, stack, nativeObjects);
    };

    // JSON.parse mocking
    jsonParseWrapper.toString = nativeJSONParse.toString.bind(nativeJSONParse);
    JSON.parse = jsonParseWrapper;

    const nativeResponseJson = Response.prototype.json;
    // eslint-disable-next-line func-names
    const responseJsonWrapper = function () {
        const promise = nativeResponseJson.apply(this);
        return promise.then((obj) => {
            return jsonPruner(source, obj, prunePaths, requiredPaths, stack, nativeObjects);
        });
    };

    // do nothing if browser does not support Response (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/Response
    if (typeof Response === 'undefined') {
        return;
    }

    Response.prototype.json = responseJsonWrapper;
}

jsonPrune.names = [
    'json-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'json-prune.js',
    'ubo-json-prune.js',
    'ubo-json-prune',
    'abp-json-prune',
];

jsonPrune.injections = [
    hit,
    matchStackTrace,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
];
