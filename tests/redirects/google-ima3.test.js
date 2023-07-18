/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'google-ima3';

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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-google-ima.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Ima mocked', (assert) => {
    assert.expect(28);

    runRedirect(name);

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

    runRedirect(name);

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

    runRedirect(name);

    // check if DAI API is not discarded by the redirect
    assert.ok(window.google.ima.dai, 'window.google.ima.dai exists');
    assert.ok(window.google.ima.dai.api, 'window.google.ima.dai.api exists');
    assert.strictEqual(window.google.ima.dai.api.foo, 'bar', 'window.google.ima.dai.api.foo is equal to "bar"');

    // other properties should be discarded
    assert.strictEqual(window.google.ima.bar, undefined, 'window.google.ima.bar is undefined');
});
