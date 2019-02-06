import * as scriptletList from './src/scriptlets';
import { getScriptletCode } from './src/injector';
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'scriptlets.corelibs.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);

if (!fs.existsSync(PATH_TO_DIST)) {
    fs.mkdirSync(PATH_TO_DIST);
}

let json = Object
    .values(scriptletList)
    .map(s => s.sName)
    .reduce((acc, name) => {
        const source = { name, engine: 'corelibs', args: [] };
        acc[name] = getScriptletCode(source);
        return acc;
    }, {});
json = JSON.stringify(json, null, 4);

const writeCallback = err => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('corelibs built');
};

fs.writeFile(RESULT_PATH, json, 'utf8', writeCallback);

