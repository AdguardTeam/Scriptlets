/* eslint-disable no-console, camelcase */
const fs = require('fs');
const axios = require('axios');
const {
    REMOVED_MARKER,
    COMPATIBILITY_TABLE_DATA_PATH,
} = require('./constants');

/* ************************************************************************
 *
 * Common
 *
 ************************************************************************** */

/**
 * Checks if arrays contain the same strings
 * @param {Array} arr1
 * @param {Array} arr2
 */
const areArraysOfStringsEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        return false;
    }

    const sorted1 = arr1.sort();
    const sorted2 = arr2.sort();

    return sorted1.every((value, index) => value === sorted2[index]);
};

/**
 * Returns parsed compatibility table
 */
const getCompatibilityTable = () => {
    const rawData = fs.readFileSync(COMPATIBILITY_TABLE_DATA_PATH);
    const parsed = JSON.parse(rawData);
    return parsed;
};

/**
 * Returns list of scriptlets listed in table for specified platform
 * @param {"ubo"|"abp"} platform
 */
const getScriptletsFromTable = (platform) => {
    const { scriptlets } = getCompatibilityTable();
    return scriptlets.map((item) => item[platform]).filter((item) => !!item);
};

/**
 * Returns list of redirects listed in table for specified platform
 * @param {"ubo"|"abp"} platform
 */
const getRedirectsFromTable = (platform) => {
    const { redirects } = getCompatibilityTable();
    return redirects.map((item) => item[platform]).filter((item) => !!item);
};

/**
 * Finds a difference between old and new array
 * @param {Array} oldList
 * @param {Array} newList
 */
const getDiff = (oldList, newList) => {
    const diff = {
        removed: [],
        added: [],
    };

    diff.removed = oldList.filter((item) => (
        !newList.includes(item)
        && item.indexOf(REMOVED_MARKER) === -1
    ));
    diff.added = newList.filter((item) => !oldList.includes(item));

    return (diff.removed.length || diff.added.length) ? diff : null;
};

/**
 * Marks removed rules with (removed) and adds new rules to the end of the table
 * @param {{removed: Array, added: Array}} diff Object with diffs for certain type and platform
 * @param {"scriptlets"|"redirects"} ruleType
 * @param {"ubo"|"abp"} platform
 */
function markTableWithDiff(diff, ruleType, platform) {
    const { removed, added } = diff;
    let table = getCompatibilityTable();

    const ruleList = table[ruleType].map((item) => {
        const rule = item[platform];

        if (removed.includes(rule)) {
            return {
                ...item,
                [platform]: `${rule} ${REMOVED_MARKER}`,
            };
        }
        return item;
    });

    added.forEach((item) => ruleList.push({ [platform]: item }));

    table = {
        ...table,
        [ruleType]: ruleList,
    };

    table = JSON.stringify(table, null, 4);

    fs.writeFileSync(COMPATIBILITY_TABLE_DATA_PATH, table);
}

/* ************************************************************************
 *
 * UBO Scriptlets
 *
 ************************************************************************** */

/**
 * UBO Scriptlets github raw resources
 */
const UBO_SCRIPTLETS_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/assets/resources/scriptlets.js';
const ALIAS_MARKER = 'alias';

/**
 * Make request to UBO repo(master), parses and returns the list of UBO scriptlets
 */
async function getCurrentUBOScriptlets() {
    console.log('Downloading UBO file...');
    const { data } = await axios.get(UBO_SCRIPTLETS_FILE);
    console.log('UBO done');

    const regexp = /\/\/\/\s(\S*\.js|alias\s\S*\.js)/g;
    const parsedNames = [];

    let result;
    // eslint-disable-next-line no-cond-assign
    while (result = regexp.exec(data)) {
        // array of parsed UBO scriptlets and their aliases
        parsedNames.push(result[1]);
    }

    let nameRecord;
    const names = [];
    let aliasName;
    let aliases = [];
    let i = 0;
    while (i < parsedNames.length) {
        let k = 1;
        // check if scriptlet has aliases (which might be next after it)
        while ((i + k < parsedNames.length) && (parsedNames[i + k].includes(ALIAS_MARKER))) {
            aliasName = parsedNames[i + k].replace(/alias\s/, '');
            aliases.push(aliasName);
            k += 1;
        }

        if (aliases.length > 0) {
            nameRecord = `${parsedNames[i]} (${aliases.join(', ')})`;
            aliases = [];
            i += k;
        } else {
            nameRecord = parsedNames[i];
            i += 1;
        }

        names.push(nameRecord);
    }

    return names;
}

