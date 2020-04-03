/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
import { clearGlobalProps } from '../helpers';


const { test, module } = QUnit;
const name = 'googletagservices-gpt';

module(name);

const evalWrapper = eval;

const companionAdsService = {
    addEventListener: null,
    enableSyncLoading: null,
    setRefreshUnfilledSlots: null,
};
const contentService = {
    addEventListener: null,
    setContent: null,
};

test('UBO alias', (assert) => {
    const params = {
        name: 'ubo-googletagservices_gpt.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.equal(window.googletag.apiReady, true, 'apiReady');
    assert.notDeepEqual(window.googletag.companionAds(), companionAdsService, 'companionAds() returns the mocked data');
    assert.notDeepEqual(window.googletag.content(), contentService, 'content() returns the mocked data');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debugScriptlets', 'hit');
});

test('UBO Syntax', (assert) => {
    const params = {
        name: 'googletagservices_gpt.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.equal(window.googletag.apiReady, true, 'apiReady');
    assert.notDeepEqual(window.googletag.companionAds(), companionAdsService, 'companionAds() returns the mocked data');
    assert.notDeepEqual(window.googletag.content(), contentService, 'content() returns the mocked data');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debugScriptlets', 'hit');
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.googletag, 'window.googletag have been created');
    assert.equal(window.googletag.apiReady, true, 'apiReady');
    assert.notDeepEqual(window.googletag.companionAds(), companionAdsService, 'companionAds() returns the mocked data');
    assert.notDeepEqual(window.googletag.content(), contentService, 'content() returns the mocked data');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debugScriptlets', 'hit');
});
