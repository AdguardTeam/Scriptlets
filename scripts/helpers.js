import path from 'node:path';
import fs from 'fs-extra';
import dox from 'dox';
import { fileURLToPath } from 'node:url';

const SCRIPTLET_TYPE = 'scriptlet';
const TRUSTED_SCRIPTLET_TYPE = 'trustedScriptlet';
const REDIRECT_TYPE = 'redirect';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Asynchronously writes data to a file, replacing the file if it already exists.
 *
 * @param {string} filePath absolute path to file
 * @param {string} content content to write to the file
 */
const writeFile = async (filePath, content) => {
    const dirname = path.dirname(filePath);

    await fs.ensureDir(dirname);
    await fs.writeFile(filePath, content);
};

/**
 * Gets list of `.js` and `.ts` files in directory.
 *
 * @param {string} relativeDirPath relative path to directory
 * @returns {string[]} array of file names
 */
const getFilesList = (relativeDirPath) => {
    return fs.readdirSync(path.resolve(__dirname, relativeDirPath), { encoding: 'utf8' })
        .filter((el) => el.includes('.js') || el.includes('.ts'));
};

/**
 * @typedef {object} CommentTag
 * @property {string} type Tag name, e.g. `@scriptlet`, `@redirect`, `@added`.
 * @property {string} string Text following the tag name.
 */

/**
 * Returns parsed tags data which we use to describe the sources:
 * - `@scriptlet`/`trustedScriptlet`/`@redirect` to describe the type and name of source;
 * - `@description` actual description for scriptlet or redirect.
 * - `@added` means version when scriptlet or redirect was implemented.
 * In one file might be comments describing scriptlet and redirect as well.
 *
 * @param {string} filePath absolute path to file
 *
 * @returns {CommentTag[]}
 * @throws {Error} If there is no description comment found in file, or more than one such comment found.
 */
const getDescribingCommentTags = (filePath) => {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    const parsedFileComments = dox.parseComments(fileContent);
    const describingComment = parsedFileComments
        // get rid of not needed comments data
        .filter(({ tags }) => {
            // '@scriptlet', '@redirect', and 'description'
            // are parser by dox.parseComments() as `tags`
            if (tags.length === 0) {
                return false;
            }
            const [base] = tags;
            return base?.type === SCRIPTLET_TYPE
                || base?.type === TRUSTED_SCRIPTLET_TYPE
                || base?.type === REDIRECT_TYPE;
        });

    if (describingComment.length === 0) {
        throw new Error(`No description in ${filePath}.
Please add one OR edit the list of NON_SCRIPTLETS_FILES / NON_REDIRECTS_FILES.`);
    }

    if (describingComment.length > 1) {
        throw new Error(`File should have one description comment: ${filePath}.`);
    }

    // only one comment data item should remain eventually
    return describingComment[0].tags;
};

/**
 * @typedef {object} DescribingCommentData
 *
 * Collected data from jsdoc-type comment for every scriptlet or redirect.
 * @property {string} type parsed instance tag:
 * 'scriptlet' for '@scriptlet', 'redirect' for '@redirect'
 * @property {string} name name of instance which goes after the instance tag
 * @property {string} description description, goes after `@description` tag
 * @property {string} source relative path to source of scriptlet or redirect from wiki/about page
 */

/**
 * Converts parsed comment to data object.
 *
 * @param {CommentTag[]} commentTags parsed tags from describing comment
 * @param {string} source relative path to file
 *
 * @returns {DescribingCommentData} JSDoc comment data.
 * @throws {Error} If `@added` tag is missing
 */
const prepareCommentsData = (commentTags, source) => {
    const [typeTag, descriptionTag, addedTag] = commentTags;
    const name = typeTag.string;
    const versionAdded = addedTag?.string;
    if (!versionAdded) {
        throw new Error(`No @added tag for ${name}`);
    }
    return {
        type: typeTag.type,
        name,
        description: descriptionTag.string,
        versionAdded,
        source,
    };
};

/**
 * Gets data objects which describe every required comment in one directory
 *
 * @param {string[]} filesList list of files in directory
 * @param {string} relativeDirPath relative path to directory
 *
 * @returns {DescribingCommentData}
 * @throws {Error} if {@link getDescribingCommentTags} or {@link prepareCommentsData} throws an error.
 */
const getDataFromFiles = (filesList, relativeDirPath) => {
    const pathToDir = path.resolve(__dirname, relativeDirPath);
    return filesList.map((file) => {
        const pathToFile = path.resolve(pathToDir, file);
        const requiredCommentTags = getDescribingCommentTags(pathToFile);

        return prepareCommentsData(requiredCommentTags, `${relativeDirPath}/${file}`);
    });
};

const runTasks = async (tasks) => {
    for (const task of tasks) {
        await task();
    }
};

const generateHtmlTestFilename = (type, name) => {
    if (!type || !name) {
        throw new Error('type and name are required');
    }
    return `${type}-${name}.html`;
};

export {
    writeFile,
    getFilesList,
    getDataFromFiles,
    runTasks,
    generateHtmlTestFilename,
    SCRIPTLET_TYPE,
    TRUSTED_SCRIPTLET_TYPE,
    REDIRECT_TYPE,
};
