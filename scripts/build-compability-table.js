const fs = require('fs');
const path = require('path');

const COMPABILITY_TABLE_DATA = path.resolve(__dirname, './compability-table.json');
const COMPABILITY_TABLE = path.resolve(__dirname, './compability-table.md');

function getTableData() {
    const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    return parsed.compability_table;
}

const getRow = item => (`| ${item.adg || ''} | ${item.ubo || ''} | ${item.abp || ''} |\n`);

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

function saveTables(...args) {
    const res = args.join('\n\n');
    fs.writeFileSync(COMPABILITY_TABLE, res);
}

function init() {
    const { scriptlets, redirects } = getTableData();

    const scriptletsTable = buildScriptletsTable(scriptlets);
    const redirectsTable = buildRedirectsTable(redirects);

    saveTables(scriptletsTable, redirectsTable);
}

init();
