/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'google-ima3-dai';

const changingProps = ['google'];
const nativeFetch = window.fetch;

const afterEach = () => {
    clearGlobalProps(...changingProps);
    window.fetch = nativeFetch;
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

test('Mocked - DAI namespace and main classes', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.google, 'window.google created');
    assert.ok(window.google.ima, 'window.google.ima created');
    assert.ok(window.google.ima.dai, 'window.google.ima.dai created');
    assert.ok(window.google.ima.dai.api, 'window.google.ima.dai.api created');

    const { api } = window.google.ima.dai;

    assert.strictEqual(typeof api.StreamManager, 'function', 'StreamManager is mocked');
    assert.strictEqual(typeof api.StreamRequest, 'function', 'StreamRequest is mocked');
    assert.strictEqual(typeof api.LiveStreamRequest, 'function', 'LiveStreamRequest is mocked');
    assert.strictEqual(typeof api.PodStreamRequest, 'function', 'PodStreamRequest is mocked');
    assert.strictEqual(typeof api.VODStreamRequest, 'function', 'VODStreamRequest is mocked');
    assert.strictEqual(
        typeof api.VideoStitcherLiveStreamRequest,
        'function',
        'VideoStitcherLiveStreamRequest is mocked',
    );
    assert.strictEqual(
        typeof api.VideoStitcherVodStreamRequest,
        'function',
        'VideoStitcherVodStreamRequest is mocked',
    );
    assert.strictEqual(typeof api.StreamEvent, 'function', 'StreamEvent is mocked');
    assert.strictEqual(typeof api.StreamData, 'function', 'StreamData is mocked');
    assert.strictEqual(typeof api.UiSettings, 'function', 'UiSettings is mocked');
    assert.strictEqual(typeof api.DaiSdkSettings, 'object', 'DaiSdkSettings singleton is mocked');
    assert.strictEqual(
        typeof api.DaiSdkSettings.getFeatureFlags,
        'function',
        'DaiSdkSettings getter is mocked',
    );
    assert.strictEqual(
        typeof api.DaiSdkSettings.setFeatureFlags,
        'function',
        'DaiSdkSettings setter is mocked',
    );
});

test('Mocked - existing IMA namespace is preserved', (assert) => {
    window.google = {
        ima: {
            existing: true,
            dai: {
                api: {
                    existingDaiApi: true,
                },
            },
        },
    };

    evalWrapper(redirects.getRedirect(name).content);

    assert.strictEqual(window.google.ima.existing, true, 'existing google.ima properties are preserved');
    assert.strictEqual(window.google.ima.dai.api.existingDaiApi, true, 'existing DAI API properties are preserved');
    assert.strictEqual(
        typeof window.google.ima.dai.api.StreamManager,
        'function',
        'mocked API is merged into DAI namespace',
    );
});

