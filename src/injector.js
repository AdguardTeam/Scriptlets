import * as dependencies from './helpers';
import * as scriptletList from './scriptlets';

/**
 * Concat dependencies to scriptlet code
 * @param {string} scriptlet string view of scriptlet
 */
export function attachdependencies(scriptlet) {
    return scriptlet.injections.reduce((accum, dep) =>
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
    return `(function(source, args){
        ${code}
    })(${sourcString}, ${argsString})`;
}

/**
* Returns scriptlet code by params
* 
* @param {Object} source params object
* @property {string}  source.name Scriptlets name
* @property {'extension'|'corelibs'}  source.engine Platform where scriptlet will be executed
* @property {string}  source.version Engine version
* @property {Function}  source.hit This function needs to be called when scriptlet was executed and done its work
* @property {Array<string>}  source.args Arguments which need to pass in scriptlet
*/
export function getScriptletCode(source) {
    if (!source.name) {
        return;
    }

    const scriptlet = Object
        .values(scriptletList)
        .find(s => s.sName === source.name);

    if (!scriptlet) {
        return;
    }

    let result = attachdependencies(scriptlet);
    result = addScriptletCall(scriptlet, result);
    result = wrapInIIFE(source, result);

    return result;
}