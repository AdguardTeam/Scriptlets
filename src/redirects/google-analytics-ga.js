/* eslint-disable no-underscore-dangle */
import { hit } from '../helpers/hit';
import { noop } from '../helpers/noop';

/**
 * @redirect google-analytics-ga
 *
 * @description
 * Mocks old Google Analytics API.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/google-analytics_ga.js
 *
 * **Example**
 * ```
 * ||example.org/index.js$script,redirect=google-analytics-ga
 * ```
 */
export function GoogleAnalyticsGa(source) {
    // Gaq constructor
    function Gaq() { }

    Gaq.prototype.Na = noop;
    Gaq.prototype.O = noop;
    Gaq.prototype.Sa = noop;
    Gaq.prototype.Ta = noop;
    Gaq.prototype.Va = noop;
    Gaq.prototype._createAsyncTracker = noop;
    Gaq.prototype._getAsyncTracker = noop;
    Gaq.prototype._getPlugin = noop;
    Gaq.prototype.push = (data) => {
        if (typeof data === 'function') {
            data();
            return;
        }
        if (Array.isArray(data) === false) {
            return;
        }
        // https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiDomainDirectory#_gat.GA_Tracker_._link
        if (data[0] === '_link' && typeof data[1] === 'string') {
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
        res[funcName] = noop;
        return res;
    }, {});
    tracker._getLinkerUrl = (a) => a;

    Gat.prototype._anonymizeIP = noop;
    Gat.prototype._createTracker = noop;
    Gat.prototype._forceSSL = noop;
    Gat.prototype._getPlugin = noop;
    Gat.prototype._getTracker = () => tracker;
    Gat.prototype._getTrackerByName = () => tracker;
    Gat.prototype._getTrackers = noop;
    Gat.prototype.aa = noop;
    Gat.prototype.ab = noop;
    Gat.prototype.hb = noop;
    Gat.prototype.la = noop;
    Gat.prototype.oa = noop;
    Gat.prototype.pa = noop;
    Gat.prototype.u = noop;

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
    noop,
];
