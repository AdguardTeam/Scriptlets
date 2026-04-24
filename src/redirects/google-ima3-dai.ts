/* eslint-disable func-names, no-underscore-dangle */
import { hit, logMessage } from '../helpers';
import { type Source } from '../scriptlets';

/**
 * @redirect google-ima3-dai
 *
 * @description
 * Mocks the IMA DAI SDK of Google.
 *
 * ### Examples
 *
 * ```adblock
 * ||imasdk.googleapis.com/js/sdkloader/ima3_dai.js$script,redirect=google-ima3-dai
 * ```
 *
 * @added v2.4.2.
 */

type PlainRecord = Record<string, unknown>;
type GoogleWindow = Window & { google?: PlainRecord };
type EventListener = (streamEvent: StreamEventInstance) => void;
type EventTypeInput = string | string[];
type StreamRequestInput = StreamRequestInstance | PlainRecord | null | undefined;

interface EventHandlerInstance {
    listeners: Map<string, Set<EventListener>>;
    addEventListener(type: EventTypeInput, listener: EventListener): void;
    removeEventListener(type: EventTypeInput, listener: EventListener): void;
    dispatchEvent(streamEvent: StreamEventInstance): void;
}

interface StreamRequestInstance extends PlainRecord {
    adTagParameters: Record<string, string>;
    apiKey: string | null;
    authToken: string | null;
    format: string;
    networkCode: string | null;
    omidAccessModeRules: PlainRecord | null;
    streamActivityMonitorId: string | null;
}

interface LiveStreamRequestInstance extends StreamRequestInstance {
    assetKey: string;
}

interface PodStreamRequestInstance extends StreamRequestInstance {
    customAssetKey: string;
}

interface VideoStitcherLiveStreamRequestInstance extends PodStreamRequestInstance {
    liveStreamEventId: string;
    oAuthToken: string | null;
    projectNumber: string | null;
    region: string | null;
    videoStitcherSessionOptions: PlainRecord | null;
}

interface VideoStitcherVodStreamRequestInstance extends StreamRequestInstance {
    adTagUrl: string;
    contentSourceUrl: string;
    oAuthToken: string | null;
    projectNumber: string | null;
    region: string | null;
    videoStitcherSessionOptions: PlainRecord | null;
    vodConfigId: string;
}

interface VODStreamRequestInstance extends StreamRequestInstance {
    contentSourceId: string;
    videoId: string;
}

interface StreamDataInstance extends PlainRecord {
    adPeriodData: PlainRecord | null;
    adProgressData: PlainRecord | null;
    cuepoints: PlainRecord[];
    errorMessage: string | null;
    manifestFormat: string;
    streamId: string | null;
    subtitles: PlainRecord[];
    url: string;
}

interface StreamEventInstance {
    type: string;
    streamData: StreamDataInstance;
    ad: PlainRecord | null;
    getAd(): PlainRecord | null;
    getStreamData(): StreamDataInstance;
}

interface FetchResponseLike {
    json?: () => Promise<unknown>;
    ok?: boolean;
    status?: number;
}

interface UiSettingsInstance {
    locale: string;
    getLocale(): string;
    setLocale(locale: string): void;
}

interface DaiSdkSettingsInstance {
    getFeatureFlags(): PlainRecord;
    setFeatureFlags(featureFlags: PlainRecord): void;
}

interface StreamManagerInstance extends EventHandlerInstance {
    videoElement: HTMLVideoElement | null;
    adUiElement: HTMLElement | null;
    uiSettings: UiSettingsInstance;
    clickElement: Element | null;
    streamData: StreamDataInstance;
    streamMonitor: PlainRecord;
    streamRequest: StreamRequestInstance | null;
    cuepoints: PlainRecord[];
    lastMetadata: PlainRecord | null;
    lastTimedMetadata: PlainRecord | null;
    contentTimeForStreamTime(streamTime: number): number;
    destroy(): void;
    focus(): void;
    getAdSkippableState(): boolean;
    getStreamData(): StreamDataInstance;
    loadStreamMetadata(): void;
    onTimedMetadata(metadata: PlainRecord | null): void;
    previousCuePointForStreamTime(streamTime: number): PlainRecord | null;
    processMetadata(type: string, data: string | Uint8Array, timestamp: number): void;
    replaceAdTagParameters(adTagParameters: PlainRecord): void;
    requestStream(streamRequest?: StreamRequestInput): void;
    reset(): void;
    setClickElement(clickElement: Element | null): void;
    streamTimeForContentTime(contentTime: number): number;
}

type EventHandlerConstructor = {
    new (): EventHandlerInstance;
    prototype: EventHandlerInstance;
};

type StreamRequestConstructor = {
    new (streamRequest?: StreamRequestInput): StreamRequestInstance;
    prototype: StreamRequestInstance;
    StreamFormat: {
        DASH: 'dash';
        HLS: 'hls';
    };
};

type LiveStreamRequestConstructor = {
    new (liveStreamRequest?: StreamRequestInput): LiveStreamRequestInstance;
    prototype: LiveStreamRequestInstance;
};

type PodStreamRequestConstructor = {
    new (podStreamRequest?: StreamRequestInput): PodStreamRequestInstance;
    prototype: PodStreamRequestInstance;
};

type VideoStitcherLiveStreamRequestConstructor = {
    new (videoStitcherLiveStreamRequest?: StreamRequestInput): VideoStitcherLiveStreamRequestInstance;
    prototype: VideoStitcherLiveStreamRequestInstance;
};

type VideoStitcherVodStreamRequestConstructor = {
    new (videoStitcherVodStreamRequest?: StreamRequestInput): VideoStitcherVodStreamRequestInstance;
    prototype: VideoStitcherVodStreamRequestInstance;
};

type VODStreamRequestConstructor = {
    new (vodStreamRequest?: StreamRequestInput): VODStreamRequestInstance;
    prototype: VODStreamRequestInstance;
};

type StreamDataConstructor = {
    new (streamData?: PlainRecord | null): StreamDataInstance;
    prototype: StreamDataInstance;
};

type StreamEventConstructor = {
    new (type: string, streamData?: StreamDataInstance, ad?: PlainRecord | null): StreamEventInstance;
    prototype: StreamEventInstance;
    Type: PlainRecord;
};

