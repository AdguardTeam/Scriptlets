import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'googletagservices-gpt';

const changingProps = ['googletag'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

const companionAdsService = {
    addEventListener: null,
    enableSyncLoading: null,
    setRefreshUnfilledSlots: null,
};
const contentService = {
    addEventListener: null,
    setContent: null,
};

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-googletagservices_gpt.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AdGuard Syntax', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.equal(window.googletag.apiReady, true, 'apiReady');
    assert.notDeepEqual(window.googletag.companionAds(), companionAdsService, 'companionAds() returns the mocked data');
    assert.notDeepEqual(window.googletag.content(), contentService, 'content() returns the mocked data');

    const mockedPubads = window.googletag.pubads();
    assert.ok(mockedPubads, 'pubads() returns data');
    assert.strictEqual(mockedPubads.display(), undefined, 'pubads().display() is mocked');
    assert.strictEqual(typeof mockedPubads.enableLazyLoad, 'function', 'pubads().enableLazyLoad() is function');
    assert.strictEqual(mockedPubads.enableLazyLoad(), undefined, 'pubads().enableLazyLoad() is mocked');
    assert.strictEqual(typeof mockedPubads.getTargeting, 'function', 'pubads().getTargeting() is function');
    assert.ok(mockedPubads.getTargeting() instanceof Array, 'pubads().getTargeting() returns array');
    assert.strictEqual(mockedPubads.getTargeting().length, 0, 'pubads().getTargeting() is mocked');
    assert.false(mockedPubads.isInitialLoadDisabled(), 'pubads().isInitialLoadDisabled() returns false');
});

test('Test Slot', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof window.googletag.defineSlot(), 'object', 'Slot has been mocked');

    const optDiv = 3;

    const slot = window.googletag.defineSlot('1', 2, optDiv);
    assert.strictEqual(slot.getAdUnitPath(), '1', '.getAdUnitPath() has been mocked.');
    assert.strictEqual(slot.getDomId(), optDiv, 'getDomId has been mocked.');
    assert.strictEqual(slot.getAttributeKeys().length, 0, '.getAttributeKeys() has been mocked.');

    const sizes = slot.getSizes()[0];
    assert.strictEqual(sizes.getHeight(), 2, '.getSizes() has been mocked.');
    assert.strictEqual(sizes.getWidth(), 2, '.getSizes() has been mocked.');

    assert.strictEqual(typeof slot.addService(), 'object', '.addService() has been mocked.');
});

test('Test recreateIframeForSlot', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof window.googletag.defineSlot(), 'object', 'Slot has been mocked');

    const slotId = 'slotId';
    const container = document.createElement('div');
    container.id = slotId;
    document.body.append(container);

    window.googletag.defineSlot('', '', slotId);
    window.googletag.display(slotId);

    const iframe = document.querySelector(`#${slotId} > iframe`);
    assert.ok(iframe instanceof HTMLIFrameElement, 'container was created');

    const srcdoc = '<body></body>';
    const mockStyle = 'position: absolute; width: 0px; height: 0px; left: 0px; right: 0px; z-index: -1; border: 0px;';
    assert.strictEqual(iframe.getAttribute('srcdoc'), srcdoc, 'srcdoc was mocked');
    assert.strictEqual(iframe.getAttribute('style'), mockStyle, 'slot was hidden by style attr');
    assert.strictEqual(iframe.getAttribute('width'), '0', 'slot was hidden by width attr');
    assert.strictEqual(iframe.getAttribute('height'), '0', 'slot was hidden by height attr');

    // https://github.com/AdguardTeam/Scriptlets/issues/259
    assert.ok(iframe.getAttribute('data-load-complete'), 'attr was mocked');
    assert.ok(iframe.getAttribute('data-google-container-id'), 'attr was mocked');
    assert.strictEqual(iframe.getAttribute('sandbox'), '', 'attr was mocked');
});

test('Test updateTargetingFromMap', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof window.googletag.defineSlot(), 'object', 'Slot has been mocked');

    const slot = window.googletag.defineSlot('/1234567/sports', [160, 600], 'div');

    // https://github.com/AdguardTeam/Scriptlets/issues/293
    slot.updateTargetingFromMap({
        color: 'red',
        interests: ['sports', 'music', 'movies'],
    });

    assert.strictEqual(
        slot.getTargeting('color')[0],
        'red',
        '.getTargeting() has been mocked - color[0] = red.',
    );
    assert.strictEqual(
        slot.getTargeting('interests')[0],
        'sports',
        '.getTargeting() has been mocked - interests[0] = sports.',
    );
    assert.strictEqual(
        slot.getTargeting('interests')[1],
        'music',
        '.getTargeting() has been mocked - interests[1] = music.',
    );
});

test('Test setPrivacySettings', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const setPrivacySettings = window.googletag.pubads().setPrivacySettings({});
    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof setPrivacySettings, 'object', 'setPrivacySettings has been mocked');
});

test('Test slot setConfig and getConfig', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const slot = window.googletag.defineSlot('/1234567/sports', [160, 600], 'slot-config-div');
    slot.setConfig({
        clickUrl: 'https://example.com/click',
        customKey: 'custom-value',
        targeting: {
            category: 'sports',
            tags: ['a', ['b', 'c']],
        },
    });

    const config = slot.getConfig(['clickUrl', 'customKey', 'targeting']);

    assert.ok(Object.isFrozen(config), 'slot.getConfig() returns a frozen object');
    assert.strictEqual(config.clickUrl, 'https://example.com/click', 'clickUrl from setConfig is stored');
    assert.strictEqual(config.customKey, 'custom-value', 'custom key from setConfig is stored');
    assert.ok(config.targeting instanceof Map, 'targeting is stored as Map');
    assert.strictEqual(config.targeting.get('category')[0], 'sports', 'targeting string value is converted to array');
    assert.strictEqual(config.targeting.get('tags')[2], 'c', 'nested targeting arrays are flattened');
});

test('Test googletag setConfig and getConfig', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    window.googletag.setConfig({
        customKey: 'global-value',
        disableInitialLoad: true,
        targeting: {
            placement: 'homepage',
            audiences: ['sports', 'news'],
        },
    });

    const config = window.googletag.getConfig(['customKey', 'disableInitialLoad', 'targeting']);
    const slot = window.googletag.defineSlot('/1234567/sports', [160, 600], 'global-config-div');

    assert.ok(Object.isFrozen(config), 'googletag.getConfig() returns a frozen object');
    assert.strictEqual(config.customKey, 'global-value', 'custom value is stored in googletag config');
    assert.true(config.disableInitialLoad, 'disableInitialLoad from setConfig is stored');
    assert.ok(config.targeting instanceof Map, 'global targeting is stored as Map');
    assert.strictEqual(slot.getTargeting('placement')[0], 'homepage', 'slot reads global targeting key');
    assert.strictEqual(slot.getTargeting('audiences')[1], 'news', 'slot reads global targeting array');
});

test('Test pubads disableInitialLoad state', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const pubads = window.googletag.pubads();

    assert.false(pubads.isInitialLoadDisabled(), 'initial load is enabled by default');
    assert.strictEqual(pubads.disableInitialLoad(), undefined, 'disableInitialLoad() returns nothing');
    assert.true(pubads.isInitialLoadDisabled(), 'disableInitialLoad() sets initial-load state to disabled');

    window.googletag.setConfig({ disableInitialLoad: 0 });
    assert.false(pubads.isInitialLoadDisabled(), 'disableInitialLoad state is boolean-coerced by setConfig()');
});
