/* eslint-disable no-console */
import { minify } from 'terser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPreparedRedirects } from './build-redirects';
import { writeFile } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    return `export const redirectsMap = ${JSON.stringify(map)}`;
};

const getRedirectsMap = async () => {
    const { mergedRedirects } = await getPreparedRedirects({ code: false });
    return createRedirectsMap(mergedRedirects);
};

export const buildRedirectsMap = async () => {
    console.log('Start building redirects map...');

    const redirectsMap = await getRedirectsMap();

    const beautifiedScriptletFunctions = await minify(redirectsMap, {
        mangle: false,
        compress: false,
        format: { beautify: true },
    });

    await writeFile(path.resolve(__dirname, '../tmp/redirects-map.js'), beautifiedScriptletFunctions.code);

    console.log('Finish building redirect map');
};
