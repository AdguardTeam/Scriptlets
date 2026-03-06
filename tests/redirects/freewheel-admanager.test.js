/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'freewheel-admanager';

const freewheelTvProp = 'tv';

const afterEach = () => {
    clearGlobalProps(freewheelTvProp);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before, afterEach });

test('Mocked - window.tv.freewheel.SDK structure', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.tv, 'window.tv created');
    assert.ok(window.tv.freewheel, 'window.tv.freewheel created');
    assert.ok(window.tv.freewheel.SDK, 'window.tv.freewheel.SDK created');

    const { SDK } = window.tv.freewheel;
    assert.ok(SDK.Ad, 'SDK.Ad mocked');
    assert.ok(SDK.AdManager, 'SDK.AdManager mocked');
    assert.ok(SDK.AdListener, 'SDK.AdListener mocked');
    assert.ok(SDK.setLogLevel, 'SDK.setLogLevel mocked');
    assert.strictEqual(SDK.EVENT_SLOT_ENDED, 'EVENT_SLOT_ENDED', 'SDK.EVENT_SLOT_ENDED is set correctly');
    assert.deepEqual(SDK._instanceQueue, {}, 'SDK._instanceQueue is empty object');
});

test('Mocked - AdManager instance methods', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const AdManager = new window.tv.freewheel.SDK.AdManager();

    const methods = new Set([
        'addEventListener',
        'addKeyValue',
        'addTemporalSlot',
        'dispose',
        'newContext',
        'registerCustomPlayer',
        'registerVideoDisplayBase',
        'removeEventListener',
        'resize',
        'setCapability',
        'setContentVideoElement',
        'setLogLevel',
        'setNetwork',
        'setParameter',
        'setProfile',
        'setServer',
        'setSiteSection',
        'setVideoAsset',
        'setVideoDisplaySize',
        'submitRequest',
    ]);

    methods.forEach((method) => {
        assert.strictEqual(typeof AdManager[method], 'function', `AdManager.${method} is a function`);
    });
});

test('Mocked - submitRequest fires EVENT_SLOT_ENDED callback', (assert) => {
    const done = assert.async();

    evalWrapper(redirects.getRedirect(name).content);

    const { SDK } = window.tv.freewheel;
    const adManager = new SDK.AdManager();

    let callbackFired = false;
    let receivedEventType;

    adManager.addEventListener('EVENT_SLOT_ENDED', (event) => {
        callbackFired = true;
        receivedEventType = event.type;
    });

    adManager.submitRequest();

    setTimeout(() => {
        assert.strictEqual(callbackFired, true, 'EVENT_SLOT_ENDED callback was fired');
        assert.strictEqual(
            receivedEventType,
            SDK.EVENT_SLOT_ENDED,
            'event.type matches SDK.EVENT_SLOT_ENDED',
        );
        done();
    }, 10);
});

test('Mocked - submitRequest does not throw without listener', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { SDK } = window.tv.freewheel;
    const adManager = new SDK.AdManager();

    try {
        adManager.submitRequest();
        assert.ok(true, 'submitRequest does not throw when no listener is registered');
    } catch (error) {
        assert.ok(false, `submitRequest threw an error when no listener was registered: ${error && error.message}`);
    }
});

test('Mocked - newContext returns context object', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const adManager = new window.tv.freewheel.SDK.AdManager();
    const context = adManager.newContext();

    assert.strictEqual(context, adManager, 'newContext returns this');
});
