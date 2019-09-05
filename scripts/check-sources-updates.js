/* eslint-disable no-console, camelcase */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const COMPABILITY_TABLE_DATA = path.resolve(__dirname, './compability-table.json');

/**
 * UBO redirects github page
 */
const UBO_REDIRECTS_DIRECTORY_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/src/js/redirect-engine.js';

/**
 * UBO Scriptlets github raw resources
 */
const UBO_SCRIPTLETS_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/assets/resources/scriptlets.js';

/**
 * ABP Snippets github raw resources
 */
const ABP_SNIPPETS_FILE = 'https://raw.githubusercontent.com/adblockplus/adblockpluscore/master/lib/content/snippets.js';

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
const getData = (key) => {
    const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    return parsed[key];
};

/**
 * Update data on store by key
 * @param {string} key
 * @param {any} data
 */
const updateData = (key, data) => {
    const rawdata = fs.readFileSync(COMPABILITY_TABLE_DATA);
    const parsed = JSON.parse(rawdata);
    let res = {
        ...parsed,
        [key]: data,
    };
    res = JSON.stringify(res, null, 4);
    fs.writeFileSync(COMPABILITY_TABLE_DATA, res);
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
 * Make request to ABP repo(master), parses and returns the list of ABP snippets
 */
async function checkForUBOUpdates() {
    // check redirects
    const oldRedirects = getData('UBO_redirects');
    const oldScriptlets = getData('UBO_scriptlets');
    const redirects = await getCurrentUBORedirects();
    const isRedirectsEqual = isEqualArrays(oldRedirects, redirects);

    // check scriptlets
    const scriptlets = await getCurrentUBOScriptlets();
    const isScriptletsEqual = isEqualArrays(oldScriptlets, scriptlets);

    if (!isScriptletsEqual || !isRedirectsEqual) {
        console.log('UBO Changes found');
        updateData('UBO_redirects', redirects);
        updateData('UBO_scriptlets', scriptlets);
        // notify()
        console.log('Notifications have been sent');
    } else {
        console.log('UBO changes not found');
    }
}

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
async function checkForABPUpdates() {
    // check snippets
    const oldSnippets = getData('ABP');
    const snippets = await getCurrentABPSnippets();
    const isSnippetsEqual = isEqualArrays(oldSnippets, snippets);
    if (!isSnippetsEqual) {
        console.log('ABP changes found');
        updateData('ABP', snippets);
        // notify()
        console.log('Notifications have been sent');
    } else {
        console.log('ABP changes not found');
    }
}

checkForUBOUpdates();
checkForABPUpdates();
