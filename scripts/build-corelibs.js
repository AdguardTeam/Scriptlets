/* eslint-disable no-console */
import path from 'path';
import { minify } from 'terser';

import * as scriptletNamesList from '../src/scriptlets/scriptlets-names-list';
import { version } from '../package.json';
import { writeFile } from './helpers';
import { DIST_DIR_NAME, CORELIBS_SCRIPTLETS_FILE_NAME } from './constants';

const corelibsScriptletsPath = path.join(__dirname, '../', DIST_DIR_NAME, CORELIBS_SCRIPTLETS_FILE_NAME);

const buildCorelibsJson = async () => {
    // eslint-disable-next-line import/no-unresolved,global-require
    const { getScriptletFunction } = require('../tmp/scriptlets-func');

    const scriptlets = await Promise.all(Object
        .values(scriptletNamesList)
        .map(async (names) => {
            const scriptlet = getScriptletFunction(names[0]).toString();
            const result = await minify(scriptlet, {
                mangle: false,
                format: { comments: false },
                // needed for "debug-" scriptlets
                // https://github.com/AdguardTeam/Scriptlets/issues/218
                compress: { drop_debugger: false },
            });
            return {
                names,
                scriptlet: result.code,
            };
        }));

    return JSON.stringify({
        version,
        scriptlets,
    }, null, 4);
};

export const buildScriptletsForCorelibs = async () => {
    console.log('Start building corelibs...');
    const json = await buildCorelibsJson();
    await writeFile(corelibsScriptletsPath, json);
    console.log('Corelibs built');
};
