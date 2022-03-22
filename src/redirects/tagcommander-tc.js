/* eslint-disable func-names */
import {
    hit,
    noopFunc,
    noopArray,
    noopStr,
    trueFunc,
    falseFunc,
} from '../helpers';

/**
 * @redirect tagcommander-tc
 *
 * @description
 * Mocks TagCommander analytics.
 * https://www.commandersact.com/en/solutions/tagcommander/
 *
 * **Example**
 * ```
 * ||cdn.tagcommander.com/4183/tc_TF1_26.js$script,redirect=tagcommander
 * ```
 */
export function TagcommanderTc(source) {
    const OPTIN_CATEGORIES = [
        '4',
        '10001',
        '10003',
        '10004',
        '10005',
        '10006',
        '10007',
        '10008',
        '10009',
        '10010',
        '10011',
        '10012',
        '10013',
        '10014',
        '10015',
        '10016',
        '10017',
        '10018',
        '10019',
        '10020',
        '13001',
        '13002',
    ];
    const tC = function (t) {
        return new tC.fn.init(t);
    };
    tC.containersLaunched = {
        '6138': {},
    };
    tC.log = () => { };
    tC.containerStart = Date.now();
    tC.prototype = {
        constructor: tC,
        init: function (t) {
            if (t.nodeType) {
                this[0] = t;
                this.context = t;
                this.length = 1;
            }
        },
        each: function (t, e) {
            return tC.each(this, t, e)
        },
        ready: function (t) {
            tC.ready.promise(t);
            return this;
        },
    };
    tC.fn = tC.prototype;
    tC.fn.init.prototype = tC.fn;
    tC.fn.extend = function () {
        var t, e, n, i, a, r, c = arguments[0] || {}, s = 1, d = arguments.length, p = !1;
        for ("boolean" == typeof c && (p = c,
            c = arguments[1] || {},
            s = 2),
            "object" == typeof c || o.isFunction(c) || (c = {}),
            d === s && (c = this,
                --s); s < d; s++)
            if (null != (t = arguments[s]))
                for (e in t)
                    n = c[e],
                        c !== (i = t[e]) && (p && i && (o.isPlainObject(i) || (a = o.isArray(i))) ? (a ? (a = !1,
                            r = n && o.isArray(n) ? n : []) : r = n && o.isPlainObject(n) ? n : {},
                            c[e] = o.extend(p, r, i)) : undefined !== i && (c[e] = i));
        return c
    };
    tC.extend = tC.fn.extend;




    tC.eventTarget = {
        _eventTarget: document.createElement('null'),
        addEventListener: function (t, e, n) {
            this._eventTarget.addEventListener(t, e, n)
        },
        removeEventListener: function (t, e) {
            this._eventTarget.removeEventListener(t, e)
        },
        dispatchEvent: function (t) {
            let e;
            if (typeof t === 'string') {
                e = t;
            } else {
                e = document.createEvent("Event").initEvent(t, !0, !0);
            }
            this._eventTarget.dispatchEvent(new Event(e));
        }
    }

    tC.privacy = {
        hit: noopFunc,
        sendDataOtherTMS: noopFunc,
        eventTarget: tC.eventTarget,
        addEventListener: tC.eventTarget.addEventListener.bind(tC.eventTarget),
        removeEventListener: tC.eventTarget.removeEventListener.bind(tC.eventTarget),
        dispatchEvent: tC.eventTarget.dispatchEvent.bind(tC.eventTarget),
        getId: () => 10,
        getVersion: () => '018',
        categories: [],
        // Explicit values are given to avoid antiadblock on tf1.fr
        // https://github.com/AdguardTeam/AdguardFilters/issues/102818
        getOptinCategories: () => tC.privacy.categories,
        cookieData: noopArray,
        getConsent: () => {
            return {
                consent: 'all-on',
            };
        },
        iabItemsToDisplay: {
            categories: {
                purposes: [],
                specialPurposes: [],
                features: [],
                specialFeatures: [],
                legIntPurposes: []
            },
            vendors: {}
        },
    };
    tC.cact = {
        'consent.get': noopFunc,
        'consent.onUpdate': noopFunc,
        'consent.revoke': noopFunc,
        'consent.update': noopFunc,
        exec: noopFunc,
        trigger: noopFunc,
    };
    tC.storage = {
        has: trueFunc,
        isAvailable: () => {
            if (window.localStorage) {
                return true;
            } else {
                return false;
            }
        },
        get: noopStr,
        set: noopFunc,
        remove: noopFunc,
        setWithExpiry: noopFunc,
        getWithExpiry: noopFunc,
    };
    tC.addConsentChangeListener = noopFunc;
    tC.removeConsentChangeListener = noopFunc;
    tC.container = {
        reload: noopFunc,
    };
    tC.waitingOnDomReadyCallBacks = noopArray;
    tC.excuteOnDomReadyCallBacks = noopFunc;
    const onDomReadyWrapper = function (callback) {
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(callback());
            });
        } else {
            setTimeout(callback());
        }
    };
    tC.onDomReady = onDomReadyWrapper;
    tC.isDOMReady = trueFunc;
    tC.domReady = true;

    window.tC = tC;
    window.tc_events_global = noopFunc;
    window.__tcfapi = noopFunc; // eslint-disable-line no-underscore-dangle
    window.caReady = [];
    window.caReady.push = function (t) {
        Array.prototype.push.call(window.caReady, t);
    };
    // https://github.com/AdguardTeam/Scriptlets/issues/173#issuecomment-1017139416
    // Should be string that evaluates to true:
    window.tcVendorsConsent = '';
    window.tcCategoriesConsent = [];
    window.consentStringV2 = 'true';
    window.tC.eventTarget.dispatchEvent("consent-update");

    hit(source);
}

TagcommanderTc.names = [
    'tagcommander-tc',
];

TagcommanderTc.injections = [hit, noopFunc, noopStr, noopArray, trueFunc, falseFunc];
