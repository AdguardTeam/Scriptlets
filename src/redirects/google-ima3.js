/* eslint-disable func-names, no-underscore-dangle */
import { hit, noopFunc } from '../helpers';

/**
 * @redirect google-ima3
 *
 * @description
 * Mocks the IMA SDK of Google.
 *
 * **Example**
 * ```
 * ||imasdk.googleapis.com/js/sdkloader/ima3.js$script,redirect=google-ima3
 * ```
 */

export function GoogleIma3(source) {
    const VERSION = '3.453.0';

    const ima = {};

    const AdDisplayContainer = function () { };
    AdDisplayContainer.prototype.destroy = noopFunc;
    AdDisplayContainer.prototype.initialize = noopFunc;

    const ImaSdkSettings = function () { };
    ImaSdkSettings.prototype = {
        c: true,
        f: {},
        i: false,
        l: '',
        p: '',
        r: 0,
        t: '',
        v: '',
        getCompanionBackfill: noopFunc,
        getDisableCustomPlaybackForIOS10Plus: () => this.i,
        getFeatureFlags: () => this.f,
        getLocale: () => this.l,
        getNumRedirects: () => this.r,
        getPlayerType: () => this.t,
        getPlayerVersion: () => this.v,
        getPpid: () => this.p,
        isCookiesEnabled: () => this.c,
        setAutoPlayAdBreaks: noopFunc,
        setCompanionBackfill: noopFunc,
        setCookiesEnabled: (c) => {
            this.c = !!c;
        },
        setDisableCustomPlaybackForIOS10Plus: (i) => {
            this.i = !!i;
        },
        setFeatureFlags: (f) => {
            this.f = !!f;
        },
        setLocale: (l) => {
            this.l = !!l;
        },
        setNumRedirects: (r) => {
            this.r = !!r;
        },
        setPlayerType: (t) => {
            this.t = !!t;
        },
        setPlayerVersion: (v) => {
            this.v = !!v;
        },
        setPpid: (p) => {
            this.p = !!p;
        },
        setSessionId: noopFunc,
        setVpaidAllowed: noopFunc,
        setVpaidMode: noopFunc,
        CompanionBackfillMode: {
            ALWAYS: 'always',
            ON_MASTER_AD: 'on_master_ad',
        },
        VpaidMode: {
            DISABLED: 0,
            ENABLED: 1,
            INSECURE: 2,
        },
    };

    let managerLoaded = false;

    const EventHandler = function () { };
    EventHandler.prototype = {
        listeners: new Map(),
        _dispatch: (e) => {
            const listeners = this.listeners.get(e.type) || [];
            // eslint-disable-next-line no-restricted-syntax
            for (const listener of Array.from(listeners)) {
                try {
                    listener(e);
                } catch (r) {
                    // eslint-disable-next-line no-console
                    console.error(r);
                }
            }
        },
        addEventListener: (t, c) => {
            if (!this.listeners.has(t)) {
                this.listeners.set(t, new Set());
            }
            this.listeners.get(t).add(c);
        },
        removeEventListener: (t, c) => {
            this.listeners.get(t)?.delete(c);
        },
    };

    const AdsManager = function () { };
    // EventHandler props start
    /* eslint-disable no-use-before-define */
    AdsManager.prototype.listeners = new Map();
    AdsManager.prototype._dispatch = (e) => {
        const listeners = this.listeners.get(e.type) || [];
        // eslint-disable-next-line no-restricted-syntax
        for (const listener of Array.from(listeners)) {
            try {
                listener(e);
            } catch (r) {
                // eslint-disable-next-line no-console
                console.error(r);
            }
        }
    };
    AdsManager.prototype.addEventListener = (t, c) => {
        if (!this.listeners.has(t)) {
            this.listeners.set(t, new Set());
        }
        this.listeners.get(t).add(c);
    };
    AdsManager.prototype.removeEventListener = (t, c) => {
        this.listeners.get(t)?.delete(c);
    };
    // Own props start
    AdsManager.prototype.volume = 1;
    AdsManager.prototype.collapse = noopFunc;
    AdsManager.prototype.configureAdsManager = noopFunc;
    AdsManager.prototype.destroy = noopFunc;
    AdsManager.prototype.discardAdBreak = noopFunc;
    AdsManager.prototype.expand = noopFunc;
    AdsManager.prototype.focus = noopFunc;
    AdsManager.prototype.getAdSkippableState = () => false;
    AdsManager.prototype.getCuePoints = () => [0];
    AdsManager.prototype.getCurrentAd = () => currentAd;
    AdsManager.prototype.getCurrentAdCuePoints = () => [];
    AdsManager.prototype.getRemainingTime = () => 0;
    AdsManager.prototype.getVolume = () => this.volume;
    AdsManager.prototype.init = noopFunc;
    AdsManager.prototype.isCustomClickTrackingUsed = () => false;
    AdsManager.prototype.isCustomPlaybackUsed = () => false;
    AdsManager.prototype.pause = noopFunc;
    AdsManager.prototype.requestNextAdBreak = noopFunc;
    AdsManager.prototype.resize = noopFunc;
    AdsManager.prototype.resume = noopFunc;
    AdsManager.prototype.setVolume = (v) => {
        this.volume = v;
    };
    AdsManager.prototype.skip = noopFunc;
    AdsManager.prototype.start = () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const type of [
            AdEvent.Type.LOADED,
            AdEvent.Type.STARTED,
            AdEvent.Type.AD_BUFFERING,
            AdEvent.Type.FIRST_QUARTILE,
            AdEvent.Type.MIDPOINT,
            AdEvent.Type.THIRD_QUARTILE,
            AdEvent.Type.COMPLETE,
            AdEvent.Type.ALL_ADS_COMPLETED,
        ]) {
            try {
                this._dispatch(new ima.AdEvent(type));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }
    };
    AdsManager.prototype.stop = noopFunc;
    AdsManager.prototype.updateAdsRenderingSettings = noopFunc;
    /* eslint-enable no-use-before-define */

    const manager = new AdsManager();

    const AdsManagerLoadedEvent = function () { };
    AdsManagerLoadedEvent.prototype = {
        constructor: (type) => {
            this.type = type;
        },
        getAdsManager: () => manager,
        getUserRequestContext: noopFunc,
    };
    AdsManagerLoadedEvent.Type = {
        ADS_MANAGER_LOADED: 'adsManagerLoaded',
    };

    const AdsLoader = EventHandler;
    AdsLoader.prototype.settings = new ImaSdkSettings();
    AdsLoader.prototype.contentComplete = noopFunc;
    AdsLoader.prototype.destroy = noopFunc;
    AdsLoader.prototype.getSettings = () => this.settings;
    AdsLoader.prototype.getVersion = () => VERSION;
    AdsLoader.prototype.requestAds = () => {
        if (!managerLoaded) {
            managerLoaded = true;
            requestAnimationFrame(() => {
                const { ADS_MANAGER_LOADED } = AdsManagerLoadedEvent.Type;
                this._dispatch(new ima.AdsManagerLoadedEvent(ADS_MANAGER_LOADED));
            });
        }
    };

    const AdsRenderingSettings = noopFunc;

    const AdsRequest = function () { };
    AdsRequest.prototype = {
        setAdWillAutoPlay: noopFunc,
        setAdWillPlayMuted: noopFunc,
        setContinuousPlayback: noopFunc,
    };

    const AdPodInfo = function () { };
    AdPodInfo.prototype = {
        getAdPosition: () => 1,
        getIsBumper: () => false,
        getMaxDuration: () => -1,
        getPodIndex: () => 1,
        getTimeOffset: () => 0,
        getTotalAds: () => 1,
    };

    const Ad = function () { };
    Ad.prototype = {
        pi: new AdPodInfo(),
        getAdId: () => '',
        getAdPodInfo: () => this.pi,
        getAdSystem: () => '',
        getAdvertiserName: () => '',
        getApiFramework: () => null,
        getCompanionAds: () => [],
        getContentType: () => '',
        getCreativeAdId: () => '',
        getDealId: () => '',
        getDescription: () => '',
        getDuration: () => 8.5,
        getHeight: () => 0,
        getMediaUrl: () => null,
        getMinSuggestedDuration: () => -2,
        getSkipTimeOffset: () => -1,
        getSurveyUrl: () => null,
        getTitle: () => '',
        getTraffickingParametersString: () => '',
        getUiElements: () => [''],
        getUniversalAdIdRegistry: () => 'unknown',
        getUniversalAdIds: () => [''],
        getUniversalAdIdValue: () => 'unknown',
        getVastMediaBitrate: () => 0,
        getVastMediaHeight: () => 0,
        getVastMediaWidth: () => 0,
        getWidth: () => 0,
        getWrapperAdIds: () => [''],
        getWrapperAdSystems: () => [''],
        getWrapperCreativeIds: () => [''],
        isLinear: () => true,
    };

    const CompanionAd = function () { };
    CompanionAd.prototype = {
        getAdSlotId: () => '',
        getContent: () => '',
        getContentType: () => '',
        getHeight: () => 1,
        getWidth: () => 1,
    };

    const AdError = function () { };
    AdError.prototype = {
        getErrorCode: () => 0,
        getInnerError: noopFunc,
        getMessage: () => '',
        getType: () => 1,
        getVastErrorCode: () => 0,
        toString: () => '',
    };
    AdError.ErrorCode = {};
    AdError.Type = {};

    const isEngadget = () => {
        try {
            // eslint-disable-next-line no-restricted-syntax
            for (const ctx of Object.values(window.vidible._getContexts())) {
                // eslint-disable-next-line no-restricted-properties
                if (ctx.getPlayer()?.div?.innerHTML.includes('www.engadget.com')) {
                    return true;
                }
            }
        } catch (e) { } // eslint-disable-line no-empty
        return false;
    };

    const currentAd = isEngadget() ? undefined : new Ad();

    const AdEvent = function () { };
    AdEvent.prototype = {
        constructor: (type) => {
            this.type = type;
        },
        getAd: () => currentAd,
        getAdData: () => { },
    };
    AdEvent.Type = {
        AD_BREAK_READY: 'adBreakReady',
        AD_BUFFERING: 'adBuffering',
        AD_CAN_PLAY: 'adCanPlay',
        AD_METADATA: 'adMetadata',
        AD_PROGRESS: 'adProgress',
        ALL_ADS_COMPLETED: 'allAdsCompleted',
        CLICK: 'click',
        COMPLETE: 'complete',
        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
        CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
        DURATION_CHANGE: 'durationChange',
        EXPANDED_CHANGED: 'expandedChanged',
        FIRST_QUARTILE: 'firstQuartile',
        IMPRESSION: 'impression',
        INTERACTION: 'interaction',
        LINEAR_CHANGE: 'linearChange',
        LINEAR_CHANGED: 'linearChanged',
        LOADED: 'loaded',
        LOG: 'log',
        MIDPOINT: 'midpoint',
        PAUSED: 'pause',
        RESUMED: 'resume',
        SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
        SKIPPED: 'skip',
        STARTED: 'start',
        THIRD_QUARTILE: 'thirdQuartile',
        USER_CLOSE: 'userClose',
        VIDEO_CLICKED: 'videoClicked',
        VIDEO_ICON_CLICKED: 'videoIconClicked',
        VIEWABLE_IMPRESSION: 'viewable_impression',
        VOLUME_CHANGED: 'volumeChange',
        VOLUME_MUTED: 'mute',
    };

    const AdErrorEvent = function () { };
    AdErrorEvent.prototype = {
        getError: noopFunc,
        getUserRequestContext: () => { },
    };
    AdErrorEvent.Type = {
        AD_ERROR: 'adError',
    };

    const CustomContentLoadedEvent = function () { };
    CustomContentLoadedEvent.Type = {
        CUSTOM_CONTENT_LOADED: 'deprecated-event',
    };

    const CompanionAdSelectionSettings = function () { };
    CompanionAdSelectionSettings.CreativeType = {
        ALL: 'All',
        FLASH: 'Flash',
        IMAGE: 'Image',
    };
    CompanionAdSelectionSettings.ResourceType = {
        ALL: 'All',
        HTML: 'Html',
        IFRAME: 'IFrame',
        STATIC: 'Static',
    };
    CompanionAdSelectionSettings.SizeCriteria = {
        IGNORE: 'IgnoreSize',
        SELECT_EXACT_MATCH: 'SelectExactMatch',
        SELECT_NEAR_MATCH: 'SelectNearMatch',
    };

    const AdCuePoints = function () { };
    AdCuePoints.prototype.getCuePoints = () => [];

    const AdProgressData = noopFunc;

    const UniversalAdIdInfo = function () { };
    AdCuePoints.prototype = {
        getAdIdRegistry: () => '',
        getAdIsValue: () => '',
    };

    Object.assign(ima, {
        AdCuePoints,
        AdDisplayContainer,
        AdError,
        AdErrorEvent,
        AdEvent,
        AdPodInfo,
        AdProgressData,
        AdsLoader,
        AdsManager: manager,
        AdsManagerLoadedEvent,
        AdsRenderingSettings,
        AdsRequest,
        CompanionAd,
        CompanionAdSelectionSettings,
        CustomContentLoadedEvent,
        gptProxyInstance: {},
        ImaSdkSettings,
        OmidAccessMode: {
            DOMAIN: 'domain',
            FULL: 'full',
            LIMITED: 'limited',
        },
        settings: new ImaSdkSettings(),
        UiElements: {
            AD_ATTRIBUTION: 'adAttribution',
            COUNTDOWN: 'countdown',
        },
        UniversalAdIdInfo,
        VERSION,
        ViewMode: {
            FULLSCREEN: 'fullscreen',
            NORMAL: 'normal',
        },
    });

    if (!window.google) {
        window.google = {};
    }

    window.google.ima = ima;

    hit(source);
}
GoogleIma3.names = ['google-ima3'];

GoogleIma3.injections = [hit, noopFunc];
