const axios = require('axios');
const { parse } = require('node-html-parser');

/**
 * UBO redirects github page
 */
const UBO_REDIRECTS_DIRECTORY_PAGE = 'https://github.com/gorhill/uBlock/tree/master/src/web_accessible_resources';
const UBO_SCRIPTLETS_PAGE = 'https://raw.githubusercontent.com/gorhill/uBlock/master/assets/resources/scriptlets.js';

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
    const { data } = await axios.get(UBO_REDIRECTS_DIRECTORY_PAGE);
    const parsedHTML = parse(data);
    const excludeFiles = ['README.txt'];

    const fileNameElems = parsedHTML.querySelectorAll('tr.js-navigation-item .content span a');
    const fileNames = fileNameElems
        .map(elem => elem.text)
        .filter(fileName => !excludeFiles.includes(fileName));

    return fileNames;
}

/**
 * Make request to UBO repo(master), parses and returns the list of UBO scriptlets
 */
async function getCurrentUBOScriptlets() {
    const { data } = await axios.get(UBO_SCRIPTLETS_PAGE);
    const regexp = /\/\/\/\s(\S*\.js)/g;
    const names = [];

    let result;
    // eslint-disable-next-line no-cond-assign
    while (result = regexp.exec(data)) {
        names.push(result[1]);
    }
    return names;
}

// eslint-disable-next-line no-unused-expressions
(async function checkForUBOUpdates() {
    // check redirects
    const redirects = await getCurrentUBORedirects();
    const isRedirectsEqual = isEqualArrays(UBO_REDIRECTS_LIST, redirects);
    if (!isRedirectsEqual) {
        // notify()
    }

    // check scriptlets
    const scriptlets = await getCurrentUBOScriptlets();
    const isScriptletsEqual = isEqualArrays(UBO_SCRIPTLETS_LIST, scriptlets);
    if (!isScriptletsEqual) {
        // notify()
    }
}());
