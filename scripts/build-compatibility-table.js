const fs = require('fs');
const path = require('path');

/**
 * Source file for compatibility tables
 */
const COMPATIBILITY_TABLE_DATA = path.resolve(__dirname, './compatibility-table.json');

/**
 * File with compatibility tables
 */
const COMPATIBILITY_TABLE = path.resolve(__dirname, '../wiki/compatibility-table.md');

/**
 * Retutns data for compatibility tables
 */
function getTableData() {
    const rawdata = fs.readFileSync(COMPATIBILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    return parsed;
}

/**
 * Returns markdown row of compatibility table
 * @param {{
 * adg: string,
 * ubo: string,
 * abp: string
 * }} item { an }
 */
const getRow = item => (`| ${item.adg || ''} | ${item.ubo || ''} | ${item.abp || ''} |\r`);

/**
 * Generates table header
 */
const getTableHeader = () => {
    let res = '| AdGuard | uBO | Adblock Plus |\r';
    res += '|---|---|---|\r';
    return res;
};

/**
 * Builds markdown string with scriptlets compatibility table
 * @param {Array} data array with scriptlets names
 */
function buildScriptletsTable(data = []) {
    // title
    let res = '# <a id="scriptlets"></a> Scriptlets compatibility table\n\n';
    // header
    res += getTableHeader();
    // rows
    res += data.map(getRow).join('');

    return res;
}

/**
 * Builds markdown string with redirects compatibility table
 * @param {Array} data array with redirects names
 */
function buildRedirectsTable(data) {
    // title
    let res = '# <a id="scriptlets"></a> Redirects compatibility table\n\n';
    // header
    res += getTableHeader();
    // rows
    res += data.map(getRow).join('');

    return res;
}

/**
 * Save tables to compatibility table
 */
function saveTables(...args) {
    const res = args.join('\n\n');
    fs.writeFileSync(COMPATIBILITY_TABLE, res);
}

/**
 * Entry function
 */
function init() {
    const { scriptlets, redirects } = getTableData();

    const scriptletsTable = buildScriptletsTable(scriptlets);
    const redirectsTable = buildRedirectsTable(redirects);

    saveTables(scriptletsTable, redirectsTable);
}

init();
