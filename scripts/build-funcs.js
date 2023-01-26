/* eslint-disable no-console */
/**
 * Builds scriptlets module returning functions with dependencies placed inside scriptlets
 * e.g.
 * // before
 * const dependencyFunc = () => {};
 *
 * export const scriptletFunc = () => {
 *      dependencyFunc();
 * };
 *
 * // after
 * export const func = () => {
 *     const dependencyFunc = () => {};
 *     dependencyFunc();
 * };
 */
import path from 'path';
import { minify } from 'terser';
import { addCall, attachDependencies } from '../src/helpers/injector';
import { writeFile } from './helpers';

/**
 * Method creates string for file with scriptlets functions,
 * where dependencies are placed inside scriptlet functions
 *
 * @returns {string}
 */
const getScriptletFunctionsString = () => {
    function wrapInFunc(name, code) {
        return `function ${name}(source, args){\n${code}\n}`;
    }
    // we require scriptlets list dynamically, because scriptletsList file can be not built in the
    // moment of this script execution
    // eslint-disable-next-line import/no-unresolved,global-require
    const scriptletsList = require('../tmp/scriptlets-list');

    const scriptletsFunctions = Object.values(scriptletsList);

    const scriptletsStrings = scriptletsFunctions.map((scriptlet) => {
        const scriptletWithDeps = attachDependencies(scriptlet);
        const scriptletWithCall = addCall(scriptlet, scriptletWithDeps);
        return wrapInFunc(scriptlet.name, scriptletWithCall);
    });

    const scriptletsString = scriptletsStrings.join('\n');

    const scriptletsMapString = `const scriptletsMap = {\n${scriptletsFunctions.map((scriptlet) => {
        return scriptlet.names.map((name) => {
            return `'${name}': ${scriptlet.name}`;
        }).join(',\n');
    }).join(',\n')}\n}`;

    const exportString = `var getScriptletFunction = (name) => {
        return scriptletsMap[name];
    };
    export { getScriptletFunction };`;

    return `${scriptletsString}\n${scriptletsMapString}\n${exportString}`;
};

export const buildScriptletsFunc = async () => {
    console.log('Start building scriptlets functions...');

    const scriptletFunctions = getScriptletFunctionsString();
    const beautifiedScriptletFunctions = await minify(scriptletFunctions, {
        mangle: false,
        compress: false,
        format: { beautify: true },
    });

    await writeFile(path.resolve(__dirname, '../tmp/scriptlets-func.js'), beautifiedScriptletFunctions.code);

    console.log('Scriptlets functions built successfully');
};
