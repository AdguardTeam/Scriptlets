import { hit, getPropertyInChain } from '../helpers';

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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('json-prune'[, propsToRemove [, obligatoryProps]])
 * ```
 *
 * - `propsToRemove` - optional, string of space-separated properties to remove
 * - `obligatoryProps` - optional, string of space-separated properties which must be all present for the pruning to occur
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
 * 4. Call with no arguments will log the current hostname and json payload at the console
 *     ```
 *     example.org#%#//scriptlet('json-prune')
 *     ```
 */
/* eslint-enable max-len */
export function jsonPrune(source, propsToRemove, requiredInitialProps) {
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    const prunePaths = propsToRemove !== undefined && propsToRemove !== ''
        ? propsToRemove.split(/ +/)
        : [];
    const needlePaths = requiredInitialProps !== undefined && requiredInitialProps !== ''
        ? requiredInitialProps.split(/ +/)
        : [];

    function isPruningNeeded(root) {
        if (!root) {
            return false;
        }

        for (let i = 0; i < needlePaths.length; i += 1) {
            const needlePath = needlePaths[i];
            const details = getPropertyInChain(root, needlePath, false);
            const nestedPropName = needlePath.split('.').pop();
            if (details && details.base[nestedPropName] === undefined) {
                return false;
            }
        }
        return true;
    }

    const nativeParse = JSON.parse;

    const parseWrapper = (...args) => {
        const r = nativeParse.apply(window, args);
        if (prunePaths.length === 0) {
            log(window.location.hostname, r);
            return r;
        }
        if (isPruningNeeded(r) === false) {
            return r;
        }
        prunePaths.forEach((path) => {
            const ownerObj = getPropertyInChain(r, path, false);
            if (ownerObj !== undefined && ownerObj.base) {
                delete ownerObj.base[ownerObj.prop];
            }
        });
        hit(source);
        return r;
    };

    JSON.parse = parseWrapper;
}

jsonPrune.names = [
    'json-prune',
    'json-prune.js',
    'ubo-json-prune.js',
];

jsonPrune.injections = [hit, getPropertyInChain];
