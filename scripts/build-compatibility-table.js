const path = require('path');
const fs = require('fs');
const { EOL } = require('os');

const {
    REMOVED_MARKER,
    WIKI_DIR_PATH,
    COMPATIBILITY_TABLE_DATA_PATH,
} = require('./constants');

const COMPATIBILITY_TABLE_OUTPUT_FILENAME = 'compatibility-table.md';

/**
 * Path to **output** wiki compatibility table file
 */
const WIKI_COMPATIBILITY_TABLE_PATH = path.resolve(
    __dirname,
    WIKI_DIR_PATH,
    COMPATIBILITY_TABLE_OUTPUT_FILENAME,
);

/**
 * @typedef {object} CompatibilityItem
 * @property {string} adg AdGuard name
 * @property {string} abp Adblock Plus name
 * @property {string} ubo uBlock name
 */

/**
 * @typedef {object} CompatibilityData
 * @property {CompatibilityItem[]} scriptlets list of scriptlets compatibility items
 * @property {CompatibilityItem[]} redirects list of redirects compatibility items
 */

/**
 * Returns data for compatibility table
 *
 * @returns {CompatibilityData} input compatibility data from json
 */
const getTableData = () => {
    const rawData = fs.readFileSync(COMPATIBILITY_TABLE_DATA_PATH);
    return JSON.parse(rawData);
};

/**
 * Returns markdown row of compatibility table
 *
 * @param {'scriptlets'|'redirects'} id
 * @param {CompatibilityItem} item params object
 * @param {string} item.adg AdGuard name
 * @param {string} item.abp Adblock Plus name
 * @param {string} item.ubo uBlock name
 * @returns {string} markdown table row
 */
const getRow = (id, { adg, abp, ubo }) => {
    let adgCell = '';
    if (adg) {
        adgCell = adg.includes(REMOVED_MARKER)
            ? adg
            : `[${adg}](${WIKI_DIR_PATH}/about-${id}.md#${adg})`;
    }

    return `| ${adgCell} | ${ubo || ''} | ${abp || ''} |${EOL}`;
};

/**
 * Generates table header
 *
 * @returns {string}
 */
const getTableHeader = () => {
    let res = `| AdGuard | uBO | Adblock Plus |${EOL}`;
    res += `|---|---|---|${EOL}`;
    return res;
};

/**
 * Builds markdown string of scriptlets/redirect compatibility table
 *
 * @param {string} title title for scriptlets or redirects
 * @param {CompatibilityItem[]} data array of scriptlets or redirects compatibility data items
 * @param {'scriptlets'|'redirects'} id
 * @returns {string} scriptlets or redirects compatibility table
 */
const buildTable = (title, data = [], id = '') => {
    // title
    let res = `## <a id="${id}"></a> ${title}${EOL}${EOL}`;
    // header
    res += getTableHeader();
    // rows
    res += data
        .map((item) => getRow(id, item))
        .join('');

    return res;
};

/**
 * Saves tables to compatibility table
 *
 * @param {string[]} args
 */
const saveTables = (...args) => {
    const res = args.join(`${EOL}${EOL}`);
    fs.writeFileSync(WIKI_COMPATIBILITY_TABLE_PATH, res);
};

/**
 * Builds full compatibility table
 */
const buildCompatibilityTable = () => {
    const { scriptlets, redirects } = getTableData();

    const scriptletsTable = buildTable(
        'Scriptlets compatibility table',
        scriptlets,
        'scriptlets',
    );
    const redirectsTable = buildTable(
        'Redirects compatibility table',
        redirects,
        'redirects',
    );

    let header = `# Scriplets and Redirects compatibility tables${EOL}${EOL}`;
    header += `- [Scriptlets](#scriptlets)${EOL}`;
    header += `- [Redirects](#redirects)${EOL}`;

    saveTables(header, scriptletsTable, redirectsTable);
};

buildCompatibilityTable();
