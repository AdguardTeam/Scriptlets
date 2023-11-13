import {
    hit,
    matchStackTrace,
    getWildcardPropertyInChain,
    logMessage,
    toRegExp,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet evaldata-prune
 *
 * @description
 * Removes specified properties from the result of calling eval (if payloads contains `Object`) and returns to the caller.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/c8de9041917b61035171e454df886706f27fc4f3
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('evaldata-prune'[, propsToRemove [, obligatoryProps [, stack]]])
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
 * 1. Removes property `example` from the payload of the eval call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', 'example')
 *     ```
 *
 *     For instance, the following call will return `{ one: 1}`
 *
 *     ```html
 *     eval({ one: 1, example: true })
 *     ```
 *
 * 2. If there are no specified properties in the payload of eval call, pruning will NOT occur
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', 'one', 'obligatoryProp')
 *     ```
 *
 *     For instance, the following call will return `{ one: 1, two: 2}`
 *
 *     ```html
 *     JSON.parse('{"one":1,"two":2}')
 *     ```
 *
 * 3. A property in a list of properties can be a chain of properties
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', 'a.b', 'ads.url.first')
 *     ```
 *
 * 4. Removes property `content.ad` from the payload of eval call if its error stack trace contains `test.js`
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', 'content.ad', '', 'test.js')
 *     ```
 *
 * 5. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', 'content.*.media.src', 'content.*.media.ad')
 *     ```
 *
 * 6. Call with no arguments will log the current hostname and object payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune')
 *     ```
 *
 * 7. Call with only second argument will log the current hostname and matched object payload at the console
 *
 *     ```adblock
 *     example.org#%#//scriptlet('evaldata-prune', '', '"id":"117458"')
 *     ```
 *
 * @added v1.9.37.
 */
/* eslint-enable max-len */
export function evalDataPrune(source, propsToRemove, requiredInitialProps, stack) {
    const prunePaths = getPrunePath(propsToRemove);
    const requiredPaths = getPrunePath(requiredInitialProps);

    const nativeObjects = {
        nativeStringify: window.JSON.stringify,
    };

    const evalWrapper = (target, thisArg, args) => {
        let data = Reflect.apply(target, thisArg, args);
        if (typeof data === 'object') {
            data = jsonPruner(source, data, prunePaths, requiredPaths, stack, nativeObjects);
        }
        return data;
    };

    const evalHandler = {
        apply: evalWrapper,
    };
    // eslint-disable-next-line no-eval
    window.eval = new Proxy(window.eval, evalHandler);
}

evalDataPrune.names = [
    'evaldata-prune',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'evaldata-prune.js',
    'ubo-evaldata-prune.js',
    'ubo-evaldata-prune',
];

evalDataPrune.injections = [
    hit,
    matchStackTrace,
    getWildcardPropertyInChain,
    logMessage,
    toRegExp,
    isPruningNeeded,
    jsonPruner,
    getPrunePath,
    // following helpers are needed for helpers above
    getNativeRegexpTest,
    shouldAbortInlineOrInjectedScript,
];
