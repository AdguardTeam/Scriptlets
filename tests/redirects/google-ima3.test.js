/* eslint-disable no-underscore-dangle */
import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'google-ima3';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-google-ima.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Ima mocked', (assert) => {
    assert.expect(29);

    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window.google, 'window.google created');
    assert.ok(window.google.ima, 'Ima created');
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(window.google.ima)) {
        assert.ok(window.google.ima[key], `ima.${key} mocked`);
    }

    const adsManagerLoadedEvent = new window.google.ima.AdsManagerLoadedEvent('test');
    assert.strictEqual(adsManagerLoadedEvent.type, 'test', 'AdsManagerLoadedEvent constructor works properly');
    const adError = new window.google.ima.AdError(
        'type',
        'code',
        'vast',
        'message',
        'adsRequest',
        'userRequestContext',
    );
    assert.strictEqual(adError.adsRequest, 'adsRequest', 'AdError adsRequest saved');
    assert.strictEqual(adError.userRequestContext, 'userRequestContext', 'AdError request context saved');
});

test('Ima - run requestAds function twice', (assert) => {
    // Test for https://github.com/AdguardTeam/Scriptlets/issues/255
    const done = assert.async();

    evalWrapper(redirects.getRedirect(name).content);

    let number = 0;
    const test = () => {
        number += 1;
    };
    const { ima } = window.google;
    const AdsLoader = new ima.AdsLoader();
    AdsLoader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, test);

    AdsLoader.requestAds();
    requestAnimationFrame(() => {
        assert.strictEqual(number, 1, 'number is equal to 1');
    });

    AdsLoader.requestAds();
    requestAnimationFrame(() => {
        assert.strictEqual(number, 2, 'number is equal to 2');
        done();
    });
});

// https://github.com/AdguardTeam/Scriptlets/issues/331
test('Ima - check if DAI API is not discarded by the redirect', (assert) => {
    // Define some dummy DAI API which cannot be discarded by the redirect
    window.google = {
        ima: {
            // should be kept
            dai: {
                api: {
                    foo: 'bar',
                },
            },
            // should be discarded
            bar: 'foo',
        },
    };

    evalWrapper(redirects.getRedirect(name).content);

    // check if DAI API is not discarded by the redirect
    assert.ok(window.google.ima.dai, 'window.google.ima.dai exists');
    assert.ok(window.google.ima.dai.api, 'window.google.ima.dai.api exists');
    assert.strictEqual(window.google.ima.dai.api.foo, 'bar', 'window.google.ima.dai.api.foo is equal to "bar"');

    // other properties should be discarded
    assert.strictEqual(window.google.ima.bar, undefined, 'window.google.ima.bar is undefined');
});

test('Ima - omidAccessModeRules', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const adConfig = () => {
        const adObj = {
            adHeight: 250,
            adWidth: 300,
            config: {
                adContainerSelector: '#ad-container',
            },
        };
        return adObj;
    };

    const AdsRequest = new window.google.ima.AdsRequest();
    AdsRequest.linearAdSlotWidth = adConfig().adWidth;
    AdsRequest.linearAdSlotHeight = adConfig().adHeight;
    AdsRequest.nonLinearAdSlotWidth = adConfig().adWidth;
    AdsRequest.nonLinearAdSlotHeight = adConfig().adHeight / 3;
    AdsRequest.omidAccessModeRules = {};
    // eslint-disable-next-line max-len
    AdsRequest.omidAccessModeRules[window.google.ima.OmidVerificationVendor.GOOGLE] = window.google.ima.OmidAccessMode.FULL;
    // eslint-disable-next-line max-len
    AdsRequest.omidAccessModeRules[window.google.ima.OmidVerificationVendor.OTHER] = window.google.ima.OmidAccessMode.FULL;

    assert.strictEqual(
        window.google.ima.OmidVerificationVendor.GOOGLE,
        9,
        'OmidVerificationVendor.OTHER is equal to 9',
    );
    assert.strictEqual(
        window.google.ima.OmidVerificationVendor.OTHER,
        1,
        'OmidVerificationVendor.OTHER is equal to 1',
    );
});

test('Ima - getInnerError', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const adError = new window.google.ima.AdError();
    const innerError = adError.getInnerError();

    const errorCode = innerError === null ? null : innerError.getErrorCode();

    assert.strictEqual(errorCode, null, 'innerError is set to null');
});

test('Ima - AdDisplayContainer create element', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const adContainer = document.createElement('div');
    adContainer.classList.add('ad-container');
    document.body.appendChild(adContainer);
    const adDisplayContainer = new window.google.ima.AdDisplayContainer(adContainer);
    const adDiv = adContainer.querySelector('div');

    assert.strictEqual(typeof adDisplayContainer === 'object', true, 'adDisplayContainer is an object');
    assert.ok(adDiv, 'adDiv exists');
});

test('Ima - EventHandler bind context', (assert) => {
    const done = assert.async();

    evalWrapper(redirects.getRedirect(name).content);

    let testPassed = false;

    const ima = function ima() { };
    ima.adErrorTest = function adErrorTest() {
        testPassed = true;
    };

    ima.adDisplayContainer = function createAdContainer() {
        this.adDisplayContainer = new window.google.ima.AdDisplayContainer(this.adContainer, this.videoTag);
        this.adDisplayContainer.initialize();
    };
    ima.createAdLoader = function adLoader() {
        this.adsLoader = new window.google.ima.AdsLoader(this.adDisplayContainer);
        this.adsLoader.addEventListener(
            window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            this.onAdsManagerLoaded,
            !1,
            this,
        );
        this.adsLoader.addEventListener(
            window.google.ima.AdErrorEvent.Type.AD_ERROR,
            this.onAdError,
            !1,
            this,
        );
        ima.requestAds();
    };
    ima.onAdsManagerLoaded = function adsManager() { };
    ima.onAdError = function adError() {
        this.adErrorTest();
    };
    ima.requestAds = function requestAds() {
        this.adsLoader.requestAds(this.createAdsRequest());
    };
    ima.createAdsRequest = function adsRequest() {
        const adsRequest = new window.google.ima.AdsRequest();
        adsRequest.adTagUrl = '';
        return adsRequest;
    };

    ima.createAdLoader();

    requestAnimationFrame(() => {
        assert.strictEqual(testPassed, true, 'testPassed set to true');
        done();
    });
});
