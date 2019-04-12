import * as dependencies from './helpers';
import * as scriptletList from './scriptlets';

/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */
export function attachDependencies(scriptlet) {
    const { injections = [] } = scriptlet;
    return injections.reduce((accum, dep) => `${accum}\n${dependencies[dep.name]}`, scriptlet.toString());
}

/**
 * Add scriptlet call to existing code
 * @param {Function} scriptlet
 * @param {string} code
 */
export function addScriptletCall(scriptlet, code) {
    return `${code};
        const updatedArgs = args ? [].concat(source).concat(args) : [source];
        ${scriptlet.name}.apply(this, updatedArgs);
    `;
}

/**
 * Returns arguments of the function
 * @source https://github.com/sindresorhus/fn-args
 * @param {function|string} [func] function or string
 * @returns {string[]}
 */
const getFuncArgs = func => func.toString()
    .match(/(?:\((.*)\))|(?:([^ ]*) *=>)/)
    .slice(1, 3)
    .find(capture => typeof capture === 'string')
    .split(/, */)
    .filter(arg => arg !== '')
    .map(arg => arg.replace(/\/\*.*\*\//, ''));

/**
 * Returns body of the function
 * @param {function|string} [func] function or string
 * @returns {string}
 */
const getFuncBody = (func) => {
    const regexp = /(?:(?:\((?:.*)\))|(?:(?:[^ ]*) *=>))\s?({?[\s\S]*}?)/;
    const funcString = func.toString();
    return funcString.match(regexp)[1];
};

/**
 * Wrap function into IIFE (Immediately invoked function expression)
 *
 * <code>
 *       const source = {
 *           args: ["aaa", "bbb"],
 *           name: "noeval",
 *       };
 *
 *      const code = "function noeval(source, args) {
 *                            alert(source);
 *                          }
 *      noeval.apply(this, args);"
 *
 *      const result = wrapInIIFE(source, code);
 *
 *      // result becomes a string
 *
 *      "(function(source, args){
 *                function noeval(source) {
 *                    alert(source);
 *                }
 *                noeval.apply(this, args);
 *        )({"args": ["aaa", "bbb"], "name":"noeval"}, ["aaa", "bbb"])"
 * </code>
 *
 * @param {Source} source - object with scriptlet properties
 * @param {string} code - scriptlet source code with dependencies
 * @return {string} full scriptlet code
 */
export function wrapInIIFE(source, code) {
    if (source.hit) {
        // if hit function has arguments, we get them in order to be able to build function after
        // e.g. function (a) { console.log(a) } ==> hitArgs: ["a"], hitBody: "console.log(a)";
        // hit function without arguments simply is called inside anonymous function
        // Check `stringToFunc` implementation to learn how this `hit` function is executed
        // by scriptlets.
        const stringifiedHit = source.hit.toString();
        const hitArgs = getFuncArgs(stringifiedHit);
        if (hitArgs.length > 0) {
            source.hitBody = getFuncBody(stringifiedHit);
            source.hitArgs = hitArgs;
        } else {
            source.hit = `(${stringifiedHit})()`;
        }
    }
    const sourceString = JSON.stringify(source);
    const argsString = source.args ? `[${source.args.map(JSON.stringify)}]` : undefined;
    const params = argsString ? `${sourceString}, ${argsString}` : sourceString;
    return `(function(source, args){\n${code}\n})(${params});`;
}

/**
 * Wrap code in no name function
 * @param {string} code which must be wrapped
 */
export function wrapInNonameFunc(code) {
    return `function(source, args){\n${code}\n}`;
}

/**
 * Find scriptlet by it's name
 * @param {string} name
 */
export function getScriptletByName(name) {
    return Object
        .values(scriptletList)
        .find(s => s.names && s.names.includes(name));
}

/**
 * Check is scriptlet params valid
 * @param {Object} source
 */
export function isValidScriptletSource(source) {
    if (!source.name) {
        return false;
    }
    const scriptlet = getScriptletByName(source.name);
    if (!scriptlet) {
        return false;
    }
    return true;
}

/**
* Returns scriptlet code by param
* @param {Source} source
*/
export function getScriptletCode(source) {
    if (!isValidScriptletSource(source)) {
        return null;
    }

    const scriptlet = getScriptletByName(source.name);
    let result = attachDependencies(scriptlet);
    result = addScriptletCall(scriptlet, result);
    result = source.engine === 'corelibs'
        ? wrapInNonameFunc(result)
        : wrapInIIFE(source, result);
    return result;
}
