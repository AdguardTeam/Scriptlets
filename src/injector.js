import * as dependencies from './helpers';

/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */
function attachdependencies(scriptlet, scriptletDeps = []) {
    return scriptletDeps
        .reduce((accum, dep) => accum += dependencies[dep.name], scriptlet);
}

/**
 * Wrap function into IIFE
 * @param {Function} func injectable function
 * @param  {...any} args arguments for function
 */
function wrapInIIFE(func, args) {
    return '"use strict";(' + func + ')(' + args.map(JSON.stringify).join(',') + ');';
}

/**
 * Add dependencies code to scriptlet
 * @param {Function} scriptlet scriptlet function
 */
export function resolveDependencies(scriptlet) {
    return (args) => attachdependencies(
        wrapInIIFE(scriptlet, args),
        scriptlet.injections
    );
};