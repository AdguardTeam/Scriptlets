const dox = require('dox');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');


const SCRIPTLETS_FILES_DIRECTORY = path.resolve(__dirname, '../src/scriptlets');
const REDIRECTS_FILES_DIRECTORY = path.resolve(__dirname, '../src/redirects');

const SCRIPTLETS_TEMPLATE_PATH = path.resolve(__dirname, './scriptletsTemplate.md');
const REDIRECTS_TEMPLATE_PATH = path.resolve(__dirname, './redirectsTemplate.md');

const ABOUT_SCRIPTLETS_PATH = path.resolve(__dirname, '../wiki/about-scriptlets.md');
const ABOUT_REDIRECTS_PATH = path.resolve(__dirname, '../wiki/about-redirects.md');

const TYPES = {
    SCRIPTLETS: 'scriptlets',
    REDIRECTS: 'redirects',
};

const SETS = {
    [TYPES.SCRIPTLETS]: {
        templatePath: SCRIPTLETS_TEMPLATE_PATH,
        aboutPath: ABOUT_SCRIPTLETS_PATH,
    },
    [TYPES.REDIRECTS]: {
        templatePath: REDIRECTS_TEMPLATE_PATH,
        aboutPath: ABOUT_REDIRECTS_PATH,
    },
};

const DUPLICATES = [
    'prevent-fab-3.2.0',
    'set-popads-dummy',
    'prevent-popads-net',
    'noeval',
    'googlesyndication-adsbygoogle',
    'googletagmanager-gtm',
    'googletagservices-gpt',
    'google-analytics',
    'google-analytics-ga',
    'scorecardresearch-beacon',
    'metrika-yandex-watch',
    'metrika-yandex-tag',
];

/**
 * Gets list of files
 * @param {string} dirPath path to directory
 */
const getFilesList = (dirPath) => {
    const filesList = fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter(el => el.includes('.js'));
    return filesList;
};

/**
 * Gets required comments from file.
 * In one file might be comments describing scriptlet and redirect as well.
 * @param {string} srcPath path to file
 */
const getComments = (srcPath) => {
    const srcCode = fs.readFileSync(srcPath, { encoding: 'utf8' });
    const parsedCommentsFromFile = dox.parseComments(srcCode);
    const describingComment = Object.values(parsedCommentsFromFile)
        .filter((comment) => {
            const [base] = comment.tags;
            const isNeededComment = (base
                && (base.type === 'scriptlet' || base.type === 'redirect'));
            return isNeededComment;
        });

    if (describingComment.length === 0) {
        throw new Error(`No description in ${srcPath}`);
    }

    return describingComment;
};

/**
 * Convert parsed comments to objects
 * @param {object} requiredComments parsed comments for one file
 * @param {string} sourcePath path to file
 */
const prepareData = (requiredComments, sourcePath) => {
    return requiredComments.map((el) => {
        const [base, sup] = el.tags;
        return {
            type: base.type,
            name: base.string,
            description: sup.string,
            source: sourcePath,
        };
    });
};

/**
 * Gets data objects which describe every required comment in one directory
 * @param {array} filesList list of files in directory
 * @param {string} directoryPath path to directory
 */
const getDataFromFiles = (filesList, directoryPath) => {
    return filesList.map((file) => {
        const sourcePath = `${directoryPath}/${file}`;
        const requiredComments = getComments(sourcePath);

        return prepareData(requiredComments, sourcePath);
    });
};

/**
 * Collects required comments from files and
 * returns describing object for scriptlets and redirects
 */
const manageDataFromFiles = () => {
    const scriptletsFilesList = getFilesList(SCRIPTLETS_FILES_DIRECTORY).filter(el => !el.includes('index.js'));
    const redirectsFilesList = getFilesList(REDIRECTS_FILES_DIRECTORY).filter(el => !el.includes('redirects.js'));

    // eslint-disable-next-line max-len
    const dataFromScriptletsFiles = getDataFromFiles(scriptletsFilesList, SCRIPTLETS_FILES_DIRECTORY);
    const dataFromRedirectsFiles = getDataFromFiles(redirectsFilesList, REDIRECTS_FILES_DIRECTORY);

    const fullData = dataFromScriptletsFiles.concat(dataFromRedirectsFiles).flat(Infinity);

    const scriptletsData = fullData.filter((el) => {
        return el.type === 'scriptlet';
    });
    const redirectsData = fullData.filter((el) => {
        return el.type === 'redirect';
    });

    return { scriptletsData, redirectsData };
};

/**
 * Generates markdown list and describing text
 * @param {object} data array of filtered objects - scriptlets or redirects
 */
const generateMD = (data) => {
    const list = [];
    const body = [];
    const acc = { list, body };

    const output = data.reduce((acc, el) => {
        const mdListLink = DUPLICATES.includes(el.name) ? `${el.name}-${el.type}` : el.name;
        acc.list.push(`    * [${el.name}](#${mdListLink})\n`);

        const typeOfSrc = el.type === 'scriptlet' ? 'Scriptlet' : 'Redirect';

        const body = `### <a id="${mdListLink}"></a> ⚡️ ${el.name}
${el.description}
[${typeOfSrc} source](${el.source})
* * *\n\n`;
        acc.body.push(body);

        return acc;
    }, acc);

    return output;
};

/**
 * Builds final about file from template
 * @param {string} type scriptlet ot redirect
 * @param {object} mdData previously generated markdown data
 */
const buildAboutFile = (type, mdData) => {
    const { templatePath } = SETS[type];
    const { aboutPath } = SETS[type];

    const source = fs.readFileSync(path.resolve(__dirname, templatePath), { encoding: 'utf8' });
    const template = Handlebars.compile(source);
    const result = template({
        list: mdData.list.join(''),
        body: mdData.body.join(''),
    });
    fs.writeFileSync(path.resolve(__dirname, aboutPath), result);
};

/**
 * Entry function
 */
function init() {
    try {
        const scriptletsMarkdownData = generateMD(manageDataFromFiles().scriptletsData);
        const redirectsMarkdownData = generateMD(manageDataFromFiles().redirectsData);

        buildAboutFile(TYPES.SCRIPTLETS, scriptletsMarkdownData);
        buildAboutFile(TYPES.REDIRECTS, redirectsMarkdownData);
    } catch (e) {
        throw (e);
    }
}

init();
