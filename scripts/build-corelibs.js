/* eslint-disable no-console */
import path from 'path';
import { minify } from 'terser';

import * as scriptletList from '../src/scriptlets/scriptlets-list';
import { version } from '../package.json';
import { writeFile } from './helpers';

const buildCorelibsJson = async () => {
    // eslint-disable-next-line import/no-unresolved,global-require
    const { getScriptletFunction } = require('../tmp/scriptlets-func');

    const scriptlets = await Promise.all(Object
        .values(scriptletList)
        .map(async (s) => {
            const names = [...s.names];
            const scriptlet = getScriptletFunction(s.names[0])
                .toString();
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
    await writeFile(path.resolve(__dirname, '../dist/scriptlets.corelibs.json'), json, 'utf8');
    console.log('Corelibs built');
};
