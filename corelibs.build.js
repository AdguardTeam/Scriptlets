import fs from 'fs';
import path from 'path';

import * as scriptletList from './src/scriptlets/scriptletsList';
import { version } from './package.json';

// define global variable scriptlets
// because require('./dist/scriptlets') trying to put scriptlets code in it
global.scriptlets = {};
require('./dist/scriptlets');

const FILE_NAME = 'scriptlets.corelibs.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);

if (!fs.existsSync(PATH_TO_DIST)) {
    fs.mkdirSync(PATH_TO_DIST);
}

const scriptletsObject = Object
    .values(scriptletList)
    .map((s) => {
        const source = { name: s.names[0], engine: 'corelibs', args: [] };
        const names = [...s.names];
        let scriptlet = global.scriptlets.invoke(source);
        scriptlet = scriptlet.replace(/\n/g, '');
        scriptlet = scriptlet.replace(/\s{2,}/g, '');

        return { names, scriptlet };
    });

let json = { version, scriptlets: scriptletsObject };
json = JSON.stringify(json, null, 4);
const writeCallback = (err) => {
    if (err) {
        console.error(err); // eslint-disable-line no-console
        return;
    }
    console.log('corelibs built'); // eslint-disable-line no-console
};

fs.writeFile(RESULT_PATH, json, 'utf8', writeCallback);
