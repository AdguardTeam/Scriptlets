/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'googletagservices-gpt';

const changingProps = ['hit', '__debug', 'googletag'];

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

    const optDiv = 3;

    const slot = window.googletag.defineSlot('1', 2, optDiv);
    assert.strictEqual(slot.getAdUnitPath(), '1', '.getAdUnitPath() has been mocked.');
    assert.strictEqual(slot.getDomId(), optDiv, 'getDomId has been mocked.');
    assert.strictEqual(slot.getAttributeKeys().length, 0, '.getAttributeKeys() has been mocked.');

    const sizes = slot.getSizes()[0];
    assert.strictEqual(sizes.getHeight(), 2, '.getSizes() has been mocked.');
    assert.strictEqual(sizes.getWidth(), 2, '.getSizes() has been mocked.');

    assert.strictEqual(typeof slot.addService(), 'object', '.addService() has been mocked.');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test recreateIframeForSlot', (assert) => {
    runRedirect(name);
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

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test updateTargetingFromMap', (assert) => {
    runRedirect(name);

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
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test setPrivacySettings', (assert) => {
    runRedirect(name);

    const setPrivacySettings = window.googletag.pubads().setPrivacySettings({});
    assert.ok(window.googletag, 'window.googletag have been created');
    assert.strictEqual(typeof setPrivacySettings, 'object', 'setPrivacySettings has been mocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
