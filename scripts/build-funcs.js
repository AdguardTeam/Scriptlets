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
import path from 'node:path';
import { minify } from 'terser';
import { fileURLToPath } from 'node:url';

import { addCall, attachDependencies } from '../src/helpers/injector';
import { writeFile } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Method creates string for file with scriptlets functions,
 * where dependencies are placed inside scriptlet functions
 *
 * @returns {Promise<string>}
 */
const getScriptletFunctionsString = async () => {
    function wrapInFunc(name, code) {
        return `function ${name}(source, args){\n${code}\n}`;
    }
    // we require scriptlets list dynamically, because scriptletsList file can be not built in the
    // moment of this script execution
    // eslint-disable-next-line import/no-unresolved,global-require
    const scriptletsList = await import('../tmp/scriptlets-list');

    const scriptletsFunctions = Object.values(scriptletsList);

    const scriptletsStrings = await Promise.all(scriptletsFunctions.map(async (scriptlet) => {
        const scriptletWithDeps = await attachDependencies(scriptlet);
        const scriptletWithCall = addCall(scriptlet, scriptletWithDeps);
        return wrapInFunc(scriptlet.name, scriptletWithCall);
    }));

    const scriptletsString = scriptletsStrings.join('\n');

    const scriptletsNamesList = await import('../src/scriptlets/scriptlets-names-list');
    const scriptletNamesList = Object.values(scriptletsNamesList);

    const scriptletsMapString = `const scriptletsMap = {\n${scriptletNamesList
        .map((scriptletAliases) => {
            if (!scriptletAliases) {
                return '';
            }

            const primaryName = scriptletAliases[0];
            const scriptletFnName = scriptletsFunctions
                .filter((scriptletFn) => scriptletFn.primaryName === primaryName)[0].name;

            return scriptletAliases
                .map((name) => {
                    return `'${name}': ${scriptletFnName}`;
                })
                .join(',\n');
        })
        .filter((arg) => arg).join(',\n')}\n}`;

    const exportString = `var getScriptletFunction = (name) => {
        return scriptletsMap[name];
    };
    export { getScriptletFunction };`;

    return `${scriptletsString}\n${scriptletsMapString}\n${exportString}`;
};

export const buildScriptletsFunc = async () => {
    console.log('Start building scriptlets functions...');

    const scriptletFunctions = await getScriptletFunctionsString();
    const beautifiedScriptletFunctions = await minify(scriptletFunctions, {
        mangle: false,
        compress: false,
        format: { beautify: true },
    });

    await writeFile(path.resolve(__dirname, '../tmp/scriptlets-func.js'), beautifiedScriptletFunctions.code);

    console.log('Scriptlets functions built successfully');
};
