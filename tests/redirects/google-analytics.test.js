/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'google-analytics';

const changingProps = ['hit', '__debug', 'dataLayer', 'ga'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

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
    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };

    // emulate DataLayer
    mockGoogleDataLayer(endCallback);

    runRedirect(name);

    // check ga api
    assert.ok(window.ga, 'ga object was created');
    assert.notEqual(window.ga.length, 0, 'ga.length was mocked');
    assert.ok(window.ga.create(), 'Tracker was created');
    assert.ok(window.ga.getByName(), 'getByName returns Tracker too');
    assert.strictEqual(window.ga.getAll().length, 1, 'getAll returns empty array');
    assert.notOk(window.ga.getAll()[0].get(), 'Tracker doesnt return anything');
    assert.notOk(window.ga.remove(), 'remove returns undefined');
    assert.strictEqual(window.ga.loaded, true, 'loaded returns true');
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Function as lastArg', (assert) => {
    runRedirect(name);

    const done = assert.async();

    const testMethod = () => {
        window.test = true;
    };
    window.ga(testMethod);

    assert.ok(window.ga, 'ga object was created');
    assert.notEqual(window.ga.length, 0, 'ga.length was mocked');
    setTimeout(() => {
        assert.equal(window.test, true, 'lastArg-function has run');
        done();
    }, 20);
});

test('Test google tag manager mocking', (assert) => {
    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    mockGoogleTagManagerApi(endCallback);

    runRedirect(name);

    assert.strictEqual(window.google_optimize.get(), undefined, 'google_optimize.get has been mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test eventCallback mocking', (assert) => {
    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    runRedirect(name);

    const done = assert.async();
    const data = {
        checkHandler: undefined,
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag(data);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test .push(data) mocking', (assert) => {
    // emulate API
    window.dataLayer = [];
    window.dataLayer.push = () => {};
    const gtag = (data) => {
        window.dataLayer.push(data);
    };

    runRedirect(name);

    const data = {
        noCallback: true,
    };
    gtag(data);

    assert.deepEqual(data, window.dataLayer[0], 'data is added to dataLayer');
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test event_callback mocking', (assert) => {
    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    runRedirect(name);

    const done = assert.async();
    const data = {
        checkHandler: undefined,
        event_callback: () => {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag({ data });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});

test('Test callback mocking', (assert) => {
    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    runRedirect(name);

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
});