/**
 * Check updates for UBO Scriptlets
 */
async function checkForUBOScriptletsUpdates() {
    const oldList = getScriptletsFromTable('ubo');
    const newList = await getCurrentUBOScriptlets();
    const isEqual = areArraysOfStringsEqual(oldList, newList);
    const diff = isEqual ? null : getDiff(oldList, newList);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return diff;
}

/* ************************************************************************
 *
 * UBO Redirects
 *
 ************************************************************************** */

/**
 * UBO redirects github page
 */
const UBO_REDIRECTS_DIRECTORY_FILE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/src/js/redirect-resources.js';

/**
 * Make request to UBO repo(master), parses and returns the list of UBO redirects
 */
async function getCurrentUBORedirects() {
    console.log('Downloading UBO page...');
    let { data } = await axios.get(UBO_REDIRECTS_DIRECTORY_FILE);
    console.log('Done.');

    const startTrigger = 'export default new Map([';
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
    const oldList = getRedirectsFromTable('ubo');
    const newList = await getCurrentUBORedirects();

    const isEqual = areArraysOfStringsEqual(oldList, newList);
    const diff = isEqual ? null : getDiff(oldList, newList);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return diff;
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
 * Checks for snippets updates
 */
async function getCurrentABPSnippets() { // eslint-disable-line no-unused-vars
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
async function checkForABPScriptletsUpdates() {
    const oldList = getScriptletsFromTable('abp');
    // ABP_SNIPPETS_FILE is unavailable
    // TODO: fix later, AG-11891
    // const newList = await getCurrentABPSnippets();
    const newList = oldList;

    const isEqual = areArraysOfStringsEqual(oldList, newList);
    const diff = isEqual ? null : getDiff(oldList, newList);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return diff;
}

/* ************************************************************************
 *
 * ABP Redirects
 *
 ************************************************************************** */

/**
 * ABP redirects github raw resource
 */
const ABP_REDIRECTS_FILE_PATH = 'https://raw.githubusercontent.com/adblockplus/adblockpluscore/master/data/resources.js';

const ABP_REDIRECTS_FILE_SKIP_START = 'exports.resources = ';

/**
 * Gets ABP redirects
 */
async function getCurrentABPRedirects() {
    console.log('Downloading ABP file...');
    const { data: rawData } = await axios.get(ABP_REDIRECTS_FILE_PATH);
    const data = JSON.parse(rawData.replace(ABP_REDIRECTS_FILE_SKIP_START, ''));
    console.log('ABP done.');

    const names = Object.keys(data);

    return names;
}

/**
 * Checks for ABP redirects updates
 */
async function checkForABPRedirectsUpdates() {
    const oldList = getRedirectsFromTable('abp');
    const newList = await getCurrentABPRedirects();
    const isEqual = areArraysOfStringsEqual(oldList, newList);
    const diff = isEqual ? null : getDiff(oldList, newList);

    console.log(`UBO Redirects changes ${isEqual ? 'not ' : ''}found`);

    return diff;
}

/**
 * Entry point
 */
(async function init() {
    const UBORedirectsDiff = await checkForUBORedirectsUpdates();
    const UBOScriptletsDiff = await checkForUBOScriptletsUpdates();
    const ABPRedirectsDiff = await checkForABPRedirectsUpdates();
    const ABPScriptletsDiff = await checkForABPScriptletsUpdates();

    if (UBORedirectsDiff) {
        markTableWithDiff(UBORedirectsDiff, 'redirects', 'ubo');
    }

    if (UBOScriptletsDiff) {
        markTableWithDiff(UBOScriptletsDiff, 'scriptlets', 'ubo');
    }

    if (ABPRedirectsDiff) {
        markTableWithDiff(ABPRedirectsDiff, 'redirects', 'abp');
    }

    if (ABPScriptletsDiff) {
        markTableWithDiff(ABPScriptletsDiff, 'scriptlets', 'abp');
    }

    const diffs = [UBORedirectsDiff, UBOScriptletsDiff, ABPRedirectsDiff, ABPScriptletsDiff];

    if (diffs.some((diff) => !!diff)) {
        const removed = diffs
            .map((diff) => (diff ? diff.removed.join() : ''))
            .filter((item) => !!item)
            .join();
        const added = diffs
            .map((diff) => (diff ? diff.added.join() : ''))
            .filter((item) => !!item)
            .join();
        const message = `
            Some sources were changed.
            ${removed.length ? `Removed: ${removed}.` : ''}
            ${added.length ? `Added: ${added}.` : ''}
        `;

        throw new Error(message);
    }
}());
