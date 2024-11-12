/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'google-analytics';

const changingProps = ['dataLayer', 'ga'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

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
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-google-analytics_analytics.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Check whether googletagmanager-gtm works as alias', (assert) => {
    const codeByAnalyticsParams = redirects.getRedirect(name).content;
    const codeByTagmanagerParams = redirects.getRedirect('googletagmanager-gtm').content;

    assert.strictEqual(codeByAnalyticsParams, codeByTagmanagerParams, 'googletagmanager-gtm - ok');
});

test('Check ga api', (assert) => {
    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };

    // emulate DataLayer
    mockGoogleDataLayer(endCallback);

    evalWrapper(redirects.getRedirect(name).content);

    // check ga api
    assert.ok(window.ga, 'ga object was created');
    assert.notEqual(window.ga.length, 0, 'ga.length was mocked');
    assert.ok(window.ga.create(), 'Tracker was created');
    assert.ok(window.ga.getByName(), 'getByName returns Tracker too');
    assert.strictEqual(window.ga.getAll().length, 1, 'getAll returns empty array');
    assert.notOk(window.ga.getAll()[0].get(), 'Tracker doesnt return anything');
    assert.notOk(window.ga.remove(), 'remove returns undefined');
    assert.strictEqual(window.ga.loaded, true, 'loaded returns true');
});

test('Function as lastArg', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

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
    assert.expect(2);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    mockGoogleTagManagerApi(endCallback);

    evalWrapper(redirects.getRedirect(name).content);

    assert.strictEqual(window.google_optimize.get(), undefined, 'google_optimize.get has been mocked');
});

test('Test eventCallback mocking', (assert) => {
    assert.expect(2);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    evalWrapper(redirects.getRedirect(name).content);

    const done = assert.async();
    const data = {
        checkHandler: undefined,
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag(data);
});

test('Test .push(data) mocking', (assert) => {
    // emulate API
    window.dataLayer = [];
    window.dataLayer.push = () => { };
    const gtag = (data) => {
        window.dataLayer.push(data);
    };

    evalWrapper(redirects.getRedirect(name).content);

    const data = {
        noCallback: true,
    };
    gtag(data);

    assert.deepEqual(data, window.dataLayer[0], 'data is added to dataLayer');
});

test('Test event_callback mocking', (assert) => {
    assert.expect(2);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    evalWrapper(redirects.getRedirect(name).content);

    const done = assert.async();
    const data = {
        checkHandler: undefined,
        event_callback: () => {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    };
    gtag({ data });
});

test('Test callback mocking', (assert) => {
    assert.expect(2);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);
    const gtag = (data) => {
        dataLayer.push(data);
    };

    evalWrapper(redirects.getRedirect(name).content);

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
});

test('Test ga queued commands', (assert) => {
    let firstScriptExecuted = false;
    let secondScriptExecuted = false;

    function gaFunction(...args) {
        window.ga.q = window.ga.q || [];
        window.ga.q.push(args);
    }

    window.ga = window.ga || gaFunction;

    window.ga('create', 'UA-32789052-1', 'auto');

    window.ga('send', 'pageview', {
        page: '/',
        hitCallback: () => {
            firstScriptExecuted = true;
        },
    });

    window.ga('event', 'pageview', {
        page: '/test',
        hitCallback: () => {
            secondScriptExecuted = true;
        },
    });

    evalWrapper(redirects.getRedirect(name).content);

    const done = assert.async();

    setTimeout(() => {
        assert.strictEqual(firstScriptExecuted, true, 'first hitCallback executed');
        assert.strictEqual(secondScriptExecuted, true, 'second hitCallback executed');
        done();
    }, 20);
});