test('Mocked - request classes and settings', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const liveStreamRequest = new api.LiveStreamRequest({
        adTagParameters: {
            platform: 'web',
            retry: 1,
        },
        assetKey: 'asset-key',
        networkCode: '12345',
    });
    const podStreamRequest = new api.PodStreamRequest({
        customAssetKey: 'custom-asset-key',
    });
    const vodStreamRequest = new api.VODStreamRequest({
        contentSourceId: 'cms-id',
        format: 'dash',
        videoId: 'video-id',
    });
    const videoStitcherLiveStreamRequest = new api.VideoStitcherLiveStreamRequest({
        customAssetKey: 'custom-asset-key',
        liveStreamEventId: 'live-event-id',
        networkCode: '12345',
        oAuthToken: 'oauth-token',
        projectNumber: 'project-number',
        region: 'us-central1',
        videoStitcherSessionOptions: {
            adTracking: 'enabled',
        },
    });
    const videoStitcherVodStreamRequest = new api.VideoStitcherVodStreamRequest({
        adTagUrl: 'https://ads.example.test/tag',
        contentSourceUrl: 'https://content.example.test/manifest.m3u8',
        networkCode: '12345',
        oAuthToken: 'oauth-token',
        projectNumber: 'project-number',
        region: 'us-central1',
        videoStitcherSessionOptions: {
            adTracking: 'enabled',
        },
        vodConfigId: 'vod-config-id',
    });
    const uiSettings = new api.UiSettings();
    const daiSettings = api.DaiSdkSettings;

    uiSettings.setLocale('en');
    daiSettings.setFeatureFlags({
        testFlag: true,
    });

    assert.strictEqual(liveStreamRequest.assetKey, 'asset-key', 'LiveStreamRequest stores assetKey');
    assert.strictEqual(liveStreamRequest.networkCode, '12345', 'LiveStreamRequest stores networkCode');
    assert.strictEqual(liveStreamRequest.adTagParameters.retry, '1', 'LiveStreamRequest stringifies ad tag parameters');
    assert.strictEqual(podStreamRequest.customAssetKey, 'custom-asset-key', 'PodStreamRequest stores customAssetKey');
    assert.strictEqual(vodStreamRequest.contentSourceId, 'cms-id', 'VODStreamRequest stores contentSourceId');
    assert.strictEqual(vodStreamRequest.videoId, 'video-id', 'VODStreamRequest stores videoId');
    assert.strictEqual(vodStreamRequest.format, 'dash', 'VODStreamRequest stores requested format');
    assert.ok(
        videoStitcherLiveStreamRequest instanceof api.PodStreamRequest,
        'VideoStitcherLiveStreamRequest inherits PodStreamRequest',
    );
    assert.strictEqual(
        videoStitcherLiveStreamRequest.customAssetKey,
        'custom-asset-key',
        'VideoStitcherLiveStreamRequest stores customAssetKey',
    );
    assert.strictEqual(
        videoStitcherLiveStreamRequest.liveStreamEventId,
        'live-event-id',
        'VideoStitcherLiveStreamRequest stores liveStreamEventId',
    );
    assert.strictEqual(
        videoStitcherLiveStreamRequest.oAuthToken,
        'oauth-token',
        'VideoStitcherLiveStreamRequest stores oAuthToken',
    );
    assert.strictEqual(
        videoStitcherLiveStreamRequest.projectNumber,
        'project-number',
        'VideoStitcherLiveStreamRequest stores projectNumber',
    );
    assert.strictEqual(
        videoStitcherLiveStreamRequest.region,
        'us-central1',
        'VideoStitcherLiveStreamRequest stores region',
    );
    assert.deepEqual(
        videoStitcherLiveStreamRequest.videoStitcherSessionOptions,
        { adTracking: 'enabled' },
        'VideoStitcherLiveStreamRequest stores session options',
    );
    assert.ok(
        videoStitcherVodStreamRequest instanceof api.StreamRequest,
        'VideoStitcherVodStreamRequest inherits StreamRequest',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.adTagUrl,
        'https://ads.example.test/tag',
        'VideoStitcherVodStreamRequest stores adTagUrl',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.contentSourceUrl,
        'https://content.example.test/manifest.m3u8',
        'VideoStitcherVodStreamRequest stores contentSourceUrl',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.vodConfigId,
        'vod-config-id',
        'VideoStitcherVodStreamRequest stores vodConfigId',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.oAuthToken,
        'oauth-token',
        'VideoStitcherVodStreamRequest stores oAuthToken',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.projectNumber,
        'project-number',
        'VideoStitcherVodStreamRequest stores projectNumber',
    );
    assert.strictEqual(
        videoStitcherVodStreamRequest.region,
        'us-central1',
        'VideoStitcherVodStreamRequest stores region',
    );
    assert.deepEqual(
        videoStitcherVodStreamRequest.videoStitcherSessionOptions,
        { adTracking: 'enabled' },
        'VideoStitcherVodStreamRequest stores session options',
    );
    assert.strictEqual(uiSettings.getLocale(), 'en', 'UiSettings locale is stored');
    assert.deepEqual(daiSettings.getFeatureFlags(), { testFlag: true }, 'DaiSdkSettings stores feature flags');
    assert.deepEqual(
        api.StreamRequest.StreamFormat,
        {
            DASH: 'dash',
            HLS: 'hls',
        },
        'StreamRequest exposes the StreamFormat enum',
    );
});

