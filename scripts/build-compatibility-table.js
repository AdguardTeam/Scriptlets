const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Source file for compatibility tables
 */
const COMPATIBILITY_TABLE_DATA = path.resolve(__dirname, './compatibility-table.json');

/**
 * File with compatibility tables
 */
const COMPATIBILITY_TABLE = path.resolve(__dirname, '../wiki/compatibility-table.md');

/**
 * Returns data for compatibility tables
 */
function getTableData() {
    const rawData = fs.readFileSync(COMPATIBILITY_TABLE_DATA);
    const parsed = JSON.parse(rawData);
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
const getRow = item => (`| ${item.adg || ''} | ${item.ubo || ''} | ${item.abp || ''} |${os.EOL}`);

/**
 * Generates table header
 */
const getTableHeader = () => {
    let res = `| AdGuard | uBO | Adblock Plus |${os.EOL}`;
    res += `|---|---|---|${os.EOL}`;
    return res;
};

/**
 * Builds markdown string with scriptlets compatibility table
 * @param {Array} data array with scriptlets names
 */
function buildScriptletsTable(data = []) {
    // title
    let res = `# <a id="scriptlets"></a> Scriptlets compatibility table${os.EOL}${os.EOL}`;
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
    let res = `# <a id="scriptlets"></a> Redirects compatibility table${os.EOL}${os.EOL}`;
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
    const res = args.join(`${os.EOL}${os.EOL}`);
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
