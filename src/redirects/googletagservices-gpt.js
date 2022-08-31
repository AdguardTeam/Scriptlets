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
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagservices_gpt.js
 *
 * **Example**
 * ```
 * ||googletagservices.com/tag/js/gpt.js$script,redirect=googletagservices-gpt
 * ```
 */
export function GoogleTagServicesGpt(source) {
    const slots = new Map();
    const slotsById = new Map();
    const eventCallbacks = new Map();

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
        // eslint-disable-next-line compat/compat
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

    function Slot(adUnitPath, creatives, optDiv) {
        this.adUnitPath = adUnitPath;
        this.creatives = creatives;
        this.optDiv = optDiv;

        if (slotsById.has(optDiv)) {
            document.getElementById(optDiv)?.remove();
            return slotsById.get(optDiv);
        }
        slotsById.set(optDiv, this);
    } // constructor
    Slot.prototype.addService = noopThis;
    Slot.prototype.clearCategoryExclusions = noopThis;
    Slot.prototype.clearTargeting = noopThis;
    Slot.prototype.defineSizeMapping = noopThis;
    Slot.prototype.get = noopNull;
    Slot.prototype.getAdUnitPath = function () {
        return this.adUnitPath;
    };
    Slot.prototype.getAttributeKeys = noopArray;
    Slot.prototype.getCategoryExclusions = noopArray;
    Slot.prototype.getDomId = function () {
        return this.optDiv;
    };
    Slot.prototype.getSlotElementId = function () {
        return this.optDiv;
    };
    Slot.prototype.getSlotId = noopThis;
    Slot.prototype.getSizes = noopArray;
    Slot.prototype.getTargeting = noopArray;
    Slot.prototype.getTargetingKeys = noopArray;
    Slot.prototype.set = noopThis;
    Slot.prototype.setCategoryExclusion = noopThis;
    Slot.prototype.setClickUrl = noopThis;
    Slot.prototype.setCollapseEmptyDiv = noopThis;
    Slot.prototype.setTargeting = noopThis;

    const pubAdsService = {
        addEventListener,
        removeEventListener,
        clear: noopFunc,
        clearCategoryExclusions: noopThis,
        clearTagForChildDirectedTreatment: noopThis,
        clearTargeting: noopThis,
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
        setPublisherProvidedId: noopThis,
        setRequestNonPersonalizedAds: noopThis,
        setSafeFrameConfig: noopThis,
        setTagForChildDirectedTreatment: noopThis,
        setTargeting: noopThis,
        setVideoContent: noopThis,
        updateCorrelator: noopFunc,
    };

    const getNewSlot = (adUnitPath, creatives, optDiv) => new Slot(adUnitPath, creatives, optDiv);

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
    googletag.defineOutOfPageSlot = getNewSlot;
    googletag.defineSlot = getNewSlot;
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