test('Mocked - invalid runtime inputs do not get copied into requests or stream data', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamRequest = new api.StreamRequest('invalid-runtime-value');
    const streamData = new api.StreamData('invalid-runtime-value');

    assert.deepEqual(streamRequest.adTagParameters, {}, 'StreamRequest ignores string runtime input');
    assert.strictEqual(streamRequest.format, 'hls', 'StreamRequest keeps defaults for string runtime input');
    assert.deepEqual(streamData.cuepoints, [], 'StreamData ignores string runtime input');
    assert.strictEqual(streamData.url, '', 'StreamData keeps defaults for string runtime input');
});

test('Mocked - Video Stitcher live requests are accepted by StreamManager', (assert) => {
    const done = assert.async();
    const expectedRequestUrl = 'https://dai.google.com/ssai/pods/api/v1/network/12345/custom_asset/custom-asset-key/stream?manifest-type=hls';
    const responseStreamId = 'video-stitcher-live-stream-id';
    const responsePodManifestUrl = 'https://pods.example.test/video-stitcher-live.m3u8';

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    let requestUrl;
    let requestOptions;

    window.fetch = async (url, options) => {
        requestUrl = url;
        requestOptions = options;

        return {
            json: async () => ({
                manifest_format: 'HLS',
                pod_manifest_url: responsePodManifestUrl,
                stream_id: responseStreamId,
            }),
            ok: true,
            status: 200,
        };
    };

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.ok(
            streamManager.streamRequest instanceof api.VideoStitcherLiveStreamRequest,
            'StreamManager keeps VideoStitcherLiveStreamRequest instances',
        );
        assert.strictEqual(
            streamManager.streamRequest.liveStreamEventId,
            'live-event-id',
            'StreamManager stores the live stream event id',
        );
        assert.strictEqual(
            requestUrl,
            expectedRequestUrl,
            'Video Stitcher live requests use the pod registration endpoint',
        );
        assert.strictEqual(requestOptions.method, 'POST', 'Video Stitcher live registration uses POST');
        assert.strictEqual(
            requestOptions.credentials,
            'include',
            'Video Stitcher live registration keeps credentials',
        );
        assert.strictEqual(streamData.errorMessage, null, 'Video Stitcher live requests do not produce an error');
        assert.strictEqual(
            streamData.streamId,
            responseStreamId,
            'Video Stitcher live requests expose the stream id returned by registration',
        );
        assert.strictEqual(
            streamData.url,
            responsePodManifestUrl,
            'Video Stitcher live requests expose the returned pod manifest URL',
        );
        done();
    });

    streamManager.requestStream(new api.VideoStitcherLiveStreamRequest({
        customAssetKey: 'custom-asset-key',
        liveStreamEventId: 'live-event-id',
        networkCode: '12345',
    }));
});

test('Mocked - Video Stitcher VOD requests are accepted by StreamManager', (assert) => {
    const done = assert.async();

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.ok(
            streamManager.streamRequest instanceof api.VideoStitcherVodStreamRequest,
            'StreamManager keeps VideoStitcherVodStreamRequest instances',
        );
        assert.strictEqual(
            streamManager.streamRequest.vodConfigId,
            'vod-config-id',
            'StreamManager stores the VOD config id',
        );
        assert.strictEqual(streamData.errorMessage, null, 'Video Stitcher VOD requests do not produce an error');
        assert.strictEqual(
            streamData.streamId,
            'mock-video-stitcher-vod-vod-config-id',
            'Video Stitcher VOD requests use a deterministic fallback stream id',
        );
        done();
    });

    streamManager.requestStream(new api.VideoStitcherVodStreamRequest({
        contentSourceUrl: 'https://content.example.test/manifest.m3u8',
        networkCode: '12345',
        vodConfigId: 'vod-config-id',
    }));
});

