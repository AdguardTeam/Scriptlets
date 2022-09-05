import {
    hit,
    matchStackTrace,
    getWildcardPropertyInChain,
    // following helpers are needed for helpers above
    toRegExp,
    getWildcardSymbol,
    getNativeRegexpTest,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet json-prune
 *
 * @description
 * Removes specified properties from the result of calling JSON.parse and returns the caller
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#json-prunejs-
 *
 * Related ABP source:
 * https://github.com/adblockplus/adblockpluscore/blob/master/lib/content/snippets.js#L1285
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps [, stack]]])
 * ```
 *
 * - `propsToRemove` - optional, string of space-separated properties to remove
 * - `obligatoryProps` - optional, string of space-separated properties which must be all present for the pruning to occur
 * - `stack` - optional, string or regular expression that must match the current function call stack trace;
 * if regular expression is invalid it will be skipped
 *
 * > Note please that you can use wildcard `*` for chain property name.
 * e.g. 'ad.*.src' instead of 'ad.0.src ad.1.src ad.2.src ...'
 *
 * **Examples**
 * 1. Removes property `example` from the results of JSON.parse call
 *     ```
 *     example.org#%#//scriptlet('json-prune', 'example')
 *     ```
 *
 *     For instance, the following call will return `{ one: 1}`
 *
 *     ```html
 *     JSON.parse('{"one":1,"example":true}')
 *     ```
 *
 * 2. If there are no specified properties in the result of JSON.parse call, pruning will NOT occur
 *     ```
 *     example.org#%#//scriptlet('json-prune', 'one', 'obligatoryProp')
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
 *     ```
 *     example.org#%#//scriptlet('json-prune', 'a.b', 'adpath.url.first')
 *     ```
 *
 * 4. Removes property `content.ad` from the results of JSON.parse call if its error stack trace contains `test.js`
 *     ```
 *     example.org#%#//scriptlet('json-prune', 'content.ad', '', 'test.js')
 *     ```
 *
 * 5. A property in a list of properties can be a chain of properties with wildcard in it
 *
 *     ```
 *     example.org#%#//scriptlet('json-prune', 'content.*.media.src', 'content.*.media.preroll')
 *     ```
 *
 * 6. Call with no arguments will log the current hostname and json payload at the console
 *     ```
 *     example.org#%#//scriptlet('json-prune')
 *     ```
 *
 * 7. Call with only second argument will log the current hostname and matched json payload at the console
 *     ```
 *     example.org#%#//scriptlet('json-prune', '', '"id":"117458"')
 *     ```
 */
/* eslint-enable max-len */
export function jsonPrune(source, propsToRemove, requiredInitialProps, stack) {
    if (!!stack && !matchStackTrace(stack, new Error().stack)) {
        return;
    }
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    const prunePaths = propsToRemove !== undefined && propsToRemove !== ''
        ? propsToRemove.split(/ +/)
        : [];
    const requiredPaths = requiredInitialProps !== undefined && requiredInitialProps !== ''
        ? requiredInitialProps.split(/ +/)
        : [];

    function isPruningNeeded(root) {
        if (!root) {
            return false;
        }

        let shouldProcess;

        // Only log hostname and matched JSON payload if only second argument is present
        if (prunePaths.length === 0 && requiredPaths.length > 0) {
            const rootString = JSON.stringify(root);
            const matchRegex = toRegExp(requiredPaths.join(''));
            const shouldLog = matchRegex.test(rootString);
            if (shouldLog) {
                log(window.location.hostname, root);
                shouldProcess = false;
                return shouldProcess;
            }
        }

        for (let i = 0; i < requiredPaths.length; i += 1) {
            const requiredPath = requiredPaths[i];
            const lastNestedPropName = requiredPath.split('.').pop();

            const hasWildcard = requiredPath.indexOf('.*.') > -1
                || requiredPath.indexOf('*.') > -1
                || requiredPath.indexOf('.*') > -1
                || requiredPath.indexOf('.[].') > -1
                || requiredPath.indexOf('[].') > -1
                || requiredPath.indexOf('.[]') > -1;

            // if the path has wildcard, getPropertyInChain should 'look through' chain props
            const details = getWildcardPropertyInChain(root, requiredPath, hasWildcard);

            // start value of 'shouldProcess' due to checking below
            shouldProcess = !hasWildcard;

            for (let i = 0; i < details.length; i += 1) {
                if (hasWildcard) {
                    // if there is a wildcard,
                    // at least one (||) of props chain should be present in object
                    shouldProcess = !(details[i].base[lastNestedPropName] === undefined)
                        || shouldProcess;
                } else {
                    // otherwise each one (&&) of them should be there
                    shouldProcess = !(details[i].base[lastNestedPropName] === undefined)
                        && shouldProcess;
                }
            }
        }

        return shouldProcess;
    }

    /**
     * Prunes properties of 'root' object
     * @param {Object} root
     */
    const jsonPruner = (root) => {
        if (prunePaths.length === 0 && requiredPaths.length === 0) {
            log(window.location.hostname, root);
            return root;
        }

        try {
            if (isPruningNeeded(root) === false) {
                return root;
            }

            // if pruning is needed, we check every input pathToRemove
            // and delete it if root has it
            prunePaths.forEach((path) => {
                const ownerObjArr = getWildcardPropertyInChain(root, path, true);
                ownerObjArr.forEach((ownerObj) => {
                    if (ownerObj !== undefined && ownerObj.base) {
                        delete ownerObj.base[ownerObj.prop];
                        hit(source);
                    }
                });
            });
        } catch (e) {
            log(e.toString());
        }

        return root;
    };

    const nativeJSONParse = JSON.parse;
    const jsonParseWrapper = (...args) => {
        // dealing with stringified json in args, which should be parsed.
        // so we call nativeJSONParse as JSON.parse which is bound to JSON object
        const root = nativeJSONParse.apply(JSON, args);
        return jsonPruner(root);
    };

    // JSON.parse mocking
    jsonParseWrapper.toString = nativeJSONParse.toString.bind(nativeJSONParse);
    JSON.parse = jsonParseWrapper;

    // eslint-disable-next-line compat/compat
    const nativeResponseJson = Response.prototype.json;
    // eslint-disable-next-line func-names
    const responseJsonWrapper = function () {
        const promise = nativeResponseJson.apply(this);
        return promise.then((obj) => {
            return jsonPruner(obj);
        });
    };

    // do nothing if browser does not support Response (e.g. Internet Explorer)
    // https://developer.mozilla.org/en-US/docs/Web/API/Response
    if (typeof Response === 'undefined') {
        return;
    }

    // eslint-disable-next-line compat/compat
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
    toRegExp,
    getWildcardSymbol,
    getNativeRegexpTest,
];
