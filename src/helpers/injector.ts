import { minify } from 'terser';

import { type Redirect, type Scriptlet } from '../../types/types';
import { type Source } from '../scriptlets';

/**
 * Converts an arrow function string to a named function declaration string.
 *
 * Handles both:
 * - `(param) => { body }`  →  `function name(param) { body }`
 * - `(param) => expr`      →  `function name(param) { return expr; }`
 *
 * This is needed because Rolldown preserves arrow function syntax, but
 * injected helpers must be proper named function declarations so that:
 * 1. They can be referenced by name from the enclosing scriptlet.
 * 2. They can be used as constructor replacements (arrow functions
 *    throw "is not a constructor" when used with `new`).
 *
 * @param name The function name.
 * @param arrowStr The arrow function source string, e.g. "() => {}".
 * @returns A named function declaration string.
 */
const arrowToFunction = (name: string, arrowStr: string): string => {
    // Match arrow function: optional parens around params, then =>, then body/expression
    // Group 1: parameters (with parens if present)
    // Group 2: body (block) or expression
    const match = arrowStr.match(/^(\([^)]*\)|\w+)\s*=>\s*(\{[\s\S]*\}|.+)$/);
    if (!match) {
        // If regex doesn't match, fall back to const-wrapping
        return `const ${name} = ${arrowStr}`;
    }

    const params = match[1];
    const body = match[2];

    if (body.startsWith('{')) {
        // Block body: (params) => { ... }
        return `function ${name}${params} ${body}`;
    }

    // Expression body: (params) => expr
    return `function ${name}${params} { return ${body}; }`;
};

/**
 * Concat dependencies to scriptlet code.
 *
 * Dependencies are minified using Terser while preserving their names.
 *
 * @param scriptlet scriptlet or redirect function
 * @returns string view of scriptlet with attached dependencies
 */
export async function attachDependencies(scriptlet: Scriptlet | Redirect): Promise<string> {
    const { injections = [] } = scriptlet;

    // Minify each dependency while preserving its name
    const minifiedDeps = await Promise.all(injections.map(async (dep) => {
        try {
            const depName = dep.name;
            const depStr = dep.toString();

            // If the dependency is an arrow function (i.e., not starting with
            // 'function'), convert it to a named function declaration.
            // This is needed because Rolldown preserves arrow function syntax
            // (unlike the old Babel pipeline which converted them to named
            // function declarations). The const-wrapping approach is not
            // sufficient because some helpers (e.g. noopFunc) are used as
            // constructor replacements (new noopFunc()) and arrow functions
            // cannot be constructors.
            // See AG-51048.
            const depCode = depName && !/^function\b/.test(depStr)
                ? arrowToFunction(depName, depStr)
                : depStr;

            const result = await minify(depCode, {
                compress: {
                    drop_debugger: false,
                },
                mangle: {
                    // injection functions should be accessible by the same name
                    // so we preserve their names
                    keep_fnames: true,
                },
            });
            // Fallback to original if minification fails
            return result.code || depCode;
        } catch (e) {
            // If minification fails, return the original dependency code
            const depName = dep.name;
            const depStr = dep.toString();
            return depName && !/^function\b/.test(depStr)
                ? arrowToFunction(depName, depStr)
                : depStr;
        }
    }));

    // Combine the minified dependencies with the scriptlet code
    // NOTE: Semicolon separators are critical. Terser 5.x cannot parse 3+
    // consecutive arrow expressions (e.g., () => {}, () => [], () => true)
    // without explicit statement boundaries. See AG-51048.
    return minifiedDeps.reduce((acc: string, depCode: string) => {
        return `${acc};\n${depCode}`;
    }, scriptlet.toString());
}

/**
 * Wraps a scriptlet call within an existing code block to ensure it executes only once per unique context.
 *
 * This function constructs a wrapper around the provided scriptlet function and its corresponding code block.
 * It uses a unique identifier to prevent the scriptlet from being executed multiple times in the same context.
 *
 * @param scriptlet - The scriptlet function to be executed.
 * @param code - The string representation of the scriptlet's code.
 * @returns A string that represents the wrapped scriptlet call, ensuring it executes only once per unique context.
 */
export function addCall(scriptlet: Scriptlet, code: string): string {
    return `
    const flag = 'done';
    const uniqueIdentifier = source.uniqueId + source.name + '_' + (Array.isArray(args) ? args.join('_') : '');
    // Check if the scriptlet has already been executed using the unique identifier
    if (source.uniqueId) {
        if (Window.prototype.toString[uniqueIdentifier] === flag) { return; }
    }
    ${code}
    const updatedArgs = args ? [].concat(source).concat(args) : [source];
    try {
        ${scriptlet.name}.apply(this, updatedArgs);
        if (source.uniqueId) {
            Object.defineProperty(Window.prototype.toString, uniqueIdentifier, {
                value: flag,
                enumerable: false,
                writable: false,
                configurable: false
            });
        }
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