test('Mocked - PodStreamRequest stream id comes from registration response', (assert) => {
    const done = assert.async(2);
    const expectedRequestUrl = 'https://dai.google.com/ssai/pods/api/v1/network/12345/custom_asset/custom-asset-key/stream?manifest-type=hls';
    const responseStreamId = 'registered-stream-id';
    const responsePodManifestUrl = 'https://pods.example.test/pod-manifest.m3u8';

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    let requestUrl;
    let requestOptions;

    window.fetch = async (url, options) => {
        requestUrl = url;
        requestOptions = options;

        return {
            json: async () => ({
                manifest_format: 'HLS',
                pod_manifest_url: responsePodManifestUrl,
                stream_id: responseStreamId,
            }),
            ok: true,
            status: 200,
        };
    };

    streamManager.addEventListener(api.StreamEvent.Type.STREAM_INITIALIZED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(requestUrl, expectedRequestUrl, 'PodStreamRequest uses the pod registration endpoint');
        assert.strictEqual(requestOptions.method, 'POST', 'pod registration uses POST');
        assert.strictEqual(requestOptions.credentials, 'include', 'pod registration keeps credentials');
        assert.strictEqual(
            streamData.streamId,
            responseStreamId,
            'STREAM_INITIALIZED exposes the stream id returned by the registration response',
        );
        assert.strictEqual(streamData.errorMessage, null, 'pod registration does not report an error');
        done();
    });

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(streamData.streamId, responseStreamId, 'LOADED keeps the registered stream id');
        assert.strictEqual(streamData.url, responsePodManifestUrl, 'pod manifest URL is kept as the stream URL');
        assert.strictEqual(
            streamData.podManifestUrl,
            responsePodManifestUrl,
            'pod manifest URL is exposed on the stream data payload',
        );
        done();
    });

    streamManager.requestStream(new api.PodStreamRequest({
        customAssetKey: 'custom-asset-key',
        networkCode: '12345',
    }));
});

test('Mocked - DaiSdkSettings exposes the feature flag singleton', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const featureFlags = {
        enableSnapback: true,
        useCustomUi: false,
    };

    api.DaiSdkSettings.setFeatureFlags(featureFlags);
    featureFlags.enableSnapback = false;

    assert.deepEqual(
        api.DaiSdkSettings.getFeatureFlags(),
        {
            enableSnapback: true,
            useCustomUi: false,
        },
        'DaiSdkSettings accepts plain objects and copies feature flags',
    );
});

test('Mocked - StreamManager emits LOADED event for valid request', (assert) => {
    const done = assert.async(2);
    const expectedRequestUrl = 'https://dai.google.com/ssai/event/live-asset/streams';
    const responseStreamUrl = 'https://stream.example.test/live.mpd';

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const videoElement = document.createElement('video');
    videoElement.controls = false;
    const adUiElement = document.createElement('div');
    adUiElement.style.display = 'block';
    const uiSettings = new api.UiSettings();
    const streamManager = new api.StreamManager(videoElement, adUiElement, uiSettings);
    let requestUrl;
    let requestOptions;

    uiSettings.setLocale('en');

    window.fetch = async (url, options) => {
        requestUrl = url;
        requestOptions = options;

        return {
            json: async () => ({
                manifest_format: 'DASH',
                stream_id: 'live-stream-id',
                stream_manifest: responseStreamUrl,
            }),
            ok: true,
            status: 200,
        };
    };

    streamManager.addEventListener(api.StreamEvent.Type.STREAM_INITIALIZED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(
            streamEvent.type,
            api.StreamEvent.Type.STREAM_INITIALIZED,
            'STREAM_INITIALIZED event type is dispatched',
        );
        assert.strictEqual(streamData.streamId, 'live-stream-id', 'STREAM_INITIALIZED exposes the response stream id');
        assert.strictEqual(adUiElement.style.display, 'none', 'adUiElement is hidden when the stream initializes');
        assert.strictEqual(videoElement.controls, true, 'video controls are shown when the stream initializes');
        done();
    });

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(streamEvent.type, api.StreamEvent.Type.LOADED, 'LOADED event type is dispatched');
        assert.strictEqual(requestUrl, expectedRequestUrl, 'live request URL matches the DAI event endpoint');
        assert.strictEqual(requestOptions.method, 'POST', 'live request uses POST');
        assert.strictEqual(requestOptions.credentials, 'include', 'live request keeps credentials');
        assert.strictEqual(streamData.streamId, 'live-stream-id', 'streamData.streamId comes from response');
        assert.strictEqual(streamData.url, responseStreamUrl, 'streamData.url comes from stream_manifest');
        assert.strictEqual(streamData.manifestFormat, 'DASH', 'manifest format comes from response');
        assert.strictEqual(streamData.errorMessage, null, 'no error is reported for valid requests');
        assert.strictEqual(streamManager.clickElement, adUiElement, 'clickElement defaults to the ad UI element');
        assert.strictEqual(adUiElement.style.display, 'none', 'adUiElement is hidden when content is loaded');
        assert.strictEqual(videoElement.controls, true, 'video controls are shown when content is loaded');
        assert.strictEqual(streamManager.uiSettings.getLocale(), 'en', 'StreamManager keeps the provided UI settings');
        done();
    });

    streamManager.requestStream(new api.LiveStreamRequest({
        assetKey: 'live-asset',
        format: 'dash',
    }));
});

test('Mocked - StreamManager accepts event type arrays', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    const handledEventTypes = [];
    const onStreamEvent = (streamEvent) => {
        handledEventTypes.push(streamEvent.type);
    };

    streamManager.addEventListener(
        [
            api.StreamEvent.Type.LOADED,
            api.StreamEvent.Type.ERROR,
            api.StreamEvent.Type.AD_BREAK_STARTED,
            api.StreamEvent.Type.AD_BREAK_ENDED,
        ],
        onStreamEvent,
        false,
    );

    streamManager.dispatchEvent(new api.StreamEvent(api.StreamEvent.Type.AD_BREAK_STARTED));
    streamManager.dispatchEvent(new api.StreamEvent(api.StreamEvent.Type.AD_BREAK_ENDED));
    streamManager.dispatchEvent(new api.StreamEvent(api.StreamEvent.Type.STREAM_INITIALIZED));

    assert.deepEqual(
        handledEventTypes,
        [api.StreamEvent.Type.AD_BREAK_STARTED, api.StreamEvent.Type.AD_BREAK_ENDED],
        'array-based event registration subscribes the listener to each listed event type',
    );
});

test('Mocked - StreamManager keeps multiple listeners per event type without duplicate callbacks', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    const handledListeners = [];
    const onFirstLoaded = () => {
        handledListeners.push('first');
    };
    const onSecondLoaded = () => {
        handledListeners.push('second');
    };

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, onFirstLoaded);
    streamManager.addEventListener(api.StreamEvent.Type.LOADED, onSecondLoaded);
    streamManager.addEventListener(api.StreamEvent.Type.LOADED, onSecondLoaded);

    streamManager.dispatchEvent(new api.StreamEvent(api.StreamEvent.Type.LOADED));

    assert.deepEqual(
        handledListeners,
        ['first', 'second'],
        'one event type keeps multiple listeners and ignores duplicate callback registrations',
    );
});

test('Mocked - VOD request loads stream URL from response', (assert) => {
    const done = assert.async();
    const expectedRequestUrl = 'https://dai.google.com/ondemand/hls/content/2548831/vid/tears-of-steel/streams';
    const responseStreamUrl = 'https://stream.example.test/manifest.m3u8';

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    let requestUrl;
    let requestOptions;

    window.fetch = async (url, options) => {
        requestUrl = url;
        requestOptions = options;

        return {
            json: async () => ({
                manifest_format: 'HLS',
                stream_id: 'vod-stream-id',
                stream_manifest: responseStreamUrl,
            }),
            ok: true,
            status: 200,
        };
    };

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(requestUrl, expectedRequestUrl, 'VOD request URL matches the DAI endpoint');
        assert.strictEqual(requestOptions.method, 'POST', 'VOD request uses POST');
        assert.strictEqual(requestOptions.credentials, 'include', 'VOD request keeps credentials');
        assert.strictEqual(streamData.url, responseStreamUrl, 'streamData.url comes from stream_manifest');
        assert.strictEqual(streamData.streamId, 'vod-stream-id', 'streamData.streamId comes from response');
        assert.strictEqual(streamData.manifestFormat, 'HLS', 'streamData.manifestFormat comes from response');
        done();
    });

    streamManager.requestStream(new api.VODStreamRequest({
        contentSourceId: '2548831',
        videoId: 'tears-of-steel',
    }));
});

