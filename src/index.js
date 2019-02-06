import { getScriptletCode } from './injector';
// import * as scriptletList from './scriptlets';

/**
 * Global scriptlet variable
 */
scriptlets = (() => {
    return { invoke: getScriptletCode }
})();