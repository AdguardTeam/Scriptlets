import { getScriptletCode } from './injector';

/**
 * Global scriptlet variable
 */
scriptlets = (() => {
    return { invoke: getScriptletCode }
})();