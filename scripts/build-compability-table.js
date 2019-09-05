const fs = require('fs');
const path = require('path');

/**
 * Source file for compability tables
 */
const COMPABILITY_TABLE_DATA = path.resolve(__dirname, './compability-table.json');

/**
 * File with compability tables
 */
const COMPABILITY_TABLE = path.resolve(__dirname, './compability-table.md');

/**
 * Retutns data for compability tables
 */
function getTableData() {
    const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    return parsed.compability_table;
}

/**
 * Returns markdown row of compability table
 * @param {{
 * adg: string,
 * ubo: string,
 * abp: string
 * }} item { an }
 */
const getRow = item => (`| ${item.adg || ''} | ${item.ubo || ''} | ${item.abp || ''} |\n`);

/**
 * Builds markdown string with scriptlets compability table
 * @param {Array} data array with scriptlets names
 */
function buildScriptletsTable(data = []) {
    // title
    let res = '# <a id="scriptlets"></a> Scriptlets compatibility table\n\n';
    // header
    res += '| AdGuard | uBO | Adblock Plus |\n';
    res += '|--|--|--|\n';
    // rows
    res += data.map(getRow).join('');

    return res;
}

/**
 * Builds markdown string with redirects compability table
 * @param {Array} data array with redirects names
 */
function buildRedirectsTable(data) {
    // title
    let res = '# <a id="scriptlets"></a> Redirects compatibility table\n\n';
    // header
    res += '| AdGuard | uBO | Adblock Plus |\n';
    res += '|--|--|--|\n';
    // rows
    res += data.map(getRow).join('');

    return res;
}

/**
 * Save tables to compability table
 */
function saveTables(...args) {
    const res = args.join('\n\n');
    fs.writeFileSync(COMPABILITY_TABLE, res);
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
