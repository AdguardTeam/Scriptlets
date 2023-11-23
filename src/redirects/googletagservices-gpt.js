/* eslint-disable func-names */
import {
    hit,
    noopFunc,
    noopThis,
    noopNull,
    noopArray,
    noopStr,
    trueFunc,
} from '../helpers/index';

/**
 * @redirect googletagservices-gpt
 *
 * @description
 * Mocks Google Publisher Tag API.
 *
 * Related UBO redirect resource:
 * https://github.com/gorhill/uBlock/blob/master/src/web_accessible_resources/googletagservices_gpt.js
 *
 * ### Examples
 *
 * ```adblock
 * ||googletagservices.com/tag/js/gpt.js$script,redirect=googletagservices-gpt
 * ```
 *
 * @added v1.0.10.
 */
export function GoogleTagServicesGpt(source) {
    const slots = new Map();
    const slotsById = new Map();
    const slotsPerPath = new Map();
    const slotCreatives = new Map();
    const eventCallbacks = new Map();

    const gTargeting = new Map();

    const addEventListener = function (name, listener) {
        if (!eventCallbacks.has(name)) {
            eventCallbacks.set(name, new Set());
        }
        eventCallbacks.get(name).add(listener);
        return this;
    };

    const removeEventListener = function (name, listener) {
        if (eventCallbacks.has(name)) {
            return eventCallbacks.get(name).delete(listener);
        }
        return false;
    };

    const fireSlotEvent = (name, slot) => {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                const size = [0, 0];
                const callbacksSet = eventCallbacks.get(name) || [];
                const callbackArray = Array.from(callbacksSet);
                for (let i = 0; i < callbackArray.length; i += 1) {
                    callbackArray[i]({ isEmpty: true, size, slot });
                }
                resolve();
            });
        });
    };

    const emptySlotElement = (slot) => {
        const node = document.getElementById(slot.getSlotElementId());
        while (node?.lastChild) {
            node.lastChild.remove();
        }
    };

    const recreateIframeForSlot = (slot) => {
        const eid = `google_ads_iframe_${slot.getId()}`;
        document.getElementById(eid)?.remove();
        const node = document.getElementById(slot.getSlotElementId());
        if (node) {
            const f = document.createElement('iframe');
            f.id = eid;
            f.srcdoc = '<body></body>';
            f.style = 'position:absolute; width:0; height:0; left:0; right:0; z-index:-1; border:0';
            f.setAttribute('width', 0);
            f.setAttribute('height', 0);
            // https://github.com/AdguardTeam/Scriptlets/issues/259
            f.setAttribute('data-load-complete', true);
            f.setAttribute('data-google-container-id', true);
            f.setAttribute('sandbox', '');
            node.appendChild(f);
        }
    };

    const displaySlot = (slot) => {
        if (!slot) {
            return;
        }
        const id = slot.getSlotElementId();
        if (!document.getElementById(id)) {
            return;
        }

        const parent = document.getElementById(id);
        if (parent) {
            parent.appendChild(document.createElement('div'));
        }

        emptySlotElement(slot);
        recreateIframeForSlot(slot);
        fireSlotEvent('slotRenderEnded', slot);
        fireSlotEvent('slotRequested', slot);
        fireSlotEvent('slotResponseReceived', slot);
        fireSlotEvent('slotOnload', slot);
        fireSlotEvent('impressionViewable', slot);
    };

    const companionAdsService = {
        addEventListener,
        removeEventListener,
        enableSyncLoading: noopFunc,
        setRefreshUnfilledSlots: noopFunc,
        getSlots: noopArray,
    };
    const contentService = {
        addEventListener,
        removeEventListener,
        setContent: noopFunc,
    };
    function PassbackSlot() { } // constructor

    PassbackSlot.prototype.display = noopFunc;
    PassbackSlot.prototype.get = noopNull;
    PassbackSlot.prototype.set = noopThis;
    PassbackSlot.prototype.setClickUrl = noopThis;
    PassbackSlot.prototype.setTagForChildDirectedTreatment = noopThis;
    PassbackSlot.prototype.setTargeting = noopThis;
    PassbackSlot.prototype.updateTargetingFromMap = noopThis;

    function SizeMappingBuilder() { } // constructor
    SizeMappingBuilder.prototype.addSize = noopThis;
    SizeMappingBuilder.prototype.build = noopNull;

    const getTargetingValue = (v) => {
        if (typeof v === 'string') {
            return [v];
        }
        try {
            return Array.prototype.flat.call(v);
        } catch {
            // do nothing
        }
        return [];
    };

    const updateTargeting = (targeting, map) => {
        if (typeof map === 'object') {
            for (const key in map) {
                if (Object.prototype.hasOwnProperty.call(map, key)) {
                    targeting.set(key, getTargetingValue(map[key]));
                }
            }
        }
    };

    const defineSlot = (adUnitPath, creatives, optDiv) => {
        if (slotsById.has(optDiv)) {
            document.getElementById(optDiv)?.remove();
            return slotsById.get(optDiv);
        }
        const attributes = new Map();
        const targeting = new Map();
        const exclusions = new Set();
        const response = {
            advertiserId: undefined,
            campaignId: undefined,
            creativeId: undefined,
            creativeTemplateId: undefined,
            lineItemId: undefined,
        };
        const sizes = [
            {
                getHeight: () => 2,
                getWidth: () => 2,
            },
        ];
        const num = (slotsPerPath.get(adUnitPath) || 0) + 1;
        slotsPerPath.set(adUnitPath, num);
        const id = `${adUnitPath}_${num}`;
        let clickUrl = '';
        let collapseEmptyDiv = null;
        const services = new Set();
        const slot = {
            addService(e) {
                services.add(e);
                return slot;
            },
            clearCategoryExclusions: noopThis,
            clearTargeting(k) {
                if (k === undefined) {
                    targeting.clear();
                } else {
                    targeting.delete(k);
                }
            },
            defineSizeMapping(mapping) {
                slotCreatives.set(optDiv, mapping);
                return this;
            },
            get: (k) => attributes.get(k),
            getAdUnitPath: () => adUnitPath,
            getAttributeKeys: () => Array.from(attributes.keys()),
            getCategoryExclusions: () => Array.from(exclusions),
            getClickUrl: () => clickUrl,
            getCollapseEmptyDiv: () => collapseEmptyDiv,
            getContentUrl: () => '',
            getDivStartsCollapsed: () => null,
            getDomId: () => optDiv,
            getEscapedQemQueryId: () => '',
            getFirstLook: () => 0,
            getId: () => id,
            getHtml: () => '',
            getName: () => id,
            getOutOfPage: () => false,
            getResponseInformation: () => response,
            getServices: () => Array.from(services),
            getSizes: () => sizes,
            getSlotElementId: () => optDiv,
            getSlotId: () => slot,
            getTargeting: (k) => targeting.get(k) || gTargeting.get(k) || [],
            getTargetingKeys: () => Array.from(
                new Set(Array.of(...gTargeting.keys(), ...targeting.keys())),
            ),
            getTargetingMap: () => Object.assign(
                Object.fromEntries(gTargeting.entries()),
                Object.fromEntries(targeting.entries()),
            ),
            set(k, v) {
                attributes.set(k, v);
                return slot;
            },
            setCategoryExclusion(e) {
                exclusions.add(e);
                return slot;
            },
            setClickUrl(u) {
                clickUrl = u;
                return slot;
            },
            setCollapseEmptyDiv(v) {
                collapseEmptyDiv = !!v;
                return slot;
            },
            setSafeFrameConfig: noopThis,
            setTagForChildDirectedTreatment: noopThis,
            setTargeting(k, v) {
                targeting.set(k, getTargetingValue(v));
                return slot;
            },
            toString: () => id,
            updateTargetingFromMap(map) {
                updateTargeting(targeting, map);
                return slot;
            },
        };
        slots.set(adUnitPath, slot);
        slotsById.set(optDiv, slot);
        slotCreatives.set(optDiv, creatives);
        return slot;
    };

    const pubAdsService = {
        addEventListener,
        removeEventListener,
        clear: noopFunc,
        clearCategoryExclusions: noopThis,
        clearTagForChildDirectedTreatment: noopThis,
        clearTargeting(k) {
            if (k === undefined) {
                gTargeting.clear();
            } else {
                gTargeting.delete(k);
            }
        },
        collapseEmptyDivs: noopFunc,
        defineOutOfPagePassback() { return new PassbackSlot(); },
        definePassback() { return new PassbackSlot(); },
        disableInitialLoad: noopFunc,
        display: noopFunc,
        enableAsyncRendering: noopFunc,
        enableLazyLoad: noopFunc,
        enableSingleRequest: noopFunc,
        enableSyncRendering: noopFunc,
        enableVideoAds: noopFunc,
        get: noopNull,
        getAttributeKeys: noopArray,
        getTargeting: noopArray,
        getTargetingKeys: noopArray,
        getSlots: noopArray,
        isInitialLoadDisabled: trueFunc,
        refresh: noopFunc,
        set: noopThis,
        setCategoryExclusion: noopThis,
        setCentering: noopFunc,
        setCookieOptions: noopThis,
        setForceSafeFrame: noopThis,
        setLocation: noopThis,
        setPrivacySettings: noopThis,
        setPublisherProvidedId: noopThis,
        setRequestNonPersonalizedAds: noopThis,
        setSafeFrameConfig: noopThis,
        setTagForChildDirectedTreatment: noopThis,
        setTargeting: noopThis,
        setVideoContent: noopThis,
        updateCorrelator: noopFunc,
    };

    const { googletag = {} } = window;
    const { cmd = [] } = googletag;

    googletag.apiReady = true;
    googletag.cmd = [];
    googletag.cmd.push = (a) => {
        try {
            a();
            // eslint-disable-next-line no-empty
        } catch (ex) { }
        return 1;
    };
    googletag.companionAds = () => companionAdsService;
    googletag.content = () => contentService;
    googletag.defineOutOfPageSlot = defineSlot;
    googletag.defineSlot = defineSlot;
    googletag.destroySlots = function () {
        slots.clear();
        slotsById.clear();
    };
    googletag.disablePublisherConsole = noopFunc;
    googletag.display = function (arg) {
        let id;
        if (arg?.getSlotElementId) {
            id = arg.getSlotElementId();
        } else if (arg?.nodeType) {
            id = arg.id;
        } else {
            id = String(arg);
        }
        displaySlot(slotsById.get(id));
    };
    googletag.enableServices = noopFunc;
    googletag.getVersion = noopStr;
    googletag.pubads = () => pubAdsService;
    googletag.pubadsReady = true;
    googletag.setAdIframeTitle = noopFunc;
    googletag.sizeMapping = () => new SizeMappingBuilder();

    window.googletag = googletag;
    while (cmd.length !== 0) {
        googletag.cmd.push(cmd.shift());
    }

    hit(source);
}

GoogleTagServicesGpt.names = [
    'googletagservices-gpt',
    'ubo-googletagservices_gpt.js',
    'googletagservices_gpt.js',
];

GoogleTagServicesGpt.injections = [
    hit,
    noopFunc,
    noopThis,
    noopNull,
    noopArray,
    noopStr,
    trueFunc,
];
