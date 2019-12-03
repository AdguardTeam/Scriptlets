import yaml from 'js-yaml';
import * as redirectsList from './src/redirects';
import { version } from './package.json';

const fs = require('fs');
const path = require('path');
const { EOL } = require('os');

// define global variable redirects
// because require('./tmp/tmpRedirects') trying to put redirects code in it
global.redirects = {};
require('./tmp/tmpRedirects');

const FILE_NAME = 'redirects.yml';
const CORELIBS_FILE_NAME = 'redirects.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const CORELIBS_RESULT_PATH = path.resolve(PATH_TO_DIST, CORELIBS_FILE_NAME);

const SCRIPTLET_REDIRECTS_PATH = './src/redirects/scriptlet-redirects.yml';
const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const banner = `#
#    AdGuard Scriptlets (Redirects Source)
#    Version ${version}
#
`;

let redirectsToAdd;
let staticRedirects;
try {
    redirectsToAdd = yaml.safeLoad(fs.readFileSync(SCRIPTLET_REDIRECTS_PATH, 'utf8'));
    staticRedirects = yaml.safeLoad(fs.readFileSync(STATIC_REDIRECTS_PATH, 'utf8'));
} catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Unable to load yaml because of: ${e}`);
    throw e;
}

const redirectsObject = Object
    .values(redirectsList)
    .map((rr) => {
        const [name, ...aliases] = rr.names;
        const redirect = global.redirects.getCode(name);

        return { name, redirect, aliases };
    });

const nonStaticRedirects = redirectsToAdd.map((data) => {
    const { title } = data;
    const complement = redirectsObject.find((obj) => obj.name === title);

    if (complement) {
        return {
            ...data,
            aliases: complement.aliases,
            contentType: 'application/javascript',
            content: complement.redirect,
        };
    }
    throw new Error(`Couldn't find source for non-static redirect: ${title}`);
}).filter((i) => i);

const mergedRedirects = [...staticRedirects, ...nonStaticRedirects];

if (process.env.REDIRECTS !== 'CORELIBS') {
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
