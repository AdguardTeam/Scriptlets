import { hit } from '../helpers/hit';
import {
    noop,
    noopThis,
    noopNull,
    noopArray,
    noopStr,
} from '../helpers/noop';

/**
 * Mocks Google Publisher Tag API
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/blob/a94df7f3b27080ae2dcb3b914ace39c0c294d2f6/src/web_accessible_resources/googletagservices_gpt.js
 */
export function GoogleTagServicesGpt(source) {
    const companionAdsService = {
        addEventListener: noopThis,
        enableSyncLoading: noop,
        setRefreshUnfilledSlots: noop,
    };
    const contentService = {
        addEventListener: noopThis,
        setContent: noop,
    };
    function PassbackSlot() { } // constructor

    PassbackSlot.prototype.display = noop;
    PassbackSlot.prototype.get = noopNull;
    PassbackSlot.prototype.set = noopThis;
    PassbackSlot.prototype.setClickUrl = noopThis;
    PassbackSlot.prototype.setTagForChildDirectedTreatment = noopThis;
    PassbackSlot.prototype.setTargeting = noopThis;
    PassbackSlot.prototype.updateTargetingFromMap = noopThis;

    function SizeMappingBuilder() { } // constructor
    SizeMappingBuilder.prototype.addSize = noopThis;
    SizeMappingBuilder.prototype.build = noopNull;

    function Slot() { } // constructor
    Slot.prototype.addService = noopThis;
    Slot.prototype.clearCategoryExclusions = noopThis;
    Slot.prototype.clearTargeting = noopThis;
    Slot.prototype.defineSizeMapping = noopThis;
    Slot.prototype.get = noopNull;
    Slot.prototype.getAdUnitPath = noopArray;
    Slot.prototype.getAttributeKeys = noopArray;
    Slot.prototype.getCategoryExclusions = noopArray;
    Slot.prototype.getDomId = noopStr;
    Slot.prototype.getSlotElementId = noopStr;
    Slot.prototype.getSlotId = noopThis;
    Slot.prototype.getTargeting = noopArray;
    Slot.prototype.getTargetingKeys = noopArray;
    Slot.prototype.set = noopThis;
    Slot.prototype.setCategoryExclusion = noopThis;
    Slot.prototype.setClickUrl = noopThis;
    Slot.prototype.setCollapseEmptyDiv = noopThis;
    Slot.prototype.setTargeting = noopThis;

    const pubAdsService = {
        addEventListener: noopThis,
        clear: noop,
        clearCategoryExclusions: noopThis,
        clearTagForChildDirectedTreatment: noopThis,
        clearTargeting: noopThis,
        collapseEmptyDivs: noop,
        defineOutOfPagePassback() { return new PassbackSlot(); },
        definePassback() { return new PassbackSlot(); },
        disableInitialLoad: noop,
        display: noop,
        enableAsyncRendering: noop,
        enableSingleRequest: noop,
        enableSyncRendering: noop,
        enableVideoAds: noop,
        get: noopNull,
        getAttributeKeys: noopArray,
        getTargeting: noop,
        getTargetingKeys: noopArray,
        getSlots: noopArray,
        refresh: noop,
        set: noopThis,
        setCategoryExclusion: noopThis,
        setCentering: noop,
        setCookieOptions: noopThis,
        setForceSafeFrame: noopThis,
        setLocation: noopThis,
        setPublisherProvidedId: noopThis,
        setRequestNonPersonalizedAds: noopThis,
        setSafeFrameConfig: noopThis,
        setTagForChildDirectedTreatment: noopThis,
        setTargeting: noopThis,
        setVideoContent: noopThis,
        updateCorrelator: noop,
    };


    const { googletag = {} } = window.googletag;
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
    googletag.defineOutOfPageSlot = () => new Slot();
    googletag.defineSlot = () => new Slot();
    googletag.destroySlots = noop;
    googletag.disablePublisherConsole = noop;
    googletag.display = noop;
    googletag.enableServices = noop;
    googletag.getVersion = noopStr;
    googletag.pubads = () => pubAdsService;
    googletag.pubadsReady = true;
    googletag.setAdIframeTitle = noop;
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
    noop,
    noopThis,
    noopNull,
    noopArray,
    noopStr,
];
