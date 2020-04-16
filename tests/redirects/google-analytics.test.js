/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'google-analytics';

module(name);

const evalWrapper = eval;

const mockGoogleDataLayer = (endCallback) => {
    window.dataLayer = {
        hide: {
            end() {
                endCallback();
            },
        },
    };

    return window.dataLayer;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-google-analytics_analytics.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams.toString(), codeByUboParams.toString(), 'ubo name - ok');
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate DataLayer
    mockGoogleDataLayer(endCallback);

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    // check ga api
    assert.ok(window.ga, 'ga object was created');
    assert.ok(window.ga.create(), 'Tracker was created');
    assert.notOk(window.ga.getByName(), 'getByName returns null');
    assert.strictEqual(window.ga.getAll().length, 0, 'getAll returns empty array');
    assert.notOk(window.ga.remove(), 'remove returns undefined');
    assert.strictEqual(window.ga.loaded, true, 'loaded returns true');
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit', 'dataLayer', 'ga');
});
