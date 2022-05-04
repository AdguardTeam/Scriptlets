import yaml from 'js-yaml';
import * as redirectsList from '../src/redirects/redirects-list';

const fs = require('fs');
const path = require('path');
const process = require('process');

// eslint-disable-next-line import/no-dynamic-require
const { redirectsFilesList } = require(path.resolve(process.cwd(), './scripts/build-docs'));

const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const BLOCKING_REDIRECTS_PATH = './src/redirects/blocking-redirects.yml';

export const staticRedirects = yaml.safeLoad(fs.readFileSync(STATIC_REDIRECTS_PATH, 'utf8'));
export const rawBlockingRedirects = yaml.safeLoad(fs.readFileSync(BLOCKING_REDIRECTS_PATH, 'utf8'));

const redirectsObject = Object
    .values(redirectsList)
    .map(({ names }) => {
        const [name, ...aliases] = names;
        return { name, aliases };
    });

const jsRedirects = redirectsFilesList.map((file) => {
    const name = file.replace(/\.js/, '');
    const found = redirectsObject.find((obj) => obj.name === name);

    if (found) {
        return {
            title: name,
            aliases: found.aliases,
            file,
        };
    }
    throw new Error(`Couldn't find source for non-static redirect: ${file}`);
});

const mergedRedirects = []
    .concat(staticRedirects)
    .concat(rawBlockingRedirects)
    .concat(jsRedirects);

const createRedirectsMap = (redirects) => {
    const map = {};

    redirects.forEach((item) => {
        const { title, aliases, file } = item;

        if (title) {
            map[title] = file;
        }

        if (aliases) {
            aliases.forEach((alias) => {
                map[alias] = file;
            });
        }
    });

    return JSON.stringify(map, null, 4);
};

const res = createRedirectsMap(mergedRedirects);

export default res;
