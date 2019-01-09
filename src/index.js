import { resolveDependencies } from './injector';
import * as scriptlets from './scriptlets';

/**
 * Global scriptlet variable
 */
scriptlet = (() => {

    /**
     * Public method to run scriptlet execution
     * 
     * @param {Object} data params object
     * @property {string}  data.name Scriptlets name
     * @property {'extension'|'corelibs'}  data.engine Platform where scriptlet will be executed
     * @property {string}  data.version Engine version
     * @property {Function}  data.hit This function needs to be called when scriptlet was executed and done its work
     * @property {Array<string>}  data.args Arguments which need to pass in scriptlet
     */
    const invoke = (data) => {
        if (!data.name) {
            return;
        }
        if (!scriptlets[data.name]) {
            return;
        }

        const result = resolveDependencies(scriptlets[data.name]);
        return result(data.args);
    }

    return { invoke };
})();