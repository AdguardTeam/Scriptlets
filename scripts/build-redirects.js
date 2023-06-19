import sha256 from 'crypto-js/sha256';
import Base64 from 'crypto-js/enc-base64';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import { EOL } from 'os';

import { minify } from 'terser';
import * as redirectsList from '../src/redirects/redirects-list';
import { version } from '../package.json';
import { rollupStandard } from './rollup-runners';
import { writeFile, getDataFromFiles } from './helpers';
import { redirectsFilenames, REDIRECTS_SRC_RELATIVE_DIR_PATH } from './constants';
import {
    redirectsListConfig,
    click2LoadConfig,
    redirectsPrebuildConfig,
} from '../rollup.config';

const FILE_NAME = 'redirects.yml';
const CORELIBS_FILE_NAME = 'redirects.json';
const PATH_TO_DIST = './dist';

const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const REDIRECT_FILES_PATH = path.resolve(PATH_TO_DIST, 'redirect-files');
const CORELIBS_RESULT_PATH = path.resolve(PATH_TO_DIST, CORELIBS_FILE_NAME);

// TODO: check if constants may be used
const STATIC_REDIRECTS_PATH = './src/redirects/static-redirects.yml';
const BLOCKING_REDIRECTS_PATH = './src/redirects/blocking-redirects.yml';
const banner = `#
#    AdGuard Scriptlets (Redirects Source)
#    Version ${version}
#
`;

const getStaticRedirects = async () => {
    let staticRedirects;

    try {
        const staticRedirectsContent = await fs.readFile(STATIC_REDIRECTS_PATH);
        staticRedirects = yaml.safeLoad(staticRedirectsContent);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Unable to load yaml because of: ${e}`);
        throw e;
    }

    return staticRedirects;
};

const getBlockingRedirects = async () => {
    const completeRawBlockingRedirect = async (rawBlockingRedirect) => {
        // get bundled html file as content for redirect
        const content = await fs.readFile(path.resolve(REDIRECT_FILES_PATH, rawBlockingRedirect.title), 'utf8');
        // get babelized script content
        const scriptPath = path.resolve(__dirname, '../tmp', rawBlockingRedirect.scriptPath);
        const scriptContent = await fs.readFile(scriptPath, 'utf8');
        // needed for CSP in browser extension
        const sha = `sha256-${Base64.stringify(sha256(scriptContent))}`;

        return {
            ...rawBlockingRedirect,
            isBlocking: true,
            content,
            sha,
        };
    };

    let blockingRedirects;
    try {
        const blockingRedirectsContent = await fs.readFile(BLOCKING_REDIRECTS_PATH);
        const rawBlockingRedirects = yaml.safeLoad(blockingRedirectsContent);

        blockingRedirects = await Promise.all(rawBlockingRedirects
            .map((rawBlockingRedirect) => completeRawBlockingRedirect(rawBlockingRedirect)));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Unable to load yaml because of: ${e}`);
        throw e;
    }

    return blockingRedirects;
};

const getJsRedirects = async (options = {}) => {
    const compress = options.compress ?? false;
    const code = options.code ?? true;

    const getCode = (() => {
        if (code) {
            // eslint-disable-next-line import/no-unresolved,global-require
            const { redirects } = require('../tmp/redirects');
            return redirects.getCode;
        }
        return () => '';
    })();

    let listOfRedirectsData = Object
        .values(redirectsList)
        .map((rr) => {
            const [name, ...aliases] = rr.names;
            const source = {
                name,
                args: [],
            };

            const redirect = getCode(source);

            return {
                name,
                redirect,
                aliases,
            };
        });

    const minifyOpt = {
        mangle: false,
        compress: false,
        format: { beautify: true },
    };

    if (compress) {
        minifyOpt.compress = {};
        minifyOpt.format = { comments: false };
    }

    listOfRedirectsData = await Promise.all(listOfRedirectsData.map(async (redirectData) => {
        const result = await minify(redirectData.redirect, minifyOpt);

        return {
            ...redirectData,
            redirect: result.code,
        };
    }));

    const redirectsDescriptions = getDataFromFiles(
        redirectsFilenames,
        REDIRECTS_SRC_RELATIVE_DIR_PATH,
    ).flat(1);

    // TODO: seems like duplicate of already existed code
    /**
     * Returns first line of describing comment from redirect resource file
     *
     * @param {string} rrName redirect resource name
     * @returns {string|undefined}
     */
    const getComment = (rrName) => {
        const { description } = redirectsDescriptions.find((rr) => rr.name === rrName);
        const descArr = description.split('\n');

        return descArr.find((str) => str !== '');
    };

    const complementJsRedirects = (fileName) => {
        const redirectName = fileName.replace(/\.js/, '');
        const complement = listOfRedirectsData.find((obj) => obj.name === redirectName);
        const comment = getComment(redirectName);

        if (complement) {
            return {
                title: redirectName,
                comment,
                aliases: complement.aliases,
                contentType: 'application/javascript',
                content: complement.redirect,
                file: fileName,
            };
        }
        throw new Error(`Couldn't find source for non-static redirect: ${fileName}`);
    };

    const jsRedirects = redirectsFilenames.map((filename) => complementJsRedirects(filename));

    return jsRedirects;
};

