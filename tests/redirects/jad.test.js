import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'jad';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps('jad');
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

// all methods of `jad.public` of the library
const PUBLIC_METHODS = [
    'addEventListener', 'addTargeting', 'clearTargeting', 'createNewPosition', 'disableAutoRefreshOnPosition',
    'displayPositions', 'getAdsFromWebediads', 'getConfig', 'getDailymotionAdsParamsForScript',
    'getDailymotionCustomConfig', 'getDailymotionCustomConfigObject', 'getDefaultDailymotionAdsParamsForScript',
    'getDefaultVideoAdUrl', 'getGeoloc', 'getNetwork', 'getPage', 'getSite', 'getTargetingOnPosition', 'getTrailers',
    'getVastUrl', 'getVideoAdUrl', 'isGdprCompliant', 'loadPositions', 'refreshAds', 'removePosition', 'setConfig',
    'setHashedId', 'setTargetingOnPosition', 'xplnGetVideoDailymotionPositions',
];

test('Runs the queued commands, which start the video as with ads disabled', (assert) => {
    // as the page code of 3djuegos.com and xataka.com before the blocked library
    window.jad = window.jad || {};
    const pageJad = window.jad;
    window.jad.cmd = window.jad.cmd || [];
    const queue = window.jad.cmd;
    const calls = [];
    window.jad.cmd.push(() => {
        window.jad.public.setConfig({ page: '/1018282/3DJuegos/homepage', pagePositions: ['top'] });
        window.jad.public.loadPositions();
        window.jad.public.displayPositions();
        calls.push('config');
    });
    window.jad.cmd.push(() => {
        const key = 'preroll_sticky_autoplay/x7lwy-0';
        window.jad.public.setTargetingOnPosition(key, { related: ['yes'] });
        window.jad.public.getDailymotionAdsParamsForScript([key], (res) => calls.push(res[key]));
    });
    runRedirect();

    assert.strictEqual(window.jad, pageJad, 'jad of the page is kept');
    assert.strictEqual(window.jad.cmd, queue, 'queue of the page is kept');
    assert.deepEqual(calls, ['config', 'premium'], 'queued commands are run, and the video gets no ads');
    assert.strictEqual(queue.length, 0, 'commands are removed from the queue');

    // as the page code of ozap.com, purepeople.com and moviepilot.de after the library is loaded
    const length = window.jad.cmd.push(() => {
        window.jad.public.addEventListener('positionRenderEnded', () => calls.push('event'));
        window.jad.public.createNewPosition({ name: 'inread1', divId: 'jad-inread1-01' });
        window.jad.public.refreshAds(['inread1/jad-inread1-01']);
        window.jad.public.removePosition('inread1/jad-inread1-01');
        calls.push('pushed');
    });
    assert.deepEqual(calls, ['config', 'premium', 'pushed'], 'pushed command is run at once');
    assert.strictEqual(length, 0, 'push() returns the length of the queue');

    // moviepilot.de uses `Object.values(res)[0] || ""`, and the trailer does not start with an empty value
    window.jad.public.getDailymotionAdsParamsForScript(['preroll/player-1'], (res) => {
        calls.push(Object.values(res)[0] || '');
    });
    assert.strictEqual(calls[calls.length - 1], 'premium', 'value for the first key is not empty');
});

