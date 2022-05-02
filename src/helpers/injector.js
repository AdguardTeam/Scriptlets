/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */
export function attachDependencies(scriptlet) {
    const { injections = [] } = scriptlet;
    return injections.reduce((accum, dep) => {
        return `${accum}\n${dep.toString()}`;
    }, scriptlet.toString());
}

/**
 * Add scriptlet call to existing code
 * @param {Function} scriptlet
 * @param {string} code
 */
export function addCall(scriptlet, code) {
    return `${code}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        ${scriptlet.name}.apply(this, updatedArgs);
    } catch (e) {
        console.log(e);
    }`;
}

/**
 * Wrap function into IIFE (Immediately invoked function expression)
 *
 * @param {Source} source - object with scriptlet properties
 * @param {string} code - scriptlet source code with dependencies
 *
 * @param redirect
 * @returns {string} full scriptlet code
 *
 * @example
 * const source = {
 *      args: ["aaa", "bbb"],
 *      name: 'noeval',
 * };
 * const code = "function noeval(source, args) { alert(source); } noeval.apply(this, args);"
 * const result = wrapInIIFE(source, code);
 *
 * // result
 * `(function(source, args) {
 *      function noeval(source) { alert(source); }
 *      noeval.apply(this, args);
 * )({"args": ["aaa", "bbb"], "name":"noeval"}, ["aaa", "bbb"])`
 */
export function passSourceAndProps(source, code, redirect = false) {
    if (source.hit) {
        source.hit = source.hit.toString();
    }
    const sourceString = JSON.stringify(source);
    const argsString = source.args ? `[${source.args.map(JSON.stringify)}]` : undefined;
    const params = argsString ? `${sourceString}, ${argsString}` : sourceString;

    if (redirect) {
        return `(function(source, args){\n${code}\n})(${params});`;
    }

    return `(${code})(${params});`;
}

/**
 * Wrap code in no name function
 * @param {string} code which must be wrapped
 */
export function wrapInNonameFunc(code) {
    return `function(source, args){\n${code}\n}`;
}
