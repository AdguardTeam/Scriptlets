/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'sensors-analytics';

const GLOBAL_NAME = 'sensorsDataAnalytic201505';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', GLOBAL_NAME);
};

module(name, { beforeEach, afterEach });

test('Installs the API, which the page then uses without a check', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    // as the page code after the blocked SDK, e.g. of galaxy.geely.com
    const sensors = window[GLOBAL_NAME];
    sensors.init({ server_url: 'https://example.org/sa' });
    sensors.registerPage({ platform: 'web' });
    sensors.quick('autoTrack');
    sensors.track('Viewpage', { a: 1 });
    assert.strictEqual(sensors.readyState.state, 3, 'initialized');
    assert.strictEqual(sensors.store.getDistinctId(), '', 'no id');
});

test('Is not applied twice, and keeps the SDK', (assert) => {
    runScriptlet(name);
    const first = window[GLOBAL_NAME];
    clearGlobalProps('hit');
    runScriptlet(name);
    assert.strictEqual(window[GLOBAL_NAME], first, 'second run keeps the first mock');
    assert.strictEqual(window.hit, undefined, 'hit function not fired again');

    clearGlobalProps(GLOBAL_NAME);
    const sdk = { init: () => {} };
    window[GLOBAL_NAME] = sdk;
    runScriptlet(name);
    assert.strictEqual(window[GLOBAL_NAME], sdk, 'SDK is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
});
