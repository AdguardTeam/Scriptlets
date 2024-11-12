import { type Redirect, type Scriptlet } from '../../types/types';
import { type Source } from '../scriptlets';

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
