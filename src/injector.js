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
 * Wrap function into IIFE
 * @param {Source} source
 * @param {string} code
 */
export function wrapInIIFE(source, code) {
    if (source.hit) {
        source.hit = `(${source.hit.toString()})()`;
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
