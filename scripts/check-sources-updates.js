/* eslint-disable no-console, camelcase */
const fs = require('fs');
const axios = require('axios');
const { EOL } = require('os');

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
 *
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {boolean}
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
 *
 * @returns {object}
 */
const getCompatibilityTable = () => {
    const rawData = fs.readFileSync(COMPATIBILITY_TABLE_DATA_PATH);
    const parsed = JSON.parse(rawData);
    return parsed;
};

/**
 * Returns list of scriptlets listed in table for specified platform
 *
 * @param {"ubo"|"abp"} platform
 * @returns {string[]}
 */
const getScriptletsFromTable = (platform) => {
    const { scriptlets } = getCompatibilityTable();
    return scriptlets.map((item) => item[platform]).filter((item) => !!item);
};

/**
 * Returns list of redirects listed in table for specified platform
 *
 * @param {"ubo"|"abp"} platform
 * @returns {string[]}
 */
const getRedirectsFromTable = (platform) => {
    const { redirects } = getCompatibilityTable();
    return redirects.map((item) => item[platform]).filter((item) => !!item);
};

/**
 * @typedef {object} Diff
 * @property {string[]} added added content
 * @property {string[]} removed removed content
 */

/**
 * Finds a difference between old and new array
 *
 * @param {Array} oldList
 * @param {Array} newList
 * @returns {Diff|null}
 */
const getDiff = (oldList, newList) => {
    const diff = {
        added: [],
        removed: [],
    };

    diff.removed = oldList.filter((item) => !newList.includes(item) && !item.includes(REMOVED_MARKER));
    diff.added = newList.filter((item) => !oldList.includes(item));

    return (diff.removed.length || diff.added.length) ? diff : null;
};

/**
 * Marks removed rules with (removed) and adds new rules to the end of the table
 *
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
const SCRIPTLETS_START_MARKER = 'Injectable scriptlets';
const DIVIDER_MARKER = 'builtinScriptlets.push';
const COMMENT_MARKER = '//';
const FUNCTION_MARKER = 'function ';
const NAME_MARKER_START = "name: '";
const NAME_MARKER_END = "',";
const ALIASES_MARKER_START = 'aliases: [';
const ALIASES_MARKER_END = '],';

/**
 * Make request to UBO repo(master), parses and returns the list of UBO scriptlets
 *
 * @returns {string[]} ubo scriptlets' names
 */
async function getCurrentUBOScriptlets() {
    console.log('Downloading UBO file...');
    const { data } = await axios.get(UBO_SCRIPTLETS_FILE);
    console.log('UBO done');

    const startIndex = data.indexOf(SCRIPTLETS_START_MARKER);
    if (startIndex === -1) {
        throw new Error('UBO file format has been changed');
    }

    const names = [];

    const chunks = data.slice(startIndex).split(DIVIDER_MARKER);

    chunks.forEach((chunk) => {
        let name;
        const aliases = [];

        const functionDefinitionIndex = chunk.indexOf(FUNCTION_MARKER) || chunk.length;
        const scriptletObjectText = chunk.slice(0, functionDefinitionIndex).trim();

        let areAliasesStarted = false;

        const textLines = scriptletObjectText.split(EOL);
        for (let i = 0; i < textLines.length; i += 1) {
            const line = textLines[i].trim();

            if (line.startsWith(COMMENT_MARKER)) {
                continue;
            }
            // parse the name
            if (line.startsWith(NAME_MARKER_START)) {
                name = line.slice(NAME_MARKER_START.length, line.indexOf(NAME_MARKER_END));
                continue;
            }
            // parse the aliases
            if (line.startsWith(ALIASES_MARKER_START)) {
                // now aliases array is set as multiline list
                // so the flag is needed for correct parsing of following lines
                areAliasesStarted = true;
                continue;
            }
            if (areAliasesStarted) {
                if (line === ALIASES_MARKER_END) {
                    areAliasesStarted = false;
                    // 'name' string goes first and 'aliases' string goes after it
                    // so if aliases are parsed, no need to continue lines iterating
                    break;
                }
                const alias = line
                    .replace(/,?$/g, '')
                    .replace(/'/g, '');
                aliases.push(alias);
                continue;
            }
        }

        if (!name) {
            return;
        }

        let namesStr = name;
        if (aliases.length > 0) {
            namesStr += ` (${aliases.join(', ')})`;
        }
        names.push(namesStr);
    });

    return names;
}

/**
 * Check updates for UBO Scriptlets
 *
 * @returns {Diff|null} diff
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
 *
 * @returns {string[]} ubo redirects' names
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
 *
 * @returns {Diff|null} diff
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
 *
 * @returns {string[]} abp snippets' names
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
 *
 * @returns {Diff|null} diff
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
 *
 * @returns {string[]} abp redirects' names
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
 *
 * @returns {Diff|null} diff
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
            Some sources were changed:
            ${removed.length ? `Removed: ${removed}.` : ''}
            ${added.length ? `Added: ${added}.` : ''}

            Update compatibility tables.
        `;

        throw new Error(message);
    }
}());
