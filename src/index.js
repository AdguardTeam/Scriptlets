import { getResolvedScriptletString } from './injector';
import * as scriptletList from './scriptlets';

/**
 * Global scriptlet variable
 */
scriptlets = (() => {

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

        const scriptlet = Object
            .values(scriptletList)
            .find(s => s.sName === data.name);

        if (!scriptlet) {
            return;
        }

        return getResolvedScriptletString(scriptlet, data.args);
    }

    return { invoke };
})();