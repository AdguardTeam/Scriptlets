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

/**
 * Converts a redirect source filename from ".ts" to ".js" extension.
 * Filenames that already use ".js" or any other extension are returned unchanged.
 *
 * @param {string} fileName redirect source filename
 * @returns {string} filename with ".ts" replaced by ".js"
 */
const convertTsFileNameToJs = (fileName) => fileName.replace(/\.ts$/, '.js');

/**
 * Extracts the version from the `#    Version <version>` banner line of the
 * built `dist/redirects.yml`. Only matches the top banner comment line; body
 * comments (e.g. `# To enable…`, `# sha: …`) are not matched.
 *
 * @param {string} yml redirects.yml content
 * @returns {string|undefined} version string, or `undefined` if not found
 */
const getRedirectsYmlVersion = (yml) => {
    if (!yml) {
        return undefined;
    }
    const match = yml.match(/^#\s+Version\s+(\S+)/m);
    return match ? match[1] : undefined;
};

/**
 * Numeric package version with an optional supported prerelease tag.
 */
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(-(dev|alpha|beta)(\.\d+)?)?$/;

/**
 * First released changelog heading. The Unreleased heading does not match.
 */
const CHANGELOG_VERSION_PATTERN = /^## \[(\d+\.\d+\.\d+(?:-[^\]]+)?)\](?:\s|$)/m;

/**
 * Derives the next patch development version from changelog content.
 *
 * @param {string} changelog changelog content
 * @returns {string} next patch version with the `-dev` suffix
 * @throws {Error} if no released numeric heading exists
 */
const deriveDevVersion = (changelog) => {
    const match = String(changelog || '').match(CHANGELOG_VERSION_PATTERN);
    if (!match) {
        throw new Error('Unable to derive a development version from CHANGELOG.md');
    }

    const coreMatch = match[1].match(/^(\d+)\.(\d+)\.(\d+)/);
    const major = coreMatch[1];
    const minor = coreMatch[2];
    const patch = Number(coreMatch[3]) + 1;
    return `${major}.${minor}.${patch}-dev`;
};

/**
 * Uses a workflow-stamped package version or derives a local development one.
 *
 * @param {string|undefined} rawVersion version read from `package.json`
 * @param {string} changelog changelog content used when the package is versionless
 * @returns {string} version to stamp into all build artifacts
 * @throws {Error} if a stamped version is malformed or changelog derivation fails
 */
const resolveBuildVersion = (rawVersion, changelog) => {
    const value = rawVersion ? String(rawVersion).trim() : '';
    if (!value) {
        return deriveDevVersion(changelog);
    }
    if (!VERSION_PATTERN.test(value)) {
        throw new Error(
            `Invalid version stamped into package.json: '${value}'. `
            + 'Expected x.y.z[-(dev|alpha|beta)].',
        );
    }
    return value;
};

/**
 * Resolves the repository build version without mutating package.json.
 *
 * @param {string|undefined} rawVersion version read from `package.json`
 * @returns {string} resolved build version
 */
const getBuildVersion = (rawVersion) => {
    const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
    const changelog = fs.readFileSync(changelogPath, { encoding: 'utf8' });
    return resolveBuildVersion(rawVersion, changelog);
};

/**
 * Verifies that the version stamped into `package.json` (resolved via
 * {@link resolveBuildVersion}) is propagated exactly into both built artifacts
 * — `dist/redirects.yml` and `dist/scriptlets.corelibs.json`.
 *
 * `version` must be the RESOLVED version (the same value the build scripts
 * stamped), so the old `'local'`/`'0.0.0'` sentinels are gone and a mismatch
 * is always reported.
 *
 * @param {object} params
 * @param {string} params.version resolved version expected in artifacts
 * @param {string} params.redirectsYml built `dist/redirects.yml` content
 * @param {string} params.corelibsScriptletsJson built `dist/scriptlets.corelibs.json` content
 * @returns {string[]} error messages (empty = OK)
 */
const verifyBuiltVersions = ({ version, redirectsYml, corelibsScriptletsJson }) => {
    const errors = [];

    const ymlVersion = getRedirectsYmlVersion(redirectsYml);

    let corelibsVersion;
    try {
        const parsed = JSON.parse(corelibsScriptletsJson);
        corelibsVersion = parsed?.version;
    } catch (e) {
        corelibsVersion = undefined;
    }

    if (ymlVersion !== version) {
        errors.push(`dist/redirects.yml banner version is '${ymlVersion}', expected '${version}'`);
    }
    if (corelibsVersion !== version) {
        errors.push(`dist/scriptlets.corelibs.json version is '${corelibsVersion}', expected '${version}'`);
    }

    return errors;
};

export {
    writeFile,
    getFilesList,
    getDataFromFiles,
    runTasks,
    generateHtmlTestFilename,
    convertTsFileNameToJs,
    getRedirectsYmlVersion,
    resolveBuildVersion,
    deriveDevVersion,
    getBuildVersion,
    verifyBuiltVersions,
    VERSION_PATTERN,
    SCRIPTLET_TYPE,
    TRUSTED_SCRIPTLET_TYPE,
    REDIRECT_TYPE,
};