test('Mocked - VOD request falls back to pubads endpoint', (assert) => {
    const done = assert.async();
    const primaryRequestUrl = 'https://dai.google.com/ondemand/hls/content/2548831/vid/tears-of-steel/streams';
    const fallbackRequestUrl = 'https://pubads.g.doubleclick.net/ondemand/hls/content/2548831/vid/tears-of-steel/streams';
    const responseStreamUrl = 'https://stream.example.test/fallback.m3u8';

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const streamManager = new api.StreamManager(document.createElement('video'));
    const requestUrls = [];
    let requestOptions;

    window.fetch = async (url, options) => {
        requestUrls.push(url);
        requestOptions = options;

        if (requestUrls.length === 1) {
            return {
                json: async () => ({}),
                ok: false,
                status: 503,
            };
        }

        return {
            json: async () => ({
                manifest_format: 'HLS',
                stream_id: 'vod-fallback-stream-id',
                stream_manifest: responseStreamUrl,
            }),
            ok: true,
            status: 200,
        };
    };

    streamManager.addEventListener(api.StreamEvent.Type.LOADED, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.deepEqual(
            requestUrls,
            [primaryRequestUrl, fallbackRequestUrl],
            'VOD request retries against the pubads endpoint after primary failure',
        );
        assert.strictEqual(requestOptions.method, 'POST', 'fallback request uses POST');
        assert.strictEqual(requestOptions.credentials, 'include', 'fallback request keeps credentials');
        assert.strictEqual(streamData.url, responseStreamUrl, 'streamData.url comes from fallback response');
        assert.strictEqual(
            streamData.streamId,
            'vod-fallback-stream-id',
            'streamData.streamId comes from fallback response',
        );
        done();
    });

    streamManager.requestStream(new api.VODStreamRequest({
        contentSourceId: '2548831',
        videoId: 'tears-of-steel',
    }));
});

test('Mocked - StreamManager utility methods and error path', (assert) => {
    const done = assert.async();

    evalWrapper(redirects.getRedirect(name).content);

    const { api } = window.google.ima.dai;
    const videoElement = document.createElement('video');
    const clickElement = document.createElement('button');
    const streamManager = new api.StreamManager(videoElement);

    streamManager.processMetadata('ID3', 'metadata', 12);
    streamManager.onTimedMetadata({ TXXX: 'metadata' });
    streamManager.replaceAdTagParameters({
        platform: 'web',
        retry: 1,
    });
    streamManager.setClickElement(clickElement);

    assert.strictEqual(
        streamManager.streamRequest.adTagParameters.platform,
        'web',
        'replaceAdTagParameters stores string values',
    );
    assert.strictEqual(
        streamManager.streamRequest.adTagParameters.retry,
        '1',
        'replaceAdTagParameters stringifies values',
    );
    assert.strictEqual(streamManager.contentTimeForStreamTime(10), 10, 'contentTimeForStreamTime is mocked');
    assert.strictEqual(streamManager.streamTimeForContentTime(15), 15, 'streamTimeForContentTime is mocked');
    assert.strictEqual(streamManager.clickElement, clickElement, 'setClickElement updates click element without ad UI');

    streamManager.addEventListener(api.StreamEvent.Type.ERROR, (streamEvent) => {
        const streamData = streamEvent.getStreamData();

        assert.strictEqual(streamEvent.type, api.StreamEvent.Type.ERROR, 'ERROR event type is dispatched');
        assert.strictEqual(
            streamData.errorMessage,
            'Missing stream request identifiers',
            'invalid requests produce a mock error',
        );
        assert.strictEqual(
            streamManager.getStreamData().errorMessage,
            'Missing stream request identifiers',
            'StreamManager keeps the last stream data',
        );

        streamManager.reset();
        assert.strictEqual(streamManager.getStreamData().errorMessage, null, 'reset clears the last stream error');
        done();
    });

    streamManager.requestStream(new api.LiveStreamRequest());
});
