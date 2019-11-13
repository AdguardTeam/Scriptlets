// eslint-disable-next-line import/no-extraneous-dependencies
const dox = require('dox');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const Handlebars = require('handlebars');

const warnNoDescription = (path) => {
    console.log(`Warning: No description has been found in ${path}`);
};

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
 * So comments should be collected at first and sorted after that.
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
        warnNoDescription(srcPath);
        throw new Error(`no description in ${srcPath}`);
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
 * returns flatten array of describing objects for all scriptlets and redirects
 */
const manageDataFromFiles = () => {
    const scriptletsPath = path.resolve(__dirname, '../src/scriptlets');
    const redirectsPath = path.resolve(__dirname, '../src/redirects');

    const scriptletsFilesList = getFilesList(scriptletsPath).filter(el => !el.includes('index.js'));
    const redirectsFilesList = getFilesList(redirectsPath).filter(el => !el.includes('redirects.js'));

    const dataFromScriptletsFiles = getDataFromFiles(scriptletsFilesList, scriptletsPath);
    const dataFromRedirectsFiles = getDataFromFiles(redirectsFilesList, redirectsPath);

    return (dataFromScriptletsFiles.concat(dataFromRedirectsFiles)).flat(Infinity);
};

/**
 * Checks if entity has duplicate
 * @param {string} name name of entity
 */
const isDoubled = (name) => {
    const duplicates = [
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
    return duplicates.includes(name);
};

/**
 * Generates markdown list and describing text
 * @param {Object} data array of filtered objects - scriptlets or redirects
 */
const generateMD = (data) => {
    let outputList = '';
    let outputBody = '';

    data.forEach((el) => {
        const mdListLink = isDoubled(el.name) ? `${el.name}-${el.type}` : el.name;

        outputList += `        * [${el.name}](#${mdListLink})\n`;

        const typeOfSrc = el.type === 'scriptlet' ? 'Scriptlet' : 'Redirect';

        outputBody += `### <a id="${mdListLink}"></a> ⚡️ ${el.name}
${el.description}
[${typeOfSrc} source](${el.source})
* * *\n\n`;
    });

    return { outputList, outputBody };
};

const scriptletsData = manageDataFromFiles().filter(el => el.type === 'scriptlet');
const redirectsData = manageDataFromFiles().filter(el => el.type === 'redirect');

const scriptletsMarkdownData = generateMD(scriptletsData);
const redirectsMarkdownData = generateMD(redirectsData);

const source = fs.readFileSync(path.resolve(__dirname, './readmeTemplate.md'), { encoding: 'utf8' });

const template = Handlebars.compile(source);

const result = template({
    scriptletsList: scriptletsMarkdownData.outputList,
    redirectsList: redirectsMarkdownData.outputList,
    scriptletsBody: scriptletsMarkdownData.outputBody,
    redirectsBody: redirectsMarkdownData.outputBody,
});

fs.writeFileSync(path.resolve(__dirname, '../README.md'), result);
