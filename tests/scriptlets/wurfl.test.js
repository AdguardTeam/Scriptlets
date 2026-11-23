/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'wurfl';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'WURFL', 'WURFLPromises');
};

module(name, { beforeEach, afterEach });

test('Defines WURFL, which the page then reads', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    // as page code, e.g. `GetDeviceTypeRegulated` of webviewer.interstuhlnet.de
    assert.strictEqual(typeof window.WURFL.is_mobile, 'boolean', 'is_mobile');
    assert.strictEqual(typeof window.WURFL.form_factor, 'string', 'form_factor');
    assert.strictEqual(typeof window.WURFL.complete_device_name, 'string', 'complete_device_name');
});

test('Is not applied twice, and keeps WURFL of the page', (assert) => {
    const real = { complete_device_name: '', form_factor: 'Desktop', is_mobile: false };
    window.WURFL = real;
    runScriptlet(name);
    assert.strictEqual(window.WURFL, real, 'WURFL of the page is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
});