test('Answers as the library with ads disabled', (assert) => {
    runRedirect();
    const pub = window.jad.public;
    PUBLIC_METHODS.forEach((method) => {
        assert.strictEqual(typeof pub[method], 'function', `${method}()`);
    });

    const results = [];
    const record = (label) => (value) => results.push([label, value]);
    pub.getDailymotionAdsParamsForScript(['a/1', 'b/2'], record('params'));
    pub.getDailymotionCustomConfig('a', record('single key'));
    pub.getDailymotionCustomConfigObject(['a/1'], record('object'));
    pub.getTrailers(record('trailers'));
    pub.getVastUrl(['a/1'], record('vast'), 'dailymotion');
    pub.getVideoAdUrl('a', record('video ad'));
    pub.getGeoloc(record('geoloc'));
    pub.isGdprCompliant(null, record('gdpr'));
    assert.deepEqual(results, [
        ['params', { 'a/1': 'premium', 'b/2': 'premium' }],
        ['single key', 'premium'],
        ['object', { 'a/1': { customParams: 'premium' } }],
        ['trailers', []],
        ['vast', { 'a/1': '' }],
        ['video ad', ''],
        ['geoloc', null],
        ['gdpr', false],
    ], 'callbacks are called with the values of the library without ads');

    assert.deepEqual(pub.getDefaultDailymotionAdsParamsForScript(['a/1']), { 'a/1': 'premium' }, 'default params');
    assert.deepEqual(pub.getDefaultVideoAdUrl(['a/1']), { 'a/1': '' }, 'default video ad URL');
    assert.false(pub.createNewPosition({ name: 'a' }), 'no position is created');
    assert.deepEqual(pub.getConfig(), {}, 'no configuration');
    assert.deepEqual(pub.getTargetingOnPosition('a'), {}, 'no targeting');
    assert.strictEqual(pub.getPage(), '', 'no page');
    assert.deepEqual(pub.xplnGetVideoDailymotionPositions(), [], 'no video positions');
    assert.strictEqual(pub.refreshAds(['a/1']), undefined, 'refreshAds() does nothing');

    // values which are not callbacks are ignored, and errors of the page are caught
    pub.getDailymotionAdsParamsForScript(['a/1']);
    pub.getTrailers(() => {
        throw new Error('error of the page');
    });
    pub.getDailymotionCustomConfigObject('a', record('not an array'));
    assert.strictEqual(results.length, 8, 'getDailymotionCustomConfigObject() needs an array of keys');
});

test('Ignores invalid commands and errors of the page', (assert) => {
    const calls = [];
    window.jad = {
        cmd: [
            'invalid',
            () => {
                throw new Error('error of the page');
            },
            () => calls.push('queued'),
        ],
    };
    runRedirect();
    window.jad.cmd.push(null, () => calls.push('pushed'));
    assert.deepEqual(calls, ['queued', 'pushed'], 'other commands are run');
});

test('Keeps the library which is already on the page', (assert) => {
    const library = { cmd: [], public: { setConfig: () => 'real' } };
    window.jad = library;
    runRedirect();
    assert.strictEqual(window.jad, library, 'library is kept');
    assert.strictEqual(window.jad.public.setConfig(), 'real', 'methods are kept');
    assert.strictEqual(window.jad.cmd.push, Array.prototype.push, 'queue is not taken over');

    clearGlobalProps('jad');
    runRedirect();
    const mock = window.jad;
    const mockPublic = mock.public;
    runRedirect();
    assert.strictEqual(window.jad, mock, 'mock is not installed again');
    assert.strictEqual(window.jad.public, mockPublic, 'public of the mock is kept');
});

test('No requests, cookies or storage items', (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeImage = window.Image;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    window.Image = record('Image');
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: record('cookie'),
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    // elements of the page, i.e. not of the QUnit report
    const countElements = () => [...document.querySelectorAll('*')].filter((e) => !e.closest('#qunit')).length;
    const elementsBefore = countElements();
    try {
        window.jad = { cmd: [() => window.jad.public.setConfig({ page: '/1/site/home' })] };
        runRedirect();
        const pub = window.jad.public;
        pub.loadPositions();
        pub.displayPositions();
        pub.createNewPosition({ name: 'inread1', divId: 'jad-inread1-01' });
        pub.refreshAds(['inread1/jad-inread1-01']);
        pub.setHashedId({ sha256: 'a' });
        pub.getDailymotionAdsParamsForScript(['preroll/player'], () => {});
        pub.getTrailers(() => {});
        assert.deepEqual(calls, [], 'no request, cookie or storage item');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
        assert.strictEqual(countElements(), elementsBefore, 'no elements are added');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        window.Image = nativeImage;
        delete document.cookie;
    }
});