export const getPreparedRedirects = async (options) => {
    const staticRedirects = await getStaticRedirects();
    const blockingRedirects = await getBlockingRedirects();
    const jsRedirects = await getJsRedirects(options);

    const mergedRedirects = [
        ...staticRedirects,
        ...blockingRedirects,
        ...jsRedirects,
    ];

    return {
        staticRedirects,
        blockingRedirects,
        jsRedirects,
        mergedRedirects,
    };
};

/**
 * Copies non-static redirects sources to dist
 *
 * @param {object[]} redirectsData
 */
const buildJsRedirectFiles = async (redirectsData) => {
    const saveRedirectData = async (redirect) => {
        const redirectPath = `${REDIRECT_FILES_PATH}/${redirect.file}`;
        await writeFile(redirectPath, redirect.content);
    };

    await Promise.all(Object.values(redirectsData)
        .map((redirect) => saveRedirectData(redirect)));
};

/**
 * Prepares static redirects sources to dist
 *
 * @param {object[]} redirectsData
 */
const buildStaticRedirectFiles = async (redirectsData) => {
    const prepareRedirectData = async (redirect) => {
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
            await writeFile(redirectPath, buff);
        } else {
            await writeFile(redirectPath, contentToWrite);
        }
    };

    await Promise.all(Object.values(redirectsData)
        .map((redirect) => prepareRedirectData(redirect)));
};

const buildRedirectsYamlFile = async (mergedRedirects) => {
    let yamlRedirects = yaml.safeDump(mergedRedirects);

    // add empty line before titles
    yamlRedirects = yamlRedirects.split('- title:')
        .join(`${EOL}- title:`)
        .trimStart();

    // AG-21317
    const SHA_COMMENT = `# To enable the redirect functionality to work within the extension
  # the sha256 value of the file is calculated and included in the yaml file
  # as the redirect is being used as a single file.
  # This will allow the extension to retrieve the value and add it to its CSP.`;

    yamlRedirects = yamlRedirects.replace(/sha:\s/, `${SHA_COMMENT}${EOL}  sha: `);

    // add version and title to the top
    yamlRedirects = `${banner}${yamlRedirects}`;

    await writeFile(RESULT_PATH, yamlRedirects);
};

export const prebuildRedirects = async () => {
    await rollupStandard(redirectsPrebuildConfig);
};

/**
 * We need extra script file to calculate sha256 for extension.
 * Since using generateHtml will bundle and inline script code to html webpage
 * but no dist file will be created, clickToLoadScriptConfig is needed separately.
 * The extra script file will be removed from dist/redirect-files later while build-redirects.js run
 */
export const buildClick2Load = async () => {
    const buildClick2LoadScript = rollupStandard(click2LoadConfig.script);

    const buildClick2LoadHtml = rollupStandard(click2LoadConfig.html);

    await Promise.all([buildClick2LoadScript, buildClick2LoadHtml]);
};

export const buildRedirectsFiles = async () => {
    const {
        mergedRedirects,
        staticRedirects,
        jsRedirects,
    } = await getPreparedRedirects();

    await Promise.all([
        buildRedirectsYamlFile(mergedRedirects),
        buildStaticRedirectFiles(staticRedirects),
        buildJsRedirectFiles(jsRedirects),
    ]);
};

export const buildRedirectsForCorelibs = async () => {
    const { mergedRedirects } = await getPreparedRedirects({ compress: true });

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
                base64Content = Buffer.from(content)
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
        await writeFile(CORELIBS_RESULT_PATH, jsonString);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't save to ${CORELIBS_RESULT_PATH}, because of: ${e.message}`);
        throw e;
    }
};

export const buildRedirectsList = async () => {
    await rollupStandard(redirectsListConfig);
};
