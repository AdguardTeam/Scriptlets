/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-tags';

const GLOBALS = [
    'hit',
    '__debug',
    '_satellite',
    '__satelliteLoaded',
    'Visitor',
    'adobe',
    's_c_il',
    's_c_in',
    'AppMeasurement',
    'AppMeasurement_Module_ActivityMap',
    's_gi',
    's_pgicq',
    's_giq',
    's_objectID',
    'mboxCreate',
    'mboxDefine',
    'mboxUpdate',
];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
    const style = document.getElementById('alloy-prehiding');
    if (style) {
        style.remove();
    }
    delete document.readyState;
};

module(name, { beforeEach, afterEach });

test('Installs _satellite and the libraries', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(typeof window._satellite.track, 'function', '_satellite');
    assert.strictEqual(window._satellite.getVisitorId().getMarketingCloudVisitorID(), '', 'getVisitorId()');
    assert.strictEqual(typeof window.adobe.target.getOffer, 'function', 'adobe.target');
    assert.strictEqual(typeof window.Visitor.getInstance, 'function', 'Visitor');
    assert.strictEqual(typeof window.s_gi, 'function', 's_gi');
});

test('Removes the prehiding style of the Web SDK added after the scriptlet', async (assert) => {
    // at document start, before the prehiding snippet of the page
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    runScriptlet(name);
    delete document.readyState;

    const style = document.createElement('style');
    style.id = 'alloy-prehiding';
    style.textContent = 'body {opacity: 0 !important}';
    document.head.appendChild(style);
    await Promise.resolve();
    assert.notOk(style.isConnected, 'prehiding style is removed when it is added');
});

test('Keeps the real libraries and is not applied twice', (assert) => {
    const real = { track: () => {} };
    window._satellite = real;
    window.adobe = { target: { getOffer: () => {} }, OptInCategories: {} };
    window.Visitor = () => {};
    window.AppMeasurement = () => {};
    window.s_gi = () => {};
    window.s_pgicq = () => {};
    window.AppMeasurement_Module_ActivityMap = () => {};
    runScriptlet(name);
    assert.strictEqual(window._satellite, real, 'existing _satellite is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps(...GLOBALS);
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    runScriptlet(name);
    const first = window._satellite;
    runScriptlet(name);
    assert.strictEqual(window._satellite, first, 'second run keeps the first mock');
});
