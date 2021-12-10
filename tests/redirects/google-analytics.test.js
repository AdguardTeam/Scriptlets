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
        push() { },
    };

    return window.dataLayer;
};

const mockGoogleTagManagerApi = (endCallback) => {
    mockGoogleDataLayer(endCallback);
    window.google_optimize = {
        get: () => { return true; },
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

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Check whether googletagmanager-gtm works as alias', (assert) => {
    const analyticsParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const tagmanagerParams = {
        name: 'googletagmanager-gtm',
        engine: 'test',
        verbose: true,
    };

    const codeByAnalyticsParams = window.scriptlets.redirects.getCode(analyticsParams);
    const codeByTagmanagerParams = window.scriptlets.redirects.getCode(tagmanagerParams);

    assert.strictEqual(codeByAnalyticsParams, codeByTagmanagerParams, 'googletagmanager-gtm - ok');
});

test('Check ga api', (assert) => {
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
    assert.notEqual(window.ga.length, 0, 'ga.length was mocked');
    assert.ok(window.ga.create(), 'Tracker was created');
    assert.ok(window.ga.getByName(), 'getByName returns Tracker too');
    assert.strictEqual(window.ga.getAll().length, 0, 'getAll returns empty array');
    assert.notOk(window.ga.remove(), 'remove returns undefined');
    assert.strictEqual(window.ga.loaded, true, 'loaded returns true');
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit', 'dataLayer', 'ga');
});

test('Function as lastArg', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);
    const done = assert.async();

    const testMethod = () => {
        window.test = true;
    };
    window.ga(testMethod);

    assert.ok(window.ga, 'ga object was created');
    assert.notEqual(window.ga.length, 0, 'ga.length was mocked');
    setTimeout(() => {
        assert.equal(window.test, true, 'lastArg-function has run');
        clearGlobalProps('__debug', 'hit', 'ga');
        done();
    }, 20);
});

test('Test google tag manager mocking', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    mockGoogleTagManagerApi(endCallback);

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.strictEqual(window.google_optimize.get(), undefined, 'google_optimize.get has been mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit');
});

test('Test eventCallback mocking', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };
    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    const done = assert.async();
    const data = {
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag(data);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit');
});

test('Test event_callback mocking', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };
    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    const done = assert.async();
    const data = {
        event_callback: () => {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag({ data });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit');
});

test('Test callback mocking', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };
    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    const done = assert.async();
    const data = [
        'zero',
        'one',
        {
            callback() {
                assert.ok(true, 'Event callback was executed');
                done();
            },
        },
    ];
    gtag(data);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit');
});
