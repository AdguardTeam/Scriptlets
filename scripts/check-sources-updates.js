/* eslint-disable no-console */
const axios = require('axios');

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
 * UBO Redirects
 */
const UBO_REDIRECTS_LIST = [
    '1x1.gif', '2x2.png', '32x32.png', '3x2.png', 'addthis_widget.js', 'amazon_ads.js',
    'ampproject_v0.js', 'chartbeat.js', 'disqus_embed.js', 'disqus_forums_embed.js',
    'doubleclick_instream_ad_status.js', 'empty', 'google-analytics_analytics.js',
    'google-analytics_cx_api.js', 'google-analytics_ga.js', 'google-analytics_inpage_linkid.js',
    'googlesyndication_adsbygoogle.js', 'googletagmanager_gtm.js', 'googletagservices_gpt.js',
    'hd-main.js', 'ligatus_angular-tag.js', 'monkeybroker.js', 'nobab.js', 'noeval-silent.js',
    'noeval.js', 'nofab.js', 'noop-0.1s.mp3', 'noop-1s.mp4', 'noop.html', 'noop.js', 'noop.txt',
    'outbrain-widget.js', 'popads-dummy.js', 'popads.js', 'scorecardresearch_beacon.js',
    'window.open-defuser.js',
];

/**
 * UBO Scriptlets
 */
const UBO_SCRIPTLETS_LIST = [
    'abort-current-inline-script.js', 'abort-on-property-read.js',
    'abort-on-property-write.js', 'addEventListener-defuser.js',
    'addEventListener-logger.js', 'nano-setInterval-booster.js',
    'nano-setTimeout-booster.js', 'noeval-if.js', 'remove-attr.js', 'raf-if.js',
    'set-constant.js', 'setInterval-defuser.js', 'setInterval-if.js', 'setTimeout-defuser.js',
    'setTimeout-if.js', 'webrtc-if.js', 'overlay-buster.js', 'alert-buster.js',
    'gpt-defuser.js', 'nowebrtc.js', 'golem.de.js', 'upmanager-defuser.js',
    'smartadserver.com.js', 'adfly-defuser.js', 'disable-newtab-links.js', 'damoh-defuser.js',
    'twitch-videoad.js', 'fingerprint2.js', 'cookie-remover.js',
];

/**
 * ABP Snippets
 */
const ABP_SNIPPETS_LIST = [
    'log', 'trace', 'uabinject-defuser', 'hide-if-shadow-contains', 'hide-if-contains',
    'hide-if-contains-visible-text', 'hide-if-contains-and-matches-style',
    'hide-if-has-and-matches-style', 'hide-if-contains-image', 'readd', 'dir-string',
    'abort-on-property-read', 'abort-on-property-write', 'abort-current-inline-script',
    'strip-fetch-query-parameter', 'hide-if-contains-image-hash',
];

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
 * Checks for scriptlets and redirects updates
 */
// eslint-disable-next-line no-unused-expressions
async function checkForUBOUpdates() {
    // check redirects
    const redirects = await getCurrentUBORedirects();
    const isRedirectsEqual = isEqualArrays(UBO_REDIRECTS_LIST, redirects);

    // check scriptlets
    const scriptlets = await getCurrentUBOScriptlets();
    const isScriptletsEqual = isEqualArrays(UBO_SCRIPTLETS_LIST, scriptlets);

    if (!isScriptletsEqual || !isRedirectsEqual) {
        console.log('UBO Changes found');
        // notify()
        console.log('Notifications have been sent');
    } else {
        console.log('UBO changes not found');
    }
}

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
    const snippets = await getCurrentABPSnippets();
    const isSnippetsEqual = isEqualArrays(ABP_SNIPPETS_LIST, snippets);
    if (!isSnippetsEqual) {
        console.log('ABP changes found');
        // notify()
        console.log('Notifications have been sent');
    } else {
        console.log('ABP changes not found');
    }
}

checkForUBOUpdates();
checkForABPUpdates();
