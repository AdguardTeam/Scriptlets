/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'googletagservices-gpt';

const changingProps = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

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
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-googletagservices_gpt.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AdGuard Syntax', (assert) => {
    runRedirect(name);

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
    assert.true(mockedPubads.isInitialLoadDisabled(), 'pubads().isInitialLoadDisabled() returns true');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test Slot', (assert) => {
    runRedirect(name);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof window.googletag.defineSlot(), 'object', 'Slot has been mocked');

    const slot = window.googletag.defineSlot();
    assert.strictEqual(slot.getAdUnitPath(), '', '.getAdUnitPath() has been mocked.');
    assert.strictEqual(slot.get(), null, '.get() has been mocked.');
    assert.strictEqual(slot.getAttributeKeys().length, 0, '.getAttributeKeys() has been mocked.');
    assert.strictEqual(slot.getSizes().length, 0, '.getSizes() has been mocked.');
    assert.strictEqual(typeof slot.addService(), 'object', '.addService() has been mocked.');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
