/* eslint-disable no-console */
import path from 'path';
import { minify } from 'terser';

import * as scriptletList from '../src/scriptlets/scriptlets-list';
import { version } from '../package.json';
import { writeFile } from './helpers';

const buildCorelibsJson = async () => {
    const { getScriptletFunction } = require('../tmp/scriptlets-func'); // eslint-disable-line import/no-unresolved,global-require

    const scriptlets = await Promise.all(Object
        .values(scriptletList)
        .map(async (s) => {
            const names = [...s.names];
            const scriptlet = getScriptletFunction(s.names[0])
                .toString();
            const result = await minify(scriptlet, {
                mangle: false,
                compress: {},
                format: { comments: false },
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
