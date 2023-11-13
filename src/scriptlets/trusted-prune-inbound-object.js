import {
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
} from '../helpers/index';

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
 *     For instance, the following call will return `['one']`
 *
 *     ```html
 *     Object.getOwnPropertyNames({ one: 1, example: true })
 *     ```
 *
 * 2. Removes property `ads` from the payload of the Object.keys call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'Object.keys', 'ads')
 *     ```
 *
 *     For instance, the following call will return `['one', 'two']`
 *
 *     ```html
 *     Object.keys({ one: 1, two: 2, ads: true })
 *     ```
 *
 * 3. Removes property `foo.bar` from the payload of the JSON.stringify call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar')
 *     ```
 *
 *     For instance, the following call will return `'{"foo":{"a":2},"b":3}'`
 *
 *     ```html
 *     JSON.stringify({ foo: { bar: 1, a: 2 }, b: 3 })
 *     ```
 *
 * 4. Removes property `foo.bar` from the payload of the JSON.stringify call if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-prune-inbound-object', 'JSON.stringify', 'foo.bar', '', 'test.js')
 *     ```
 *
 * 5. Call with only first and third argument will log the current hostname and matched payload at the console
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

trustedPruneInboundObject.names = [
    'trusted-prune-inbound-object',
    // trusted scriptlets support no aliases
];

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
];
