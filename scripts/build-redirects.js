import sha256 from 'crypto-js/sha256';
import Base64 from 'crypto-js/enc-base64';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import { EOL } from 'os';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import generateHtml from 'rollup-plugin-generate-html';
import replace from '@rollup/plugin-replace';
import * as redirectsList from '../src/redirects/redirects-list';
import { version } from '../package.json';
import { redirectsFilesList, getDataFromFiles } from './build-docs';
import { writeFile } from './helpers';
import { rollupStandard } from './rollup-runners';

const FILE_NAME = 'redirects.yml';
const CORELIBS_FILE_NAME = 'redirects.json';
const PATH_TO_DIST = './dist';
const RESULT_PATH = path.resolve(PATH_TO_DIST, FILE_NAME);
const REDIRECT_FILES_PATH = path.resolve(PATH_TO_DIST, 'redirect-files');
const CORELIBS_RESULT_PATH = path.resolve(PATH_TO_DIST, CORELIBS_FILE_NAME);

const DIST_REDIRECT_FILES = 'dist/redirect-files';
const REDIRECTS_DIRECTORY = '../src/redirects';
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

        // FIXME fix eslint config
        // eslint-disable-next-line compat/compat
        blockingRedirects = await Promise.all(rawBlockingRedirects
            .map((rawBlockingRedirect) => completeRawBlockingRedirect(rawBlockingRedirect)));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Unable to load yaml because of: ${e}`);
        throw e;
    }

    return blockingRedirects;
};

const getJsRedirects = () => {
    const { redirects } = require('../tmp/redirects'); // eslint-disable-line global-require
    // FIXME rename redirectsObject to redirectDataList
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

    const complementJsRedirects = (fileName) => {
        const redirectName = fileName.replace(/\.js/, '');
        const complement = redirectsObject.find((obj) => obj.name === redirectName);
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

    const jsRedirects = redirectsFilesList.map((filename) => complementJsRedirects(filename));

    return jsRedirects;
};

const getPreparedRedirects = async () => {
    const staticRedirects = await getStaticRedirects();
    const blockingRedirects = await getBlockingRedirects();
    const jsRedirects = getJsRedirects();

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

export const getRedirectsMap = async () => {
    const { mergedRedirects } = await getPreparedRedirects();
    return createRedirectsMap(mergedRedirects);
};

/**
 * Copies non-static redirects sources to dist
 *
 * @param redirectsData
 */
const buildJsRedirectFiles = async (redirectsData) => {
    const saveRedirectData = async (redirect) => {
        const redirectPath = `${REDIRECT_FILES_PATH}/${redirect.file}`;
        await writeFile(redirectPath, redirect.content);
    };

    // FIXME fix eslint config
    // eslint-disable-next-line compat/compat
    await Promise.all(Object.values(redirectsData)
        .map((redirect) => saveRedirectData(redirect)));
};

/**
 * Prepares static redirects sources to dist
 *
 * @param redirectsData
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

    // FIXME fix eslint config
    // eslint-disable-next-line compat/compat
    await Promise.all(Object.values(redirectsData)
        .map((redirect) => prepareRedirectData(redirect)));
};

const buildRedirectsYamlFile = async (mergedRedirects) => {
    let yamlRedirects = yaml.safeDump(mergedRedirects);

    // add empty line before titles
    yamlRedirects = yamlRedirects.split('- title:')
        .join(`${EOL}- title:`)
        .trimStart();

    // add version and title to the top
    yamlRedirects = `${banner}${yamlRedirects}`;

    await writeFile(RESULT_PATH, yamlRedirects);
};

export const prebuildRedirects = async () => {
    await rollupStandard({
        input: {
            redirects: 'src/redirects/index.js',
        },
        output: {
            dir: 'tmp',
            entryFileNames: '[name].js',
            format: 'es',
        },
        plugins: [
            resolve(),
            replace({
                __MAP__: await getRedirectsMap(),
                // TODO: remove param in @rollup/plugin-replace 5.x.x+
                preventAssignment: true,
            }),
            commonjs({
                include: 'node_modules/**',
            }),
            babel({
                babelHelpers: 'runtime',
            }),
        ],
    });
};

/**
 * We need extra script file to calculate sha256 for extension.
 * Since using generateHtml will bundle and inline script code to html webpage
 * but no dist file will be created, clickToLoadScriptConfig is needed separately.
 * The extra script file will be removed from dist/redirect-files later while build-redirects.js run
 */
export const buildClick2Load = async () => {
    const buildClick2LoadScript = async () => {
        await rollupStandard({
            input: {
                click2load: 'src/redirects/blocking-redirects/click2load.js',
            },
            output: {
                dir: 'tmp',
                entryFileNames: '[name].js',
                name: 'click2load',
                format: 'iife',
            },
            plugins: [
                resolve(),
                babel({ babelHelpers: 'runtime' }),
                cleanup(),
            ],
        });
    };

    const buildClick2LoadHtml = async () => {
        await rollupStandard({
            input: 'src/redirects/blocking-redirects/click2load.js',
            output: {
                dir: DIST_REDIRECT_FILES,
                name: 'click2load',
                format: 'iife',
            },
            plugins: [
                resolve(),
                babel({ babelHelpers: 'runtime' }),
                cleanup(),
                generateHtml({
                    filename: `${DIST_REDIRECT_FILES}/click2load.html`,
                    template: 'src/redirects/blocking-redirects/click2load.html',
                    selector: 'body',
                    inline: true,
                }),
            ],
        });
    };

    // FIXME fix eslint config
    // eslint-disable-next-line compat/compat
    await Promise.all([buildClick2LoadScript(), buildClick2LoadHtml()]);
};

export const buildRedirectsFiles = async () => {
    const {
        mergedRedirects,
        staticRedirects,
        jsRedirects,
    } = await getPreparedRedirects();

    // FIXME fix eslint config
    // eslint-disable-next-line compat/compat
    await Promise.all([
        buildRedirectsYamlFile(mergedRedirects),
        buildStaticRedirectFiles(staticRedirects),
        buildJsRedirectFiles(jsRedirects),
    ]);
};

export const buildRedirectsForCorelibs = async () => {
    const { mergedRedirects } = await getPreparedRedirects();

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
        await writeFile(CORELIBS_RESULT_PATH, jsonString);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't save to ${CORELIBS_RESULT_PATH}, because of: ${e.message}`);
        throw e;
    }
};
