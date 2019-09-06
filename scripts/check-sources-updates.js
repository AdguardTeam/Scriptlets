/* eslint-disable no-console, camelcase */
const fs = require('fs');
const path = require('path');
const axios = require('axios');


/* ************************************************************************
 *
 * Common
 *
 ************************************************************************** */

/**
 * Path to compability data source json
 */
const COMPABILITY_TABLE_DATA = path.resolve(__dirname, './compability-table.json');

/**
 * Checks if arrays contain the same elements
 * @param {Array} arr1
 * @param {Array} arr2
 */
const isEqualArrays = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        return false;
    }
    return arr1.every(item => arr2.includes(item));
};

/**
 * Returns data from store by key
 * @param {string} key
 */
const getCompabilityTable = () => {
    const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    return parsed.compability_table;
};

/**
 * Update data on store by key
 * @param {string} key
 * @param {any} data
 */
// const updateData = (key, data) => {
//     const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
//     const parsed = JSON.parse(rawdata);
//     let res = {
//         ...parsed,
//         [key]: data,
//     };
//     res = JSON.stringify(res, null, 4);
//     fs.writeFileSync(COMPABILITY_TABLE_DATA, res);
// };


/* ************************************************************************
 *
 * UBO Scriptlets
 *
 ************************************************************************** */

/**
 * UBO Scriptlets github raw resources
 */
const UBO_SCRIPTLETS_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/assets/resources/scriptlets.js';

/**
 * Returns list of UBO scriptlets listed in table
 */
const getUBOScriptletsFromTable = () => {
    const { scriptlets } = getCompabilityTable();
    return scriptlets.map(item => item.ubo).filter(item => !!item);
};

/**
 * Make request to UBO repo(master), parses and returns the list of UBO scriptlets
 */
async function getCurrentUBOScriptlets() {
    console.log('Downloading UBO file...');
    const { data } = await axios.get(UBO_SCRIPTLETS_FILE);
    console.log('UBO done');

    const regexp = /\/\/\/\s(\S*\.js)/g;
    const names = [];

    let result;
    // eslint-disable-next-line no-cond-assign
    while (result = regexp.exec(data)) {
        names.push(result[1]);
    }
    return names;
}

/**
 * Check updates for UBO Scriptlets
 */
async function checkForUBOScriptletsUpdates() {
    const oldScriptlets = getUBOScriptletsFromTable();
    const scriptlets = await getCurrentUBOScriptlets();
    const isEqual = isEqualArrays(oldScriptlets, scriptlets);

    console.log(`UBO Scriptlets changes ${isEqual ? 'not ' : ''}found`);

    return isEqual;
}


/* ************************************************************************
 *
 * UBO Redirects
 *
 ************************************************************************** */

/**
 * UBO redirects github page
 */
const UBO_REDIRECTS_DIRECTORY_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/src/js/redirect-engine.js';

/**
 * Returns list of UBO scriptlets listed in table
 */
const getUBORedirectsFromTable = () => {
    const { redirects } = getCompabilityTable();
    return redirects.map(item => item.ubo).filter(item => !!item);
};

/**
 * Make request to UBO repo(master), parses and returns the list of UBO redirects
 */
async function getCurrentUBORedirects() {
    console.log('Downloading UBO page...');
    let { data } = await axios.get(UBO_REDIRECTS_DIRECTORY_FILE);
    console.log('Done.');

    const startTrigger = 'const redirectableResources = new Map([';
    const endTrigger = ']);';

    const startIndex = data.indexOf(startTrigger);
    const endIndex = data.indexOf(endTrigger);

    data = data.slice(startIndex, endIndex + endTrigger.length);

    const regexp = /\[\s*['|"](\S*)['|"]\s*,\s*{/g;
    const names = [];

    let result;
    // eslint-disable-next-line no-cond-assign
    while (result = regexp.exec(data)) {
        names.push(result[1]);
    }
    return names;
}

/**
 * Checks updates for UBO redirects
 */
async function checkForUBORedirectsUpdates() {
    const oldRedirects = getUBORedirectsFromTable();
    const redirects = await getCurrentUBORedirects();
    const isEqual = isEqualArrays(oldRedirects, redirects);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return isEqual;
}

/* ************************************************************************
 *
 * ABP Snippets
 *
 ************************************************************************** */

/**
 * ABP Snippets github raw resources
 */
const ABP_SNIPPETS_FILE = 'https://raw.githubusercontent.com/adblockplus/adblockpluscore/master/lib/content/snippets.js';

/**
 * Returns list of ABP snippets listed in table
 */
const getABPSnippetsFromTable = () => {
    const { scriptlets } = getCompabilityTable();
    return scriptlets.map(item => item.abp).filter(item => !!item);
};

/**
 * Checks for snippets updates
 */
async function getCurrentABPSnippets() {
    console.log('Downloading ABP file...');
    const { data } = await axios.get(ABP_SNIPPETS_FILE);
    console.log('ABP done.');

    const regexp = /exports(\S*)/g;
    const names = [];

    let result;
    // eslint-disable-next-line no-cond-assign
    while (result = regexp.exec(data)) {
        let [, rawName] = result;
        rawName = rawName.replace(/\.|"|'|\[|\]/g, '');
        names.push(rawName);
    }
    return names;
}

/**
 * Checks for ABP Snippets updates
 */
async function checkForABPSnippetsUpdates() {
    const oldSnippets = getABPSnippetsFromTable();
    const snippets = await getCurrentABPSnippets();
    const isEqual = isEqualArrays(oldSnippets, snippets);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return isEqual;
}

/**
 * Entry point
 */
(async function init() {
    const one = await checkForUBORedirectsUpdates();
    const two = await checkForUBOScriptletsUpdates();
    const three = await checkForABPSnippetsUpdates();

    console.log(one, two, three);
}());