type UiSettingsConstructor = {
    new (): UiSettingsInstance;
    prototype: UiSettingsInstance;
};

type DaiSdkSettingsConstructor = {
    new (): DaiSdkSettingsInstance;
    prototype: DaiSdkSettingsInstance;
};

type StreamManagerConstructor = {
    new (
        videoElement?: HTMLVideoElement | null,
        adUiElement?: HTMLElement | null,
        uiSettings?: UiSettingsInstance | null,
    ): StreamManagerInstance;
    prototype: StreamManagerInstance;
};

export function GoogleIma3Dai(source: Source) {
    const streamEventTypes = {
        AD_BREAK_ENDED: 'adBreakEnded',
        AD_BREAK_STARTED: 'adBreakStarted',
        AD_PERIOD_ENDED: 'adPeriodEnded',
        AD_PERIOD_STARTED: 'adPeriodStarted',
        AD_PROGRESS: 'adProgress',
        CLICK: 'click',
        COMPLETE: 'complete',
        CUEPOINTS_CHANGED: 'cuepointsChanged',
        ERROR: 'error',
        FIRST_QUARTILE: 'firstquartile',
        HIDE_AD_UI: 'hideAdUi',
        LOADED: 'loaded',
        MIDPOINT: 'midpoint',
        PAUSED: 'paused',
        RESUMED: 'resumed',
        SHOW_AD_UI: 'showAdUi',
        SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
        SKIPPED: 'skip',
        STARTED: 'started',
        STREAM_INITIALIZED: 'streamInitialized',
        THIRD_QUARTILE: 'thirdquartile',
        VIDEO_CLICKED: 'videoClicked',
    };

    /**
     * Returns whether a value can be treated as a plain record.
     *
     * @param value - The value to check.
     */
    const isRecord = (value: unknown): value is PlainRecord => typeof value === 'object' && value !== null;

    /**
     * Schedules work on the next animation frame or macrotask.
     *
     * @param callback - The function to invoke asynchronously.
     */
    const schedule = (callback: () => void): void => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(callback);
            return;
        }

        setTimeout(callback, 0);
    };

    /**
     * Converts record values to strings.
     *
     * @param value - The record whose values will be stringified.
     */
    const toStringRecord = (value?: PlainRecord | null): Record<string, string> => {
        if (!isRecord(value)) {
            return {};
        }

        const result: Record<string, string> = {};
        const propertyNames = Object.keys(value);
        for (let propertyIndex = 0; propertyIndex < propertyNames.length; propertyIndex += 1) {
            const propertyName = propertyNames[propertyIndex];
            result[propertyName] = String(value[propertyName]);
        }

        return result;
    };

    /**
     * Returns a non-empty string value or `null`.
     *
     * @param value - The candidate value to check for a non-empty string.
     */
    const getStringValue = (value: unknown): string | null => {
        return typeof value === 'string' && value.length > 0 ? value : null;
    };

    /**
     * Initializes the listener registry for an event handler instance.
     *
     * @param instance - The event handler to initialize.
     */
    const initializeEventHandler = (instance: EventHandlerInstance): void => {
        instance.listeners = new Map();
    };

    /**
     * Normalizes one or more event types into a flat string list.
     *
     * @param type - A single event type string or an array of event type strings.
     */
    const normalizeEventTypes = (type: EventTypeInput): string[] => {
        if (typeof type === 'string') {
            return [type];
        }

        if (!Array.isArray(type)) {
            return [];
        }

        const eventTypes: string[] = [];

        for (let eventTypeIndex = 0; eventTypeIndex < type.length; eventTypeIndex += 1) {
            const eventType = type[eventTypeIndex];
            if (typeof eventType === 'string') {
                eventTypes.push(eventType);
            }
        }

        return eventTypes;
    };

    /**
     * Applies default fields and user-supplied values to a stream request.
     *
     * @param instance - The request object to initialize with defaults and any provided overrides.
     * @param streamRequest - Optional source of user-supplied overrides.
     */
    const initializeStreamRequest = (
        instance: StreamRequestInstance,
        streamRequest?: StreamRequestInput,
    ): void => {
        instance.adTagParameters = {};
        instance.apiKey = null;
        instance.authToken = null;
        instance.format = 'hls';
        instance.networkCode = null;
        instance.omidAccessModeRules = null;
        instance.streamActivityMonitorId = null;

        if (isRecord(streamRequest)) {
            Object.assign(instance, streamRequest);
        }
        instance.adTagParameters = toStringRecord(instance.adTagParameters);

        if (typeof instance.format !== 'string' || instance.format.length === 0) {
            instance.format = 'hls';
        }
    };

    /**
     * Applies pod-serving request fields on top of the base stream request defaults.
     *
     * @param instance - The pod request object to initialize with defaults and any provided overrides.
     * @param podStreamRequest - Optional source of user-supplied overrides.
     */
    const initializePodStreamRequest = (
        instance: PodStreamRequestInstance,
        podStreamRequest?: StreamRequestInput,
    ): void => {
        initializeStreamRequest(instance, podStreamRequest);
        instance.customAssetKey = typeof instance.customAssetKey === 'string' ? instance.customAssetKey : '';
    };

    /**
     * Creates an event handler with an empty listener map.
     */
    const EventHandler = function (this: EventHandlerInstance) {
        initializeEventHandler(this);
    } as unknown as EventHandlerConstructor;
    /**
     * Registers one listener for one or more event types.
     *
     * @param type - The event type or types to listen for.
     * @param listener - The callback to invoke when the event fires.
     */
    EventHandler.prototype.addEventListener = function (
        this: EventHandlerInstance,
        type: EventTypeInput,
        listener: EventListener,
    ): void {
        if (typeof listener !== 'function') {
            return;
        }

        const eventTypes = normalizeEventTypes(type);
        for (let eventTypeIndex = 0; eventTypeIndex < eventTypes.length; eventTypeIndex += 1) {
            const eventType = eventTypes[eventTypeIndex];

            if (!this.listeners.has(eventType)) {
                // Use a Set because one event type can have multiple callbacks, while repeated
                // registrations of the same callback should still dispatch only once.
                this.listeners.set(eventType, new Set());
            }

            const listeners = this.listeners.get(eventType);
            if (listeners) {
                listeners.add(listener);
            }
        }
    };
    /**
     * Removes one listener from one or more event types.
     *
     * @param type - The event type or types to stop listening for.
     * @param listener - The callback to remove.
     */
    EventHandler.prototype.removeEventListener = function (
        this: EventHandlerInstance,
        type: EventTypeInput,
        listener: EventListener,
    ): void {
        if (typeof listener !== 'function') {
            return;
        }

        const eventTypes = normalizeEventTypes(type);
        for (let eventTypeIndex = 0; eventTypeIndex < eventTypes.length; eventTypeIndex += 1) {
            const listeners = this.listeners.get(eventTypes[eventTypeIndex]);
            if (!listeners) {
                continue;
            }

            listeners.delete(listener);
        }
    };
    /**
     * Dispatches a stream event to every registered listener for its type.
     *
     * @param streamEvent - The event to dispatch.
     */
    EventHandler.prototype.dispatchEvent = function (
        this: EventHandlerInstance,
        streamEvent: StreamEventInstance,
    ): void {
        const listeners = this.listeners.get(streamEvent.type);
        if (!listeners) {
            return;
        }

        for (const listener of Array.from(listeners)) {
            try {
                listener(streamEvent);
            } catch (error) {
                logMessage(source, error);
            }
        }
    };

    const streamFormats = {
        DASH: 'dash',
        HLS: 'hls',
    } as const;

    /**
     * Creates a base stream request instance.
     *
     * @param streamRequest - Optional initial values for the request fields.
     */
    const StreamRequest = function (
        this: StreamRequestInstance,
        streamRequest?: StreamRequestInput,
    ) {
        initializeStreamRequest(this, streamRequest);
    } as unknown as StreamRequestConstructor;
    StreamRequest.StreamFormat = streamFormats;

    /**
     * Creates a live stream request instance.
     *
     * @param liveStreamRequest - Optional initial values for the live request fields.
     */
    const LiveStreamRequest = function (
        this: LiveStreamRequestInstance,
        liveStreamRequest?: StreamRequestInput,
    ) {
        initializeStreamRequest(this, liveStreamRequest);
        this.assetKey = typeof this.assetKey === 'string' ? this.assetKey : '';
    } as unknown as LiveStreamRequestConstructor;
    Object.setPrototypeOf(LiveStreamRequest.prototype, StreamRequest.prototype);

    /**
     * Creates a pod stream request instance.
     *
     * @param podStreamRequest - Optional initial values for the pod request fields.
     */
    const PodStreamRequest = function (
        this: PodStreamRequestInstance,
        podStreamRequest?: StreamRequestInput,
    ) {
        initializePodStreamRequest(this, podStreamRequest);
    } as unknown as PodStreamRequestConstructor;
    Object.setPrototypeOf(PodStreamRequest.prototype, StreamRequest.prototype);

    /**
     * Creates a Video Stitcher live stream request instance.
     *
     * @param videoStitcherLiveStreamRequest - Optional initial values for the request fields.
     */
    const VideoStitcherLiveStreamRequest = function (
        this: VideoStitcherLiveStreamRequestInstance,
        videoStitcherLiveStreamRequest?: StreamRequestInput,
    ) {
        initializePodStreamRequest(this, videoStitcherLiveStreamRequest);
        this.liveStreamEventId = typeof this.liveStreamEventId === 'string' ? this.liveStreamEventId : '';
        this.oAuthToken = typeof this.oAuthToken === 'string' ? this.oAuthToken : null;
        this.projectNumber = typeof this.projectNumber === 'string' ? this.projectNumber : null;
        this.region = typeof this.region === 'string' ? this.region : null;
        this.videoStitcherSessionOptions = isRecord(this.videoStitcherSessionOptions)
            ? this.videoStitcherSessionOptions
            : null;
    } as unknown as VideoStitcherLiveStreamRequestConstructor;
    Object.setPrototypeOf(VideoStitcherLiveStreamRequest.prototype, PodStreamRequest.prototype);

    /**
     * Creates a Video Stitcher VOD stream request instance.
     *
     * @param videoStitcherVodStreamRequest - Optional initial values for the request fields.
     */
    const VideoStitcherVodStreamRequest = function (
        this: VideoStitcherVodStreamRequestInstance,
        videoStitcherVodStreamRequest?: StreamRequestInput,
    ) {
        initializeStreamRequest(this, videoStitcherVodStreamRequest);
        this.adTagUrl = typeof this.adTagUrl === 'string' ? this.adTagUrl : '';
        this.contentSourceUrl = typeof this.contentSourceUrl === 'string' ? this.contentSourceUrl : '';
        this.oAuthToken = typeof this.oAuthToken === 'string' ? this.oAuthToken : null;
        this.projectNumber = typeof this.projectNumber === 'string' ? this.projectNumber : null;
        this.region = typeof this.region === 'string' ? this.region : null;
        this.videoStitcherSessionOptions = isRecord(this.videoStitcherSessionOptions)
            ? this.videoStitcherSessionOptions
            : null;
        this.vodConfigId = typeof this.vodConfigId === 'string' ? this.vodConfigId : '';
    } as unknown as VideoStitcherVodStreamRequestConstructor;
    Object.setPrototypeOf(VideoStitcherVodStreamRequest.prototype, StreamRequest.prototype);

    /**
     * Creates a VOD stream request instance.
     *
     * @param vodStreamRequest - Optional initial values for the VOD request fields.
     */
    const VODStreamRequest = function (
        this: VODStreamRequestInstance,
        vodStreamRequest?: StreamRequestInput,
    ) {
        initializeStreamRequest(this, vodStreamRequest);
        this.contentSourceId = typeof this.contentSourceId === 'string' ? this.contentSourceId : '';
        this.videoId = typeof this.videoId === 'string' ? this.videoId : '';
    } as unknown as VODStreamRequestConstructor;
    Object.setPrototypeOf(VODStreamRequest.prototype, StreamRequest.prototype);

    /**
     * Creates stream data from defaults and optional overrides.
     *
     * @param streamData - Optional overrides applied on top of the defaults.
     */
    const StreamData = function (this: StreamDataInstance, streamData?: PlainRecord | null) {
        this.adPeriodData = null;
        this.adProgressData = null;
        this.cuepoints = [];
        this.errorMessage = null;
        this.manifestFormat = 'HLS';
        this.streamId = null;
        this.subtitles = [];
        this.url = '';

        if (isRecord(streamData)) {
            Object.assign(this, streamData);
        }
    } as unknown as StreamDataConstructor;

    /**
     * Creates a stream event instance.
     *
     * @param type - The event type identifier.
     * @param streamData - Optional stream data associated with the event.
     * @param ad - Optional ad metadata associated with the event.
     */
    const StreamEvent = function (
        this: StreamEventInstance,
        type: string,
        streamData?: StreamDataInstance,
        ad?: PlainRecord | null,
    ) {
        this.type = type;
        this.streamData = streamData || new StreamData();
        this.ad = ad || null;
    } as unknown as StreamEventConstructor;
    StreamEvent.Type = streamEventTypes;
    /**
     * Returns the ad associated with this stream event.
     */
    StreamEvent.prototype.getAd = function (this: StreamEventInstance): PlainRecord | null {
        return this.ad;
    };
    /**
     * Returns the stream data associated with this stream event.
     */
    StreamEvent.prototype.getStreamData = function (this: StreamEventInstance): StreamDataInstance {
        return this.streamData;
    };

    /**
     * Creates a UI settings container.
     */
    const UiSettings = function (this: UiSettingsInstance) {
        this.locale = '';
    } as unknown as UiSettingsConstructor;
    /**
     * Returns the configured locale.
     */
    UiSettings.prototype.getLocale = function (this: UiSettingsInstance): string {
        return this.locale;
    };
    /**
     * Stores the locale used by the mock UI settings.
     *
     * @param locale - The locale string to store.
     */
    UiSettings.prototype.setLocale = function (this: UiSettingsInstance, locale: string): void {
        this.locale = locale;
    };

    const daiSdkFeatureFlagsStorage = new WeakMap<DaiSdkSettingsInstance, PlainRecord>();
    /**
     * Returns the stored DAI SDK feature flags for a settings instance.
     *
     * Creates and stores an empty feature flag record when the instance does not have one yet.
     *
     * @param instance - The DAI settings instance whose feature flags should be returned.
     */
    const getStoredDaiSdkFeatureFlags = (instance: DaiSdkSettingsInstance): PlainRecord => {
        const storedFeatureFlags = daiSdkFeatureFlagsStorage.get(instance);
        if (storedFeatureFlags) {
            return storedFeatureFlags;
        }

        const nextFeatureFlags = {};
        daiSdkFeatureFlagsStorage.set(instance, nextFeatureFlags);

        return nextFeatureFlags;
    };

    /**
     * Creates a DAI settings container.
     */
    const DaiSdkSettingsContainer = function (this: DaiSdkSettingsInstance) {
        daiSdkFeatureFlagsStorage.set(this, {});
    } as unknown as DaiSdkSettingsConstructor;
    /**
     * Returns the configured feature flags.
     */
    DaiSdkSettingsContainer.prototype.getFeatureFlags = function (this: DaiSdkSettingsInstance): PlainRecord {
        return getStoredDaiSdkFeatureFlags(this);
    };
    /**
     * Stores a cloned copy of the configured feature flags.
     *
     * @param featureFlags - The feature flags to store.
     */
    DaiSdkSettingsContainer.prototype.setFeatureFlags = function (
        this: DaiSdkSettingsInstance,
        featureFlags: PlainRecord,
    ): void {
        daiSdkFeatureFlagsStorage.set(this, Object.assign({}, featureFlags));
    };

    /**
     * Normalizes arbitrary input into a supported stream request instance.
     *
     * @param streamRequest - The raw input to normalize.
     */
    const normalizeStreamRequest = (streamRequest?: StreamRequestInput): StreamRequestInstance => {
        if (streamRequest instanceof StreamRequest) {
            return streamRequest;
        }

        if (isRecord(streamRequest)) {
            if (typeof streamRequest.liveStreamEventId === 'string') {
                return new VideoStitcherLiveStreamRequest(streamRequest);
            }

            if (
                typeof streamRequest.contentSourceUrl === 'string'
                || typeof streamRequest.vodConfigId === 'string'
                || typeof streamRequest.adTagUrl === 'string'
            ) {
                return new VideoStitcherVodStreamRequest(streamRequest);
            }

            if (typeof streamRequest.customAssetKey === 'string') {
                return new PodStreamRequest(streamRequest);
            }

            if (typeof streamRequest.assetKey === 'string') {
                return new LiveStreamRequest(streamRequest);
            }

            if (
                typeof streamRequest.contentSourceId === 'string'
                || typeof streamRequest.videoId === 'string'
            ) {
                return new VODStreamRequest(streamRequest);
            }
        }

        return new StreamRequest();
    };

    /**
     * Returns whether a request contains live stream identifiers.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasLiveIdentifiers = (streamRequest: StreamRequestInstance): streamRequest is LiveStreamRequestInstance => {
        const liveStreamRequest = streamRequest as LiveStreamRequestInstance;

        return typeof liveStreamRequest.assetKey === 'string'
            && liveStreamRequest.assetKey.length > 0;
    };

    /**
     * Returns whether a request contains Video Stitcher live stream identifiers.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasVideoStitcherLiveIdentifiers = (
        streamRequest: StreamRequestInstance,
    ): streamRequest is VideoStitcherLiveStreamRequestInstance => {
        const videoStitcherLiveStreamRequest = streamRequest as VideoStitcherLiveStreamRequestInstance;

        return typeof videoStitcherLiveStreamRequest.liveStreamEventId === 'string'
            && videoStitcherLiveStreamRequest.liveStreamEventId.length > 0;
    };

    /**
     * Returns whether a request contains pod-serving live stream identifiers.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasPodIdentifiers = (streamRequest: StreamRequestInstance): streamRequest is PodStreamRequestInstance => {
        const podStreamRequest = streamRequest as PodStreamRequestInstance;

        return typeof podStreamRequest.networkCode === 'string'
            && podStreamRequest.networkCode.length > 0
            && typeof podStreamRequest.customAssetKey === 'string'
            && podStreamRequest.customAssetKey.length > 0;
    };

    /**
     * Returns whether a request contains Video Stitcher VOD identifiers.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasVideoStitcherVodIdentifiers = (
        streamRequest: StreamRequestInstance,
    ): streamRequest is VideoStitcherVodStreamRequestInstance => {
        const videoStitcherVodStreamRequest = streamRequest as VideoStitcherVodStreamRequestInstance;
        const hasContentSourceUrl = typeof videoStitcherVodStreamRequest.contentSourceUrl === 'string'
            && videoStitcherVodStreamRequest.contentSourceUrl.length > 0;
        const hasVodConfigId = typeof videoStitcherVodStreamRequest.vodConfigId === 'string'
            && videoStitcherVodStreamRequest.vodConfigId.length > 0;

        return hasContentSourceUrl || hasVodConfigId;
    };

    /**
     * Returns whether a request contains VOD stream identifiers.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasVodIdentifiers = (streamRequest: StreamRequestInstance): streamRequest is VODStreamRequestInstance => {
        const vodStreamRequest = streamRequest as VODStreamRequestInstance;

        return typeof vodStreamRequest.contentSourceId === 'string'
            && vodStreamRequest.contentSourceId.length > 0
            && typeof vodStreamRequest.videoId === 'string'
            && vodStreamRequest.videoId.length > 0;
    };

    /**
     * Returns whether a request contains enough identifiers for a live or VOD stream.
     *
     * @param streamRequest - The stream request to inspect.
     */
    const hasIdentifiers = (streamRequest: StreamRequestInstance): boolean => {
        return hasLiveIdentifiers(streamRequest)
            || hasPodIdentifiers(streamRequest)
            || hasVideoStitcherLiveIdentifiers(streamRequest)
            || hasVideoStitcherVodIdentifiers(streamRequest)
            || hasVodIdentifiers(streamRequest);
    };

    /**
     * Returns a fallback stream id when the DAI response does not provide one.
     *
     * @param streamRequest - The stream request used to derive the fallback id.
     */
    const getFallbackStreamId = (streamRequest: StreamRequestInstance): string => {
        const liveStreamRequest = streamRequest as LiveStreamRequestInstance;
        const videoStitcherLiveStreamRequest = streamRequest as VideoStitcherLiveStreamRequestInstance;
        const videoStitcherVodStreamRequest = streamRequest as VideoStitcherVodStreamRequestInstance;
        const vodStreamRequest = streamRequest as VODStreamRequestInstance;

        if (
            typeof videoStitcherVodStreamRequest.vodConfigId === 'string'
            && videoStitcherVodStreamRequest.vodConfigId.length > 0
        ) {
            return `mock-video-stitcher-vod-${videoStitcherVodStreamRequest.vodConfigId}`;
        }

        if (
            typeof videoStitcherVodStreamRequest.contentSourceUrl === 'string'
            && videoStitcherVodStreamRequest.contentSourceUrl.length > 0
        ) {
            return 'mock-video-stitcher-vod';
        }

        if (
            typeof videoStitcherLiveStreamRequest.liveStreamEventId === 'string'
            && videoStitcherLiveStreamRequest.liveStreamEventId.length > 0
        ) {
            return `mock-video-stitcher-live-${videoStitcherLiveStreamRequest.liveStreamEventId}`;
        }

        if (typeof liveStreamRequest.assetKey === 'string' && liveStreamRequest.assetKey.length > 0) {
            return `mock-live-${liveStreamRequest.assetKey}`;
        }

        if (typeof vodStreamRequest.videoId === 'string' && vodStreamRequest.videoId.length > 0) {
            return `mock-vod-${vodStreamRequest.videoId}`;
        }

        return 'mock-stream';
    };

    /**
     * Returns the default manifest format for a request.
     *
     * @param streamRequest - The stream request whose format field is inspected.
     */
    const getDefaultManifestFormat = (streamRequest: StreamRequestInstance): string => {
        return typeof streamRequest.format === 'string' && streamRequest.format.toLowerCase() === 'dash'
            ? 'DASH'
            : 'HLS';
    };

    /**
     * Creates stream data for mock event dispatch.
     *
     * @param streamRequest - The stream request used to derive defaults.
     * @param cuepoints - The list of cue points to include.
     * @param errorMessage - An error message, or `null` when no error occurred.
     * @param streamDataOverrides - Optional overrides applied on top of the defaults.
     */
    const createStreamData = (
        streamRequest: StreamRequestInstance,
        cuepoints: PlainRecord[],
        errorMessage: string | null,
        streamDataOverrides?: PlainRecord | null,
    ): StreamDataInstance => {
        const streamData = new StreamData({
            cuepoints: cuepoints.slice(),
            errorMessage,
            manifestFormat: getDefaultManifestFormat(streamRequest),
            streamId: getFallbackStreamId(streamRequest),
            url: '',
        });

        if (isRecord(streamDataOverrides)) {
            Object.assign(streamData, streamDataOverrides);
        }

        return streamData;
    };

    /**
     * Appends the fixed DAI query parameter names used by the real `ima3_dai.js` loader.
     *
     * The upstream loader hardcodes `api-key`, `auth-token`, and `dai-sam-id`, so the mock uses the same
     * literal keys when it serializes the supported request fields.
     *
     * @param requestUrl - The URL to append query parameters to.
     * @param streamRequest - The stream request containing the parameters to append.
     */
    const appendRequestParameters = (
        requestUrl: URL,
        streamRequest: StreamRequestInstance,
    ): void => {
        const parameterNames = Object.keys(streamRequest.adTagParameters);

        for (let parameterIndex = 0; parameterIndex < parameterNames.length; parameterIndex += 1) {
            const parameterName = parameterNames[parameterIndex];
            requestUrl.searchParams.set(parameterName, streamRequest.adTagParameters[parameterName]);
        }

        if (streamRequest.apiKey) {
            requestUrl.searchParams.set('api-key', streamRequest.apiKey);
        }
        if (streamRequest.authToken) {
            requestUrl.searchParams.set('auth-token', streamRequest.authToken);
        }
        if (streamRequest.streamActivityMonitorId) {
            requestUrl.searchParams.set('dai-sam-id', streamRequest.streamActivityMonitorId);
        }
    };

    /**
     * Builds the live DAI request URL.
     *
     * The real `ima3_dai.js` loader hardcodes the live path template as `/ssai/event/{assetKey}/streams`.
     * This helper reproduces that literal path and only varies the host so `getStreamRequestUrls()` can try
     * the primary and fallback endpoints with the same request shape.
     *
     * @param streamRequest - The live stream request containing the asset key.
     * @param hostName - The base host URL to use.
     */
    const buildLiveRequestUrl = (
        streamRequest: LiveStreamRequestInstance,
        hostName: string,
    ): string => {
        const requestUrl = new URL(`${hostName}/ssai/event/${streamRequest.assetKey}/streams`);

        appendRequestParameters(requestUrl, streamRequest);

        return requestUrl.toString();
    };

    /**
     * Builds the pod-serving live registration URL.
     *
     * The real `ima3_dai.js` loader hardcodes `/ssai/pods/api/v1/network/{networkCode}/custom_asset`
     * `/{customAssetKey}/stream` and appends the fixed `manifest-type` query parameter for pod requests.
     *
     * @param streamRequest - The pod stream request containing the network code and custom asset key.
     * @param hostName - The base host URL to use.
     */
    const buildPodRequestUrl = (
        streamRequest: PodStreamRequestInstance,
        hostName: string,
    ): string => {
        const requestUrl = new URL(
            `${hostName}/ssai/pods/api/v1/network/${streamRequest.networkCode}`
            + `/custom_asset/${streamRequest.customAssetKey}/stream`,
        );
        const manifestType = streamRequest.format.toLowerCase() === 'dash' ? 'dash' : 'hls';

        appendRequestParameters(requestUrl, streamRequest);
        requestUrl.searchParams.set('manifest-type', manifestType);

        return requestUrl.toString();
    };

    /**
     * Builds the VOD DAI request URL.
     *
     * The real `ima3_dai.js` loader hardcodes separate `/ondemand/hls/content/...` and
     * `/ondemand/dash/content/...` prefixes. This helper mirrors that by choosing the literal `hls` or `dash`
     * path segment first and then appending `/vid/{videoId}/streams`.
     *
     * @param streamRequest - The VOD stream request containing the content source and video identifiers.
     * @param hostName - The base host URL to use.
     */
    const buildVodRequestUrl = (
        streamRequest: VODStreamRequestInstance,
        hostName: string,
    ): string => {
        const requestFormat = streamRequest.format.toLowerCase() === 'dash' ? 'dash' : 'hls';
        const requestUrl = new URL(
            `${hostName}/ondemand/${requestFormat}/content/${streamRequest.contentSourceId}`
            + `/vid/${streamRequest.videoId}/streams`,
        );

        appendRequestParameters(requestUrl, streamRequest);

        return requestUrl.toString();
    };

    /**
     * Mirrors the host selection hardcoded by the real `ima3_dai.js` loader: stream initialization is
     * attempted against `https://dai.google.com` first and then retried against
     * `https://pubads.g.doubleclick.net` when the primary POST fails.
     *
     * The request path itself is assembled by the request builders. Each builder mirrors the corresponding
     * hardcoded upstream path template, combines it with the selected host, and then
     * `appendRequestParameters()` adds the query string parameters from the stream request.
     */
    const MAIN_HOST_NAME = 'https://dai.google.com';
    const FALLBACK_HOST_NAME = 'https://pubads.g.doubleclick.net';
    /**
     * Returns the primary and fallback DAI request URLs for a stream request.
     *
     * @param streamRequest - The stream request to build URLs for.
     */
    const getStreamRequestUrls = (streamRequest: StreamRequestInstance): string[] => {
        if (hasPodIdentifiers(streamRequest)) {
            return [
                buildPodRequestUrl(streamRequest, MAIN_HOST_NAME),
                buildPodRequestUrl(streamRequest, FALLBACK_HOST_NAME),
            ];
        }

        if (hasLiveIdentifiers(streamRequest)) {
            return [
                buildLiveRequestUrl(streamRequest, MAIN_HOST_NAME),
                buildLiveRequestUrl(streamRequest, FALLBACK_HOST_NAME),
            ];
        }

        if (hasVodIdentifiers(streamRequest)) {
            return [
                buildVodRequestUrl(streamRequest, MAIN_HOST_NAME),
                buildVodRequestUrl(streamRequest, FALLBACK_HOST_NAME),
            ];
        }

        return [];
    };

    /**
     * Validates a fetch response and normalizes its JSON payload.
     *
     * @param response - The raw fetch response to validate and parse.
     */
    const readFetchResponseData = async (response: unknown): Promise<PlainRecord> => {
        const typedResponse = response as FetchResponseLike;

        if (typedResponse && typedResponse.ok === false) {
            throw new Error(`Stream initialization failed with status ${String(typedResponse.status || 0)}`);
        }

        if (typedResponse && typeof typedResponse.json === 'function') {
            const jsonResponse = await typedResponse.json();

            return isRecord(jsonResponse) ? jsonResponse : {};
        }

        return isRecord(response) ? response : {};
    };

    /**
     * Extracts an error message from a DAI response payload.
     *
     * @param responseData - The parsed DAI response payload.
     */
    const getResponseErrorMessage = (responseData: PlainRecord): string | null => {
        return getStringValue(responseData.errorMessage) || getStringValue(responseData.error_message);
    };

    /**
     * Creates stream data from a normalized DAI response payload.
     *
     * @param streamRequest - The original stream request.
     * @param cuepoints - The list of cue points to include.
     * @param responseData - The parsed DAI response payload.
     */
    const createStreamDataFromResponse = (
        streamRequest: StreamRequestInstance,
        cuepoints: PlainRecord[],
        responseData: PlainRecord,
    ): StreamDataInstance => {
        const podManifestUrl = getStringValue(responseData.pod_manifest_url)
            || getStringValue(responseData.podManifestUrl)
            || '';

        const responseStreamId = getStringValue(responseData.stream_id) || getStringValue(responseData.streamId);

        const streamUrl = getStringValue(responseData.stream_manifest)
            || getStringValue(responseData.streamUrl)
            || podManifestUrl
            || '';

        const responseErrorMessage = getResponseErrorMessage(responseData);

        const hasInitializedStream = streamUrl.length > 0 || (responseStreamId !== null && responseStreamId.length > 0);

        const errorMessage = responseErrorMessage
            || (hasInitializedStream ? null : 'Stream initialization response missing stream URL');

        const manifestFormat = getStringValue(responseData.manifest_format)
            || getStringValue(responseData.manifestFormat)
            || getDefaultManifestFormat(streamRequest);

        const streamId = responseStreamId
            || getFallbackStreamId(streamRequest);

        const subtitles = Array.isArray(responseData.subtitles) ? responseData.subtitles : [];

        return createStreamData(streamRequest, cuepoints, errorMessage, {
            manifestFormat,
            podManifestUrl,
            pod_manifest_url: podManifestUrl,
            streamId,
            subtitles,
            url: streamUrl,
        });
    };

    /**
     * Converts an unknown error into a user-facing stream initialization message.
     *
     * @param error - The caught error value.
     */
    const getErrorMessage = (error: unknown): string => {
        if (isRecord(error) && typeof error.message === 'string' && error.message.length > 0) {
            return error.message;
        }

        return 'Stream initialization failed';
    };

    /**
     * Hides the ad UI element when content playback starts.
     *
     * @param streamManager - The stream manager owning the ad UI element.
     */
    const hideAdUiElement = (streamManager: StreamManagerInstance): void => {
        if (!streamManager.adUiElement) {
            return;
        }

        streamManager.adUiElement.style.display = 'none';
    };

    /**
     * Enables video controls when content playback starts.
     *
     * @param streamManager - The stream manager owning the video element.
     */
    const showVideoControls = (streamManager: StreamManagerInstance): void => {
        if (!streamManager.videoElement || streamManager.videoElement.controls) {
            return;
        }

        streamManager.videoElement.controls = true;
    };

    /**
     * Applies the mock content-loaded UI state.
     *
     * @param streamManager - The stream manager to update.
     */
    const handleContentLoaded = (streamManager: StreamManagerInstance): void => {
        hideAdUiElement(streamManager);
        showVideoControls(streamManager);
    };

    /**
     * Returns whether an event type represents a successful stream initialization state.
     *
     * @param eventType - The event type string to check.
     */
    const isContentLoadedEventType = (eventType: string): boolean => {
        return eventType === StreamEvent.Type.LOADED || eventType === StreamEvent.Type.STREAM_INITIALIZED;
    };

    /**
     * Creates a mock stream manager instance.
     *
     * @param videoElement - The video element managed by this instance.
     * @param adUiElement - The ad UI overlay element.
     * @param uiSettings - Optional UI settings for the manager.
     */
    const StreamManager = function (
        this: StreamManagerInstance,
        videoElement?: HTMLVideoElement | null,
        adUiElement?: HTMLElement | null,
        uiSettings?: UiSettingsInstance | null,
    ) {
        initializeEventHandler(this);

        this.videoElement = videoElement || null;
        this.adUiElement = adUiElement || null;
        this.uiSettings = uiSettings || new UiSettings();
        this.clickElement = adUiElement || null;
        this.streamData = new StreamData();
        this.streamMonitor = {};
        this.streamRequest = null;
        this.cuepoints = [];
        this.lastMetadata = null;
        this.lastTimedMetadata = null;
    } as unknown as StreamManagerConstructor;
    Object.setPrototypeOf(StreamManager.prototype, EventHandler.prototype);
    /**
     * Maps stream time to content time for the mock player.
     *
     * @param streamTime - The stream time in seconds.
     */
    StreamManager.prototype.contentTimeForStreamTime = function (
        this: StreamManagerInstance,
        streamTime?: number,
    ): number {
        return typeof streamTime === 'number' ? streamTime : 0;
    } as unknown as StreamManagerInstance['contentTimeForStreamTime'];
    /**
     * Destroys the stream manager state.
     */
    StreamManager.prototype.destroy = function (this: StreamManagerInstance): void {
        this.reset();
    };
    /**
     * Focuses the current click element when possible.
     */
    StreamManager.prototype.focus = function (this: StreamManagerInstance): void {
        const clickElement = this.clickElement as HTMLElement | null;
        if (!clickElement || typeof clickElement.focus !== 'function') {
            return;
        }

        try {
            clickElement.focus();
        } catch (error) {
            logMessage(source, error);
        }
    };
    /**
     * Returns the ad skippable state used by the mock manager.
     */
    StreamManager.prototype.getAdSkippableState = function (): boolean {
        return true;
    };
    /**
     * Returns the last stream data stored by the manager.
     */
    StreamManager.prototype.getStreamData = function (this: StreamManagerInstance): StreamDataInstance {
        return this.streamData;
    };
    /**
     * Loads the current stream metadata and emits a LOADED event.
     */
    StreamManager.prototype.loadStreamMetadata = function (this: StreamManagerInstance): void {
        handleContentLoaded(this);
        this.dispatchEvent(new StreamEvent(StreamEvent.Type.LOADED as string, this.streamData));
    };
    /**
     * Stores the last timed metadata payload.
     *
     * @param metadata - The timed metadata payload to store.
     */
    StreamManager.prototype.onTimedMetadata = function (
        this: StreamManagerInstance,
        metadata: PlainRecord | null,
    ): void {
        this.lastTimedMetadata = metadata;
    };
    /**
     * Returns the latest cue point at or before a stream time.
     *
     * @param streamTime - The stream time in seconds.
     */
    StreamManager.prototype.previousCuePointForStreamTime = function (
        this: StreamManagerInstance,
        streamTime: number,
    ): PlainRecord | null {
        let previousCuePoint: PlainRecord | null = null;

        for (let cuepointIndex = 0; cuepointIndex < this.cuepoints.length; cuepointIndex += 1) {
            const cuepoint = this.cuepoints[cuepointIndex];
            if (typeof cuepoint.start !== 'number') {
                continue;
            }

            if (cuepoint.start <= streamTime) {
                previousCuePoint = cuepoint;
            }
        }

        return previousCuePoint;
    };
    /**
     * Stores metadata received from the player integration.
     *
     * @param type - The metadata type identifier.
     * @param data - The metadata payload.
     * @param timestamp - The playback timestamp of the metadata.
     */
    StreamManager.prototype.processMetadata = function (
        this: StreamManagerInstance,
        type: string,
        data: string | Uint8Array,
        timestamp: number,
    ): void {
        this.lastMetadata = {
            data,
            timestamp,
            type,
        };
    };
    /**
     * Replaces ad tag parameters on the active stream request.
     *
     * @param adTagParameters - The new ad tag parameters to set.
     */
    StreamManager.prototype.replaceAdTagParameters = function (
        this: StreamManagerInstance,
        adTagParameters: PlainRecord,
    ): void {
        if (!this.streamRequest) {
            this.streamRequest = new StreamRequest();
        }

        this.streamRequest.adTagParameters = toStringRecord(adTagParameters);
    };
    /**
     * Initializes a mock stream request and emits the resulting stream events.
     *
     * @param streamRequest - The stream request to initialize.
     */
    StreamManager.prototype.requestStream = function (
        this: StreamManagerInstance,
        streamRequest?: StreamRequestInput,
    ): void {
        const normalizedRequest = normalizeStreamRequest(streamRequest);
        this.streamRequest = normalizedRequest;

        /**
         * Stores stream data and dispatches the matching initialization events.
         *
         * @param eventType - The event type to dispatch.
         * @param streamData - The stream data associated with the event.
         */
        const dispatchStreamEvent = (eventType: string, streamData: StreamDataInstance): void => {
            this.streamData = streamData;

            if (isContentLoadedEventType(eventType)) {
                handleContentLoaded(this);
            }

            schedule(() => {
                this.dispatchEvent(new StreamEvent(
                    StreamEvent.Type.STREAM_INITIALIZED as string,
                    streamData,
                ));
                this.dispatchEvent(new StreamEvent(eventType, streamData));
            });
        };

        if (!hasIdentifiers(normalizedRequest)) {
            dispatchStreamEvent(
                StreamEvent.Type.ERROR as string,
                createStreamData(normalizedRequest, this.cuepoints, 'Missing stream request identifiers'),
            );
            return;
        }

        const requestUrls = getStreamRequestUrls(normalizedRequest);

        if (requestUrls.length > 0) {
            const activeRequest = normalizedRequest;
            /**
             * Mirrors the real DAI stream initialization flow by fetching the endpoint that provides
             * the resolved manifest URL, stream id, and API errors that sites often read back.
             *
             * @param requestIndex - The index of the request URL to try.
             */
            const fetchStreamData = async (requestIndex: number): Promise<void> => {
                try {
                    const fetchResponse = await fetch(requestUrls[requestIndex], {
                        method: 'POST',
                        credentials: 'include',
                    });
                    const responseData = await readFetchResponseData(fetchResponse);

                    if (this.streamRequest !== activeRequest) {
                        return;
                    }

                    const streamData = createStreamDataFromResponse(activeRequest, this.cuepoints, responseData);
                    const eventType = streamData.errorMessage
                        ? (StreamEvent.Type.ERROR as string)
                        : (StreamEvent.Type.LOADED as string);

                    dispatchStreamEvent(eventType, streamData);
                } catch (error) {
                    if (this.streamRequest !== activeRequest) {
                        return;
                    }

                    if (requestIndex + 1 < requestUrls.length) {
                        await fetchStreamData(requestIndex + 1);
                        return;
                    }

                    dispatchStreamEvent(
                        StreamEvent.Type.ERROR as string,
                        createStreamData(activeRequest, this.cuepoints, getErrorMessage(error)),
                    );
                }
            };

            fetchStreamData(0);
            return;
        }

        dispatchStreamEvent(
            StreamEvent.Type.LOADED as string,
            createStreamData(normalizedRequest, this.cuepoints, null),
        );
    };
    /**
     * Clears the current stream manager state.
     */
    StreamManager.prototype.reset = function (this: StreamManagerInstance): void {
        this.cuepoints = [];
        this.lastMetadata = null;
        this.lastTimedMetadata = null;
        this.streamData = new StreamData();
        this.streamRequest = null;
    };
    /**
     * Updates the click element when no dedicated ad UI element is present.
     *
     * @param clickElement - The element to use for click handling, or `null` to clear.
     */
    StreamManager.prototype.setClickElement = function (
        this: StreamManagerInstance,
        clickElement: Element | null,
    ): void {
        if (this.adUiElement) {
            return;
        }

        this.clickElement = clickElement;
    };
    /**
     * Maps content time to stream time for the mock player.
     *
     * @param contentTime - The content time in seconds.
     */
    StreamManager.prototype.streamTimeForContentTime = function (
        this: StreamManagerInstance,
        contentTime?: number,
    ): number {
        return typeof contentTime === 'number' ? contentTime : 0;
    } as unknown as StreamManagerInstance['streamTimeForContentTime'];

    const api: PlainRecord = {
        DaiSdkSettings: new DaiSdkSettingsContainer(),
        LiveStreamRequest,
        PodStreamRequest,
        StreamData,
        StreamEvent,
        StreamManager,
        StreamRequest,
        UiSettings,
        VideoStitcherLiveStreamRequest,
        VideoStitcherVodStreamRequest,
        VODStreamRequest,
    };
    const globalWindow = window as GoogleWindow;

    const googleNamespace = isRecord(globalWindow.google) ? globalWindow.google : {};
    if (!isRecord(globalWindow.google)) {
        globalWindow.google = googleNamespace;
    }

    const imaNamespace = isRecord(googleNamespace.ima) ? googleNamespace.ima : {};
    googleNamespace.ima = imaNamespace;

    const daiNamespace = isRecord(imaNamespace.dai) ? imaNamespace.dai : {};
    imaNamespace.dai = daiNamespace;

    const apiNamespace = isRecord(daiNamespace.api) ? daiNamespace.api : {};
    daiNamespace.api = apiNamespace;

    Object.assign(apiNamespace, api);

    hit(source);
}

export const GoogleIma3DaiNames = [
    'google-ima3-dai',
];

// eslint-disable-next-line prefer-destructuring
GoogleIma3Dai.primaryName = GoogleIma3DaiNames[0];

GoogleIma3Dai.injections = [
    hit,
    logMessage,
];
