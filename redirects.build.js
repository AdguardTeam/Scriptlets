import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';
import { EOL } from 'os';

import * as scriptletList from './src/scriptlets';

// define global variable scriptlets
// because require('./dist/scriptlets') trying to put scriptlets code in it
global.scriptlets = {};
require('./dist/scriptlets');

const FILE_NAME = 'redirects.yml';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const SCRIPTLET_REDIRECTS_PATH = './src/redirects/scriptlet-redirects.yml';

let scriptletsToAdd;
let staticRedirects;
try {
    scriptletsToAdd = yaml.safeLoad(fs.readFileSync(SCRIPTLET_REDIRECTS_PATH, 'utf8'));
    staticRedirects = yaml.safeLoad(fs.readFileSync(STATIC_REDIRECTS_PATH, 'utf8'));
} catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Unable to load yaml because of: ${e}`);
    throw e;
}

if (!fs.existsSync(PATH_TO_DIST)) {
    fs.mkdirSync(PATH_TO_DIST);
}

const scriptletsObject = Object
    .values(scriptletList)
    .filter((s) => {
        const name = s.names[0];
        return scriptletsToAdd.some(scriptletToAdd => scriptletToAdd.title === name);
    })
    .map((s) => {
        const name = s.names[0];
        const source = { name };
        const scriptlet = global.scriptlets.invoke(source);
        return { name, scriptlet };
    });

const scriptletRedirects = scriptletsToAdd.map((data) => {
    const { title } = data;
    const complement = scriptletsObject.find(obj => obj.name === title);

    if (complement) {
        return {
            ...data,
            contentType: 'application/javascript',
            content: complement.scriptlet,
        };
    }
    throw new Error(`Couldn't find source for scriptlets redirect: ${title}`);
});

const mergedRedirects = [...staticRedirects, ...scriptletRedirects];

try {
    let yamlRedirects = yaml.safeDump(mergedRedirects);
    // add empty line before titles
    yamlRedirects = yamlRedirects.split('- title:').join(`${EOL}- title:`).trimLeft();
    fs.writeFileSync(RESULT_PATH, yamlRedirects, 'utf8');
} catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Couldn't save to ${RESULT_PATH}, because of: ${e}`);
    throw e;
}
