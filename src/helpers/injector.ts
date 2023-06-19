/**
 * Concat dependencies to scriptlet code
 *
 * @param scriptlet scriptlet or redirect function
 * @returns string view of scriptlet with attached dependencies
 */
export function attachDependencies(scriptlet: Scriptlet | Redirect): string {
    const { injections = [] } = scriptlet;
    return injections.reduce((accum, dep) => {
        return `${accum}\n${dep.toString()}`;
    }, scriptlet.toString());
}

/**
 * Add scriptlet call to existing code
 *
 * @param scriptlet scriptlet func
 * @param code scriptlet's string representation
 * @returns wrapped scriptlet call
 */
export function addCall(scriptlet: Scriptlet, code: string): string {
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
 * @param source - object with scriptlet properties
 * @param code - scriptlet source code with dependencies
 * @param redirect if function is redirect
 * @returns full scriptlet code
 */
export function passSourceAndProps(
    source: Source,
    code: string,
    redirect = false,
): string {
    const sourceString = JSON.stringify(source);
    const argsString = source.args ? `[${source.args.map((arg) => JSON.stringify(arg))}]` : undefined;
    const params = argsString ? `${sourceString}, ${argsString}` : sourceString;

    if (redirect) {
        return `(function(source, args){\n${code}\n})(${params});`;
    }

    return `(${code})(${params});`;
}

/**
 * Wrap code in no name function
 *
 * @param code which must be wrapped
 * @returns wrapped code
 */
export function wrapInNonameFunc(code: string): string {
    return `function(source, args){\n${code}\n}`;
}
