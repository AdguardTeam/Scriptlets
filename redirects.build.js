import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';
import { EOL } from 'os';

import * as scriptletList from './src/scriptlets';
import project from './package';

// define global variable scriptlets
// because require('./dist/scriptlets') trying to put scriptlets code in it
global.scriptlets = {};
require('./dist/scriptlets');

const FILE_NAME = 'redirects.yml';
const CORELIBS_FILE_NAME = 'redirects.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const CORELIBS_RESULT_PATH = path.resolve(PATH_TO_DIST, CORELIBS_FILE_NAME);
const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const SCRIPTLET_REDIRECTS_PATH = './src/redirects/scriptlet-redirects.yml';
const banner = `#
#    AdGuard Scriptlets (Redirects Source)
#    Version ${project.version}
#
`;

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
        const [name, ...aliases] = s.names;
        const source = { name };
        const scriptlet = global.scriptlets.invoke(source);
        return { name, scriptlet, aliases };
    });

const scriptletRedirects = scriptletsToAdd.map((data) => {
    const { title } = data;
    const complement = scriptletsObject.find(obj => obj.name === title);

    if (complement) {
        return {
            ...data,
            aliases: complement.aliases,
            contentType: 'application/javascript',
            content: complement.scriptlet,
        };
    }
    throw new Error(`Couldn't find source for scriptlets redirect: ${title}`);
});

const mergedRedirects = [...staticRedirects, ...scriptletRedirects];

if (process.env.REDIRECTS !== 'CORELIBS') {
    // Build scriptlets.yml. It is used in the extension.
    try {
        let yamlRedirects = yaml.safeDump(mergedRedirects);
        // add empty line before titles
        yamlRedirects = yamlRedirects.split('- title:').join(`${EOL}- title:`).trimLeft();

        // add version and title to the top
        yamlRedirects = `${banner}${yamlRedirects}`;

        fs.writeFileSync(RESULT_PATH, yamlRedirects, 'utf8');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't save to ${RESULT_PATH}, because of: ${e.message}`);
        throw e;
    }
}

if (process.env.REDIRECTS === 'CORELIBS') {
    // Build scriptlets.json. It is used in the corelibs
    const base64Redirects = Object.values(mergedRedirects).map((redirect) => {
        const {
            contentType, content, title, aliases,
        } = redirect;
        let base64Content;
        let bas64ContentType = contentType;
        if (contentType.match(';base64')) {
            // yaml leaves new lines or spaces
            // replace them all because base64 isn't supposed to have them
            base64Content = content.replace(/(\r\n|\n|\r|\s)/gm, '');
        } else {
            base64Content = Buffer.from(content, 'binary').toString('base64');
            bas64ContentType = `${contentType};base64`;
        }
        return {
            title,
            aliases,
            contentType: bas64ContentType,
            content: base64Content.trim(),
        };
    });

    try {
        const jsonString = JSON.stringify(base64Redirects, null, 4);
        fs.writeFileSync(CORELIBS_RESULT_PATH, jsonString, 'utf8');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't save to ${CORELIBS_RESULT_PATH}, because of: ${e.message}`);
        throw e;
    }
}
