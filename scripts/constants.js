const path = require('path');

/**
 * Rules which were removed from the list should be marked with it
 */
const REMOVED_MARKER = '(removed)';

const COMPATIBILITY_TABLE_INPUT_FILE = './compatibility-table.json';
const COMPATIBILITY_TABLE_OUTPUT_FILE = '../wiki/compatibility-table.md';

/**
 * Path to compatibility data source json
 */
const COMPATIBILITY_TABLE_DATA_PATH = path.resolve(__dirname, COMPATIBILITY_TABLE_INPUT_FILE);

/**
 * Path to file with compatibility tables
 */
const WIKI_COMPATIBILITY_TABLE_PATH = path.resolve(__dirname, COMPATIBILITY_TABLE_OUTPUT_FILE);

module.exports = {
    REMOVED_MARKER,
    COMPATIBILITY_TABLE_DATA_PATH,
    WIKI_COMPATIBILITY_TABLE_PATH,
};
