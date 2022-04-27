/* eslint-disable no-console */
import path from 'path';

import * as scriptletList from '../src/scriptlets/scriptlets-list';
import { version } from '../package.json';
import { getScriptletFunction } from '../tmp/scriptlets-func';
import { wrapInNonameFunc } from '../src/helpers/injector';
import { writeFile } from './helpers';

const buildCorelibsJson = () => {
    const scriptlets = Object
        .values(scriptletList)
        .map((s) => {
            const names = [...s.names];
            let scriptlet = wrapInNonameFunc(getScriptletFunction(s.names[0]).toString());
            scriptlet = scriptlet.replace(/\n/g, '');
            scriptlet = scriptlet.replace(/\s{2,}/g, '');

            return { names, scriptlet };
        });

    return JSON.stringify({ version, scriptlets }, null, 4);
};

export const buildCorelibs = async () => {
    console.log('Start building corelibs...');
    const json = buildCorelibsJson();
    await writeFile(path.resolve(__dirname, '../dist/scriptlets.corelibs.json'), json, 'utf8');
    console.log('Corelibs built');
};
