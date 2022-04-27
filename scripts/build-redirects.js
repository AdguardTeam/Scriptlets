import sha256 from 'crypto-js/sha256';
import Base64 from 'crypto-js/enc-base64';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { EOL } from 'os';

import * as redirectsList from '../src/redirects/redirects-list';
import { version } from '../package.json';
import { redirectsFilesList, getDataFromFiles } from './build-docs';
import { redirects } from '../tmp/redirects';

const FILE_NAME = 'redirects.yml';
const CORELIBS_FILE_NAME = 'redirects.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const REDIRECT_FILES_PATH = path.resolve(PATH_TO_DIST, 'redirect-files');
const CORELIBS_RESULT_PATH = path.resolve(PATH_TO_DIST, CORELIBS_FILE_NAME);

const REDIRECTS_DIRECTORY = '../src/redirects';
const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const BLOCKING_REDIRECTS_PATH = './src/redirects/blocking-redirects.yml';
const banner = `#
#    AdGuard Scriptlets (Redirects Source)
#    Version ${version}
#
`;

let staticRedirects;
try {
    staticRedirects = yaml.safeLoad(fs.readFileSync(STATIC_REDIRECTS_PATH, 'utf8'));
} catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Unable to load yaml because of: ${e}`);
    throw e;
}

let blockingRedirects;
try {
    const rawBlockingRedirects = yaml.safeLoad(fs.readFileSync(BLOCKING_REDIRECTS_PATH, 'utf8'));
    blockingRedirects = rawBlockingRedirects.map((raw) => {
        // get bundled html file as content for redirect
        const content = fs.readFileSync(path.resolve(REDIRECT_FILES_PATH, raw.title), 'utf8');
        // get babelized script content
        const scriptPath = path.resolve(REDIRECT_FILES_PATH, raw.scriptPath);
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        // needed for CSP in browser extension
        const sha = `sha256-${Base64.stringify(sha256(scriptContent))}`;
        // remove not needed dist script file
        fs.unlinkSync(scriptPath);
        return {
            ...raw,
            isBlocking: true,
            content,
            sha,
        };
    });
} catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Unable to load yaml because of: ${e}`);
    throw e;
}

const redirectsObject = Object
    .values(redirectsList)
    .map((rr) => {
        const [name, ...aliases] = rr.names;
        const source = {
            name,
            args: [],
        };

        const redirect = redirects.getCode(source);

        return {
            name,
            redirect,
            aliases,
        };
    });

const redirectsDescriptions = getDataFromFiles(redirectsFilesList, REDIRECTS_DIRECTORY)
    .flat(1);

/**
 * Returns first line of describing comment from redirect resource file
 * @param {string} rrName redirect resource name
 */
const getComment = (rrName) => {
    const { description } = redirectsDescriptions.find((rr) => rr.name === rrName);
    const descArr = description.split('\n');

    return descArr.find((str) => str !== '');
};

/**
 * Copies non-static redirects sources to dist
 *
 * @param redirectsData
 */
const prepareJsRedirectFiles = (redirectsData) => {
    Object.values(redirectsData)
        .forEach((redirect) => {
            const redirectPath = `${REDIRECT_FILES_PATH}/${redirect.file}`;
            fs.writeFileSync(redirectPath, redirect.content, 'utf8');
        });
};

/**
 * Prepares static redirects sources to dist
 *
 * @param redirectsData
 */
const prepareStaticRedirectFiles = (redirectsData) => {
    Object.values(redirectsData)
        .forEach((redirect) => {
            const {
                contentType,
                content,
                file,
            } = redirect;

            const redirectPath = `${REDIRECT_FILES_PATH}/${file}`;

            let contentToWrite = content;
            if (contentType.match(';base64')) {
                // yaml leaves new lines or spaces
                // replace them all because base64 isn't supposed to have them
                contentToWrite = content.replace(/(\r\n|\n|\r|\s)/gm, '');
                const buff = Buffer.from(contentToWrite, 'base64');
                fs.writeFileSync(redirectPath, buff);
            } else {
                fs.writeFileSync(redirectPath, contentToWrite, 'utf8');
            }
        });
};

const jsRedirects = redirectsFilesList.map((fileName) => {
    const rrName = fileName.replace(/\.js/, '');
    const complement = redirectsObject.find((obj) => obj.name === rrName);
    const comment = getComment(rrName);

    if (complement) {
        return {
            title: rrName,
            comment,
            aliases: complement.aliases,
            contentType: 'application/javascript',
            content: complement.redirect,
            file: fileName,
        };
    }
    throw new Error(`Couldn't find source for non-static redirect: ${fileName}`);
});

const mergedRedirects = [
    ...staticRedirects,
    ...blockingRedirects,
    ...jsRedirects,
];

export const buildRedirectsFiles = () => {
    try {
        let yamlRedirects = yaml.safeDump(mergedRedirects);

        // add empty line before titles
        yamlRedirects = yamlRedirects.split('- title:')
            .join(`${EOL}- title:`)
            .trimStart();

        // add version and title to the top
        yamlRedirects = `${banner}${yamlRedirects}`;

        fs.writeFileSync(RESULT_PATH, yamlRedirects, 'utf8');

        // redirect files
        if (!fs.existsSync(REDIRECT_FILES_PATH)) {
            fs.mkdirSync(REDIRECT_FILES_PATH);
        }

        prepareStaticRedirectFiles(staticRedirects);
        prepareJsRedirectFiles(jsRedirects);
        // blocking redirects have already been bundled to dist by rollup
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't save to ${RESULT_PATH}, because of: ${e.message}`);
        throw e;
    }
};

export const buildRedirectsForCorelibs = () => {
    // Build scriptlets.json. It is used in the corelibs
    const base64Redirects = Object.values(mergedRedirects)
        .map((redirect) => {
            const {
                contentType,
                content,
                title,
                aliases,
                isBlocking = false,
            } = redirect;
            let base64Content;
            let bas64ContentType = contentType;
            if (contentType.match(';base64')) {
                // yaml leaves new lines or spaces
                // replace them all because base64 isn't supposed to have them
                base64Content = content.replace(/(\r\n|\n|\r|\s)/gm, '');
            } else {
                base64Content = Buffer.from(content, 'binary')
                    .toString('base64');
                bas64ContentType = `${contentType};base64`;
            }
            return {
                title,
                aliases,
                isBlocking,
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
};
