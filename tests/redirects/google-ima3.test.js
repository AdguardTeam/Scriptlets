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
