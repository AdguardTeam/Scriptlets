const path = require('path');

const { getFilesList } = require('./helpers');

/**
 * Rules which were removed from the list should be marked with it
 */
const REMOVED_MARKER = '(removed)';

const COMPATIBILITY_TABLE_INPUT_FILENAME = 'compatibility-table.json';
/**
 * Path to **input** compatibility data source json
 */
const COMPATIBILITY_TABLE_DATA_PATH = path.resolve(__dirname, COMPATIBILITY_TABLE_INPUT_FILENAME);

const WIKI_DIR_PATH = '../wiki';

const SRC_RELATIVE_DIR = '../src';
const SRC_SCRIPTLETS_SUB_DIR = 'scriptlets';
const SRC_REDIRECTS_SUB_DIR = 'redirects';

const SCRIPTLETS_SRC_RELATIVE_DIR_PATH = `${SRC_RELATIVE_DIR}/${SRC_SCRIPTLETS_SUB_DIR}`;
const REDIRECTS_SRC_RELATIVE_DIR_PATH = `${SRC_RELATIVE_DIR}/${SRC_REDIRECTS_SUB_DIR}`;

const TRUSTED_SCRIPTLETS_PREFIX = 'trusted-';

// files which are not scriptlets in the source directory
const NON_SCRIPTLETS_FILES = [
    'index.js',
    'scriptlets.js',
    'scriptlets-list.js',
    'scriptlets-wrapper.js',
    'scriptlets-umd-wrapper.js',
];

const isUtilityFileName = (filename) => NON_SCRIPTLETS_FILES.includes(filename);
const isTrustedScriptletsFilename = (filename) => filename.startsWith(TRUSTED_SCRIPTLETS_PREFIX);

const scriptletsFilenames = getFilesList(SCRIPTLETS_SRC_RELATIVE_DIR_PATH)
    .filter((el) => !isUtilityFileName(el) && !isTrustedScriptletsFilename(el));

const trustedScriptletsFilenames = getFilesList(SCRIPTLETS_SRC_RELATIVE_DIR_PATH)
    .filter((el) => isTrustedScriptletsFilename(el));

// files which are not redirects in the source directory
const NON_REDIRECTS_FILES = [
    'index.js',
    'redirects.js',
    'redirects-list.js',
];
const redirectsFilenames = getFilesList(REDIRECTS_SRC_RELATIVE_DIR_PATH)
    .filter((el) => !NON_REDIRECTS_FILES.includes(el));

module.exports = {
    REMOVED_MARKER,
    COMPATIBILITY_TABLE_DATA_PATH,
    WIKI_DIR_PATH,
    SCRIPTLETS_SRC_RELATIVE_DIR_PATH,
    REDIRECTS_SRC_RELATIVE_DIR_PATH,
    scriptletsFilenames,
    trustedScriptletsFilenames,
    redirectsFilenames,
};
