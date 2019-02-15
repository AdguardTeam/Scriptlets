import * as dependencies from './helpers';
import * as scriptletList from './scriptlets';

/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */
export function attachdependencies(scriptlet) {
    const { injections = [] } = scriptlet;
    return injections.reduce((accum, dep) =>
        accum += ('\n' + dependencies[dep.name]), scriptlet.toString());
}

/**
 * Add scriptlet call to existing code
 * @param {Add } scriptlet 
 */
export function addScriptletCall(scriptlet, code) {
    return `${code}\n${scriptlet.name}(source, args.join(','))`;
}

/**
 * Wrap function into IIFE
 * @param {Function} func injectable function
 * @param  {...any} args arguments for function
 */
export function wrapInIIFE(source, code) {
    const sourcString = JSON.stringify(source);
    const argsString = `[${source.args.map(JSON.stringify)}]`;
    return `(function(source, args){\n${code}\n})(${sourcString}, ${argsString})`;
}

/**
 * Wrap code in no name function
 * @param {string} code which must be wrapped
 */
export function wrapInNonameFunc(code) {
    return `function(source, args){\n${code}\n}`;
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
 * Find scriptlet by it's name
 * @param {string} name 
 */
export function getScriptletByName(name) {
    return Object
        .values(scriptletList)
        .find(s => s.sName === name);
}
/**
* Returns scriptlet code by params
* 
* @param {Object} source params object
* @property {string} source.name Scriptlets name
* @property {Array<string>} source.args Arguments which need to pass in scriptlet
* @property {'extension'|'corelibs'} source.engine Platform where scriptlet will be executed
* @property {string} [source.version] Engine version
* @property {Function} [source.hit] This function needs to be called when scriptlet was executed and done its work
*/
export function getScriptletCode(source) {
    if (!isValidScriptletSource(source)) {
        return;
    }

    const scriptlet = getScriptletByName(source.name);
    let result = attachdependencies(scriptlet);
    result = addScriptletCall(scriptlet, result);
    result = source.engine === 'corelibs'
        ? wrapInNonameFunc(result)
        : wrapInIIFE(source, result);

    return result;
}