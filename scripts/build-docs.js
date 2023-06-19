const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { EOL } = require('os');

const {
    getDataFromFiles,
    SCRIPTLET_TYPE,
    TRUSTED_SCRIPTLET_TYPE,
    REDIRECT_TYPE,
    DescribingCommentData,
} = require('./helpers');

const {
    WIKI_DIR_PATH,
    scriptletsFilenames,
    trustedScriptletsFilenames,
    redirectsFilenames,
    SCRIPTLETS_SRC_RELATIVE_DIR_PATH,
    REDIRECTS_SRC_RELATIVE_DIR_PATH,
} = require('./constants');

const STATIC_REDIRECTS_FILENAME = 'static-redirects.yml';
const BLOCKING_REDIRECTS_FILENAME = 'blocking-redirects.yml';

// eslint-disable-next-line max-len
const STATIC_REDIRECTS_RELATIVE_SOURCE = `${REDIRECTS_SRC_RELATIVE_DIR_PATH}/${STATIC_REDIRECTS_FILENAME}`;

const staticRedirectsPath = path.resolve(__dirname, STATIC_REDIRECTS_RELATIVE_SOURCE);

const blockingRedirectsPath = path.resolve(
    __dirname,
    REDIRECTS_SRC_RELATIVE_DIR_PATH,
    BLOCKING_REDIRECTS_FILENAME,
);

const ABOUT_SCRIPTLETS_FILENAME = 'about-scriptlets.md';
const ABOUT_TRUSTED_SCRIPTLETS_FILENAME = 'about-trusted-scriptlets.md';
const ABOUT_REDIRECTS_FILENAME = 'about-redirects.md';

const aboutScriptletsPath = path.resolve(__dirname, WIKI_DIR_PATH, ABOUT_SCRIPTLETS_FILENAME);
const aboutRedirectsPath = path.resolve(__dirname, WIKI_DIR_PATH, ABOUT_REDIRECTS_FILENAME);
const aboutTrustedScriptletsPath = path.resolve(
    __dirname,
    WIKI_DIR_PATH,
    ABOUT_TRUSTED_SCRIPTLETS_FILENAME,
);

/**
 * Collects required comments from files
 *
 * @returns {object} describing object for scriptlets and redirects
 */
const manageDataFromFiles = () => {
    const dataFromScriptletsFiles = getDataFromFiles(
        scriptletsFilenames,
        SCRIPTLETS_SRC_RELATIVE_DIR_PATH,
    );

    const dataFromTrustedScriptletsFiles = getDataFromFiles(
        trustedScriptletsFilenames,
        SCRIPTLETS_SRC_RELATIVE_DIR_PATH,
    );

    const dataFromRedirectsFiles = getDataFromFiles(
        redirectsFilenames,
        REDIRECTS_SRC_RELATIVE_DIR_PATH,
    );

    const fullData = dataFromScriptletsFiles
        .concat(dataFromTrustedScriptletsFiles)
        .concat(dataFromRedirectsFiles)
        .flat(Infinity);

    const scriptletsData = fullData.filter(({ type }) => type === SCRIPTLET_TYPE);
    const trustedScriptletsData = fullData.filter(({ type }) => type === TRUSTED_SCRIPTLET_TYPE);
    const redirectsData = fullData.filter(({ type }) => type === REDIRECT_TYPE);

    return {
        scriptletsData,
        trustedScriptletsData,
        redirectsData,
    };
};

/**
 * @typedef {object} MarkdownData
 * @property {string} list table of content
 * @property {string} body main content which
 */

/**
 * Generates markdown list and describing text.
 *
 * @param {DescribingCommentData[]} dataItems array of comment data objects
 * @returns {MarkdownData}
 */
const getMarkdownData = (dataItems) => {
    const output = dataItems.reduce((acc, {
        name,
        type,
        versionAdded,
        description,
        source,
    }) => {
        // low case name should be used as an anchor in the table of content
        acc.list.push(`- [${name}](#${name.toLowerCase()})${EOL}`);

        const typeOfSrc = type.toLowerCase().includes('scriptlet') ? 'Scriptlet' : 'Redirect';

        // 1. Low case name should be used as an anchor
        // 2. There is no EOL after 'version' string because `description` starts with `\n`
        const body = `## <a id="${name.toLowerCase()}"></a> ⚡️ ${name}${EOL}
${versionAdded ? `> Added in ${versionAdded}` : '> Adding version is unknown.'}
${description}${EOL}
[${typeOfSrc} source](${source})${EOL}
* * *${EOL}${EOL}`;
        acc.body.push(body);

        return acc;
    }, { list: [], body: [] });

    const list = output.list.join('');
    const body = output.body.join('');

    return { list, body };
};

/**
 * Generates markdown list and describing text for static redirect resources
 *
 * @returns {MarkdownData}
 */
const getMarkdownDataForStaticRedirects = () => {
    const staticRedirects = fs.readFileSync(path.resolve(__dirname, staticRedirectsPath), { encoding: 'utf8' });
    const parsedStaticRedirects = yaml.safeLoad(staticRedirects);

    const output = parsedStaticRedirects.reduce((acc, { title, description, added }) => {
        if (!title) {
            throw new Error('No title for static redirect');
        }
        if (!description) {
            throw new Error(`No description for static redirect '${title}'`);
        }
        if (!added) {
            throw new Error(`No added version for static redirect '${title}'`);
        }

        acc.list.push(`- [${title}](#${title})${EOL}`);

        const body = `## <a id="${title}"></a> ⚡️ ${title}${EOL}
${added ? `> Added in ${added}.` : '> Adding version is unknown.'}${EOL}
${description}${EOL}
[Redirect source](${STATIC_REDIRECTS_RELATIVE_SOURCE})${EOL}
* * *${EOL}${EOL}`;
        acc.body.push(body);

        return acc;
    }, { list: [], body: [] });

    const list = output.list.join('');
    const body = output.body.join('');

    return { list, body };
};

/**
 * Generates markdown list and describing text for blocking redirect resources, i.e click2load.html
 *
 * @returns {MarkdownData}
 */
const getMarkdownDataForBlockingRedirects = () => {
    const BLOCKING_REDIRECTS_SOURCE_SUB_DIR = 'blocking-redirects';
    // eslint-disable-next-line max-len
    const BLOCKING_REDIRECTS_RELATIVE_SOURCE = `${REDIRECTS_SRC_RELATIVE_DIR_PATH}/${BLOCKING_REDIRECTS_SOURCE_SUB_DIR}`;

    const blockingRedirects = fs.readFileSync(blockingRedirectsPath, { encoding: 'utf8' });
    const parsedBlockingRedirects = yaml.safeLoad(blockingRedirects);

    const output = parsedBlockingRedirects.reduce((acc, { title, description, added }) => {
        if (!title) {
            throw new Error('No title for blocking redirect');
        }
        if (!description) {
            throw new Error(`No description for blocking redirect '${title}'`);
        }
        if (!added) {
            throw new Error(`No added version for blocking redirect '${title}'`);
        }

        acc.list.push(`- [${title}](#${title})${EOL}`);

        const body = `## <a id="${title}"></a> ⚡️ ${title}${EOL}
${added ? `> Added in ${added}.` : '> Adding version is unknown.'}${EOL}
${description}${EOL}
[Redirect source](${BLOCKING_REDIRECTS_RELATIVE_SOURCE}/${title})${EOL}
* * *${EOL}${EOL}`;
        acc.body.push(body);

        return acc;
    }, { list: [], body: [] });

    const list = output.list.join('');
    const body = output.body.join('');

    return { list, body };
};

/**
 * Builds about wiki pages for scriptlets and redirects
 */
const buildWikiAboutPages = () => {
    try {
        const filesData = manageDataFromFiles();
        const scriptletsMarkdownData = getMarkdownData(filesData.scriptletsData);

        const trustedScriptletsMarkdownData = getMarkdownData(filesData.trustedScriptletsData);

        const redirectsMarkdownData = getMarkdownData(filesData.redirectsData);
        const staticRedirectsMarkdownData = getMarkdownDataForStaticRedirects();
        const blockingRedirectsMarkdownData = getMarkdownDataForBlockingRedirects();

        const scriptletsPageContent = `# <a id="scriptlets"></a> Available Scriptlets${EOL}
${scriptletsMarkdownData.list}${EOL}* * *${EOL}
${scriptletsMarkdownData.body}`;
        fs.writeFileSync(
            path.resolve(__dirname, aboutScriptletsPath),
            scriptletsPageContent,
        );

        // eslint-disable-next-line max-len
        const trustedScriptletsPageContent = `# <a id="trusted-scriptlets"></a> Available Trusted Scriptlets${EOL}
${trustedScriptletsMarkdownData.list}${EOL}* * *${EOL}
${trustedScriptletsMarkdownData.body}`;
        fs.writeFileSync(
            path.resolve(__dirname, aboutTrustedScriptletsPath),
            trustedScriptletsPageContent,
        );

        /* eslint-disable max-len */
        const redirectsPageContent = `# <a id="redirect-resources"></a> Available Redirect resources${EOL}
${staticRedirectsMarkdownData.list}${redirectsMarkdownData.list}${blockingRedirectsMarkdownData.list}${EOL}* * *${EOL}
${staticRedirectsMarkdownData.body}${redirectsMarkdownData.body}${blockingRedirectsMarkdownData.body}`;
        /* eslint-enable max-len */
        fs.writeFileSync(
            path.resolve(__dirname, aboutRedirectsPath),
            redirectsPageContent,
        );
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e.message);
    }
};

buildWikiAboutPages();
