import {
    hit,
    matchStackTrace,
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-prune-inbound-object
 *
 * @description
 * Removes listed properties from the result of calling specific function (if payload contains `Object`)
 * and returns to the caller.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/1c9da227d7
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-prune-inbound-object', functionName[, propsToRemove [, obligatoryProps [, stack]]])
 * ```
 *
 * - `functionName` — required, the name of the function to trap, it must have an object as an argument
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
 * 1. Removes property `example` from the payload of the Object.getOwnPropertyNames call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.getOwnPropertyNames', 'example')
 *     ```
 *
 *     Function call:
 *
 *     ```js
 *     Object.getOwnPropertyNames({ one: 1, example: true })
 *     ```
 *
 *     Input:
 *
 *     ```json
 *     {
 *       "one": 1,
 *       "example": true
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     ["one"]
 *     ```
 *
 * 1. Removes property `ads` from the payload of the Object.keys call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.keys', 'ads')
 *     ```
 *
 *     Function call:
 *
 *     ```js
 *     Object.keys({ one: 1, two: 2, ads: true })
 *     ```
 *
 *     Input:
 *
 *     ```json
 *     {
 *       "one": 1,
 *       "two": 2,
 *       "ads": true
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     ["one", "two"]
 *     ```
 *
 * 1. Removes property `foo.bar` from the payload of the JSON.stringify call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar')
 *     ```
 *
 *     Function call:
 *
 *     ```js
 *     JSON.stringify({ foo: { bar: 1, a: 2 }, b: 3 })
 *     ```
 *
 *     Input:
 *
 *     ```json
 *     {
 *       "foo": {
 *         "bar": 1,
 *         "a": 2
 *       },
 *       "b": 3
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     {"foo":{"a":2},"b":3}
 *     ```
 *
 * 1. Removes property `foo.bar` from the payload of the JSON.stringify call if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar', '', 'test.js')
 *     ```
 *
 *     Function call:
 *
 *     ```js
 *     JSON.stringify({ foo: { bar: 1, a: 2 }, b: 3 })
 *     ```
 *
 *     Input:
 *
 *     ```json
 *     {
 *       "foo": {
 *         "bar": 1,
 *         "a": 2
 *       },
 *       "b": 3
 *     }
 *     ```
 *
 *     Output (if `test.js` in stack):
 *
 *     ```json
 *     {"foo":{"a":2},"b":3}
 *     ```
 *
 * 1. Removes all `slots` properties at any depth during Object.entries call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.entries', '*.slots')
 *     ```
 *
 *     Function call:
 *
 *     ```js
 *     Object.entries({
 *       ad: { slots: [1, 2], type: "banner" },
 *       main: { title: "News" }
 *     })
 *     ```
 *
 *     Input:
 *
 *     ```json
 *     {
 *       "ad": {
 *         "slots": [1, 2],
 *         "type": "banner"
 *       },
 *       "main": {
 *         "slots": [3, 4],
 *         "title": "News"
 *       }
 *     }
 *     ```
 *
 *     Output:
 *
 *     ```json
 *     [
 *       ["ad", { "type": "banner" }],
 *       ["main", { "title": "News" }]
 *     ]
 *     ```
 *
 * 1. Call with only first and third argument will log the current hostname and matched payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', '', 'bar', '')
 *     ```
 *
 * @added v1.9.91.
 */
/* eslint-enable max-len */
export function trustedPruneInboundObject(source, functionName, propsToRemove, requiredInitialProps, stack = '') {
    if (!functionName) {
        return;
    }

    const nativeObjects = {
        nativeStringify: window.JSON.stringify,
    };

    const { base, prop } = getPropertyInChain(window, functionName);
    if (!base || !prop || typeof base[prop] !== 'function') {
        const message = `${functionName} is not a function`;
        logMessage(source, message);
        return;
    }

    const prunePaths = getPrunePath(propsToRemove);
    const requiredPaths = getPrunePath(requiredInitialProps);

    const objectWrapper = (target, thisArg, args) => {
        let data = args[0];
        if (typeof data === 'object') {
            data = jsonPruner(source, data, prunePaths, requiredPaths, stack, nativeObjects);
            args[0] = data;
        }
        return Reflect.apply(target, thisArg, args);
    };

    const objectHandler = {
        apply: objectWrapper,
    };

    base[prop] = new Proxy(base[prop], objectHandler);
}

export const trustedPruneInboundObjectNames = [
    'trusted-prune-inbound-object',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedPruneInboundObject.primaryName = trustedPruneInboundObjectNames[0];

trustedPruneInboundObject.injections = [
    hit,
    matchStackTrace,
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    toRegExp,
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
];
