/* eslint-disable no-underscore-dangle */
import {
    hit,
    noopFunc,
    logMessage,
} from '../helpers/index';

/**
 * @redirect google-analytics-ga
 *
 * @description
 * Mocks old Google Analytics API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/google-analytics_ga.js
 *
 * ### Examples
 *
 * ```adblock
 * ||google-analytics.com/ga.js$script,redirect=google-analytics-ga
 * ```
 *
 * @added v1.0.10.
 */
export function GoogleAnalyticsGa(source) {
    // Gaq constructor
    function Gaq() { }

    Gaq.prototype.Na = noopFunc;
    Gaq.prototype.O = noopFunc;
    Gaq.prototype.Sa = noopFunc;
    Gaq.prototype.Ta = noopFunc;
    Gaq.prototype.Va = noopFunc;
    Gaq.prototype._createAsyncTracker = noopFunc;
    Gaq.prototype._getAsyncTracker = noopFunc;
    Gaq.prototype._getPlugin = noopFunc;
    Gaq.prototype.push = (data) => {
        if (typeof data === 'function') {
            data();
            return;
        }
        if (Array.isArray(data) === false) {
            return;
        }
        // https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiDomainDirectory#_gat.GA_Tracker_._link
        // https://github.com/uBlockOrigin/uBlock-issues/issues/1807
        if (typeof data[0] === 'string'
            && /(^|\.)_link$/.test(data[0])
            && typeof data[1] === 'string') {
            window.location.assign(data[1]);
        }
        // https://github.com/gorhill/uBlock/issues/2162
        if (data[0] === '_set' && data[1] === 'hitCallback' && typeof data[2] === 'function') {
            data[2]();
        }
    };

    const gaq = new Gaq();
    const asyncTrackers = window._gaq || [];
    if (Array.isArray(asyncTrackers)) {
        while (asyncTrackers[0]) {
            gaq.push(asyncTrackers.shift());
        }
    }
    // eslint-disable-next-line no-multi-assign
    window._gaq = gaq.qf = gaq;

    // Gat constructor
    function Gat() { }

    // Mock tracker api
    const api = [
        '_addIgnoredOrganic', '_addIgnoredRef', '_addItem', '_addOrganic',
        '_addTrans', '_clearIgnoredOrganic', '_clearIgnoredRef', '_clearOrganic',
        '_cookiePathCopy', '_deleteCustomVar', '_getName', '_setAccount',
        '_getAccount', '_getClientInfo', '_getDetectFlash', '_getDetectTitle',
        '_getLinkerUrl', '_getLocalGifPath', '_getServiceMode', '_getVersion',
        '_getVisitorCustomVar', '_initData', '_link', '_linkByPost',
        '_setAllowAnchor', '_setAllowHash', '_setAllowLinker', '_setCampContentKey',
        '_setCampMediumKey', '_setCampNameKey', '_setCampNOKey', '_setCampSourceKey',
        '_setCampTermKey', '_setCampaignCookieTimeout', '_setCampaignTrack', '_setClientInfo',
        '_setCookiePath', '_setCookiePersistence', '_setCookieTimeout', '_setCustomVar',
        '_setDetectFlash', '_setDetectTitle', '_setDomainName', '_setLocalGifPath',
        '_setLocalRemoteServerMode', '_setLocalServerMode', '_setReferrerOverride', '_setRemoteServerMode',
        '_setSampleRate', '_setSessionTimeout', '_setSiteSpeedSampleRate', '_setSessionCookieTimeout',
        '_setVar', '_setVisitorCookieTimeout', '_trackEvent', '_trackPageLoadTime',
        '_trackPageview', '_trackSocial', '_trackTiming', '_trackTrans',
        '_visitCode',
    ];
    const tracker = api.reduce((res, funcName) => {
        res[funcName] = noopFunc;
        return res;
    }, {});
    tracker._getLinkerUrl = (a) => a;
    // https://github.com/AdguardTeam/Scriptlets/issues/154
    tracker._link = (url) => {
        if (typeof url !== 'string') {
            return;
        }
        try {
            window.location.assign(url);
        } catch (e) {
            logMessage(source, e);
        }
    };

    Gat.prototype._anonymizeIP = noopFunc;
    Gat.prototype._createTracker = noopFunc;
    Gat.prototype._forceSSL = noopFunc;
    Gat.prototype._getPlugin = noopFunc;
    Gat.prototype._getTracker = () => tracker;
    Gat.prototype._getTrackerByName = () => tracker;
    Gat.prototype._getTrackers = noopFunc;
    Gat.prototype.aa = noopFunc;
    Gat.prototype.ab = noopFunc;
    Gat.prototype.hb = noopFunc;
    Gat.prototype.la = noopFunc;
    Gat.prototype.oa = noopFunc;
    Gat.prototype.pa = noopFunc;
    Gat.prototype.u = noopFunc;

    const gat = new Gat();
    window._gat = gat;

    hit(source);
}

GoogleAnalyticsGa.names = [
    'google-analytics-ga',
    'ubo-google-analytics_ga.js',
    'google-analytics_ga.js',
];

GoogleAnalyticsGa.injections = [
    hit,
    noopFunc,
    logMessage,
];
