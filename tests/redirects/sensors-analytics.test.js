/* eslint-disable no-underscore-dangle, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'sensors-analytics';

const GLOBAL_NAME = 'sensorsDataAnalytic201505';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps(GLOBAL_NAME, 'sensors', 'sa', 'sensorsTestLog');
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Runs the snippet of the SDK of its documentation, which defines the global with a queue
 * and would load the SDK, without loading it.
 *
 * @param {string} globalName name of the global, e.g. `sensors`
 * @param {object} para options of the page
 */
const runSnippet = (globalName, para) => {
    // as the snippet, see e.g. https://www.shanbay.com/
    (function (p) {
        const n = p.name;
        const w = window;
        if (typeof (w[GLOBAL_NAME]) !== 'undefined') {
            return;
        }
        w[GLOBAL_NAME] = n;
        w[n] = w[n] || function (a) {
            return function () {
                // eslint-disable-next-line prefer-rest-params
                (w[n]._q = w[n]._q || []).push([a, arguments]);
            };
        };
        const ifs = ['track', 'quick', 'register', 'registerPage', 'registerOnce', 'trackSignup', 'trackAbtest',
            'setProfile', 'setOnceProfile', 'appendProfile', 'incrementProfile', 'deleteProfile', 'unsetProfile',
            'identify', 'login', 'logout', 'trackLink', 'clearAllRegister', 'getAppStatus'];
        for (let i = 0; i < ifs.length; i += 1) {
            w[n][ifs[i]] = w[n].call(null, ifs[i]);
        }
        if (!w[n]._t) {
            w[n].para = p;
        }
    }({ ...para, name: globalName }));
};

test('Installs the API, which the page uses without a check', (assert) => {
    runRedirect();
    const sensors = window[GLOBAL_NAME];
    assert.strictEqual(typeof sensors, 'object', 'global is defined');
    assert.strictEqual(window.sensors, undefined, 'no other global');

    // as pages, e.g. www.cib.com.cn, galaxy.geely.com and forum.dji.com
    const para = { server_url: 'https://collect.example.org/sa?project=default', heatmap: {} };
    assert.strictEqual(sensors.readyState.state, 0, 'not initialized yet');
    assert.strictEqual(sensors.use('PageLeave', {}), undefined, 'use()');
    assert.strictEqual(sensors.init(para), undefined, 'init()');
    assert.strictEqual(sensors.para, para, 'options of the page are kept');
    assert.strictEqual(sensors.readyState.state, 3, 'initialized');
    assert.true(sensors.readyState.getState().length > 0, 'state history');
    sensors.init({ other: true });
    assert.strictEqual(sensors.para, para, 'second init() changes nothing');
    [
        ['registerPage', { a: 1 }], ['quick', 'autoTrack'], ['track', 'event', { a: 1 }], ['logout'],
        ['clearAllRegister'], ['login', 'user'], ['bind', '$identity_email', 'a@example.org'], ['identify', 'id'],
        ['setProfile', { a: 1 }], ['register', { a: 1 }], ['registerOnce', { a: 1 }], ['trackLink', {}, 'e'],
        ['setItem', 'type', 'id', {}], ['deleteItem', 'type', 'id'], ['registerPropertyPlugin', {}],
        ['on', 'event', () => {}], ['enableSDK'], ['disableSDK'], ['log', 'message'],
    ].forEach((call) => {
        const method = call[0];
        assert.strictEqual(typeof sensors[method], 'function', `${method}() is defined`);
        sensors[method](...call.slice(1));
    });

    assert.deepEqual(sensors.getPresetProperties(), { identities: {} }, 'no preset properties of the visitor');
    assert.strictEqual(sensors.quick('getAnonymousID'), '', 'no anonymous id');
    assert.deepEqual(sensors.quick('getUtm'), {}, 'no UTM parameters');
    assert.strictEqual(typeof sensors.quick('getStayTime'), 'number', 'stay time');
    assert.strictEqual(sensors.quick('unknown'), undefined, 'unknown command');
    assert.strictEqual(sensors.store.getDistinctId(), '', 'no distinct id');
    assert.strictEqual(sensors.store.getFirstId(), '', 'no first id');
    assert.strictEqual(sensors.store.getAnonymousId(), '', 'no anonymous id in the store');
    assert.deepEqual(sensors.store.getProps(), {}, 'no stored properties');
    assert.deepEqual(sensors.store.getIdentities(), {}, 'no identities');
    assert.strictEqual(sensors.getDisabled(), false, 'not disabled');
    assert.strictEqual(sensors.isNewUser(), false, 'not a new user');
    assert.strictEqual(sensors.getCurrentDomain(), window.location.hostname, 'domain of the page');
    assert.strictEqual(typeof sensors.lib_version, 'string', 'version');
    assert.deepEqual(sensors.modules, {}, 'no modules');
});

test('Calls the callbacks of the page as the SDK', async (assert) => {
    runRedirect();
    const sensors = window[GLOBAL_NAME];
    const calls = [];
    const callback = (label) => function (...args) {
        calls.push(`${label}:${args.length}`);
    };
    sensors.track('event', {}, callback('track'));
    sensors.trackSignup('id', 'event', {}, callback('trackSignup'));
    sensors.login('user', callback('login'));
    sensors.setProfile({ a: 1 }, callback('setProfile'));
    sensors.setOnceProfile({ a: 1 }, callback('setOnceProfile'));
    sensors.appendProfile({ a: [1] }, callback('appendProfile'));
    sensors.incrementProfile({ a: 1 }, callback('incrementProfile'));
    sensors.unsetProfile(['a'], callback('unsetProfile'));
    sensors.deleteProfile(callback('deleteProfile'));
    sensors.quick('autoTrack', {}, callback('autoTrack'));
    sensors.quick('autoTrackSinglePage', {}, callback('autoTrackSinglePage'));
    sensors.quick('autoTrackWithoutProfile', {}, callback('autoTrackWithoutProfile'));
    sensors.track('event', {}, () => {
        throw new Error('error of the page');
    });
    sensors.quick('isReady', callback('isReady'));
    const thisArgs = [];
    sensors.quick(function (a, b) {
        thisArgs.push(this, a, b);
    }, 1, 2);
    sensors.quick(() => {
        throw new Error('error of the page');
    });
    assert.deepEqual(calls, ['isReady:0'], 'isReady callback is called at once');
    assert.deepEqual(thisArgs, [sensors, 1, 2], 'function is called with the SDK and the arguments');

    let appStatusCalled = false;
    assert.strictEqual(sensors.getAppStatus(() => {
        appStatusCalled = true;
    }), null, 'no status of an app');

    await sleep(20);
    assert.deepEqual(calls.sort(), [
        'appendProfile:0', 'autoTrack:0', 'autoTrackSinglePage:0', 'autoTrackWithoutProfile:0',
        'deleteProfile:0', 'incrementProfile:0', 'isReady:0', 'login:0', 'setOnceProfile:0', 'setProfile:0',
        'track:0', 'trackSignup:0', 'unsetProfile:0',
    ], 'other callbacks are called later, without arguments');
    assert.false(appStatusCalled, 'getAppStatus() callback is not called, as without an app');
});

test('Links are not delayed by trackLinks()', (assert) => {
    runRedirect();
    const link = document.createElement('a');
    link.href = '#sensors-analytics-test';
    document.body.appendChild(link);
    try {
        window[GLOBAL_NAME].trackLinks(link, 'click', {});
        window[GLOBAL_NAME].trackLink(link, 'click', {});
        let prevented = null;
        link.addEventListener('click', (event) => {
            prevented = event.defaultPrevented;
            event.preventDefault();
        });
        link.click();
        assert.false(prevented, 'click is not prevented');
    } finally {
        link.remove();
    }
});

test('Replaces the global of the snippet, and runs its queued commands', async (assert) => {
    const para = { sdk_url: 'https://static.example.org/sensorsdata.min.js', server_url: 'https://example.org/sa' };
    runSnippet('sensors', para);
    const calls = [];
    window.sensors.quick('autoTrack');
    window.sensors.track('event', { a: 1 }, () => calls.push('track'));
    window.sensors.login('user', () => calls.push('login'));
    window.sensors.quick('isReady', () => calls.push('isReady'));
    window.sensors.registerPage({ a: 1 });
    assert.strictEqual(window.sensors._q.length, 5, 'commands are queued by the snippet');

    runRedirect();
    const sensors = window[GLOBAL_NAME];
    assert.strictEqual(typeof sensors, 'object', 'global of the SDK is the mock');
    assert.strictEqual(window.sensors, sensors, 'global of the snippet is the mock');
    assert.strictEqual(sensors.para.server_url, para.server_url, 'options of the snippet are kept');
    assert.strictEqual(sensors.readyState.state, 3, 'initialized, as by the SDK');
    assert.deepEqual(calls, ['isReady'], 'queued isReady callback is called at once');
    await sleep(20);
    assert.deepEqual(calls.sort(), ['isReady', 'login', 'track'], 'queued callbacks are called');

    // calls after the mock is installed
    window.sensors.track('event', {}, () => calls.push('later'));
    await sleep(20);
    assert.true(calls.includes('later'), 'later calls use the mock');
});

test('Snippet with another name and an invalid queue', (assert) => {
    runSnippet('sa', {});
    window.sa.registerPage({ a: 1 });
    window.sa._q.push('invalid', ['noSuchMethod', []], ['hasOwnProperty', ['a']], ['track', null], null);
    runRedirect();
    assert.strictEqual(window.sa, window[GLOBAL_NAME], 'global of the snippet is the mock');
    assert.strictEqual(window.sensors, undefined, 'no other global');
});

test('Keeps the SDK or the mock which is already on the page', (assert) => {
    // e.g. the SDK bundled in the page code, or an object of a set-constant rule
    const sdk = { init: () => 'real', lib_version: '1.26.6' };
    window[GLOBAL_NAME] = sdk;
    runRedirect();
    assert.strictEqual(window[GLOBAL_NAME], sdk, 'SDK is kept');
    assert.strictEqual(window[GLOBAL_NAME].init(), 'real', 'its methods are kept');

    clearGlobalProps(GLOBAL_NAME);
    runRedirect();
    const mock = window[GLOBAL_NAME];
    mock.registerPage({ a: 1 });
    runRedirect();
    assert.strictEqual(window[GLOBAL_NAME], mock, 'mock is not installed again');
});

test('No requests, cookies, storage items or elements', async (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeCreateElement = document.createElement;
    const nativeImage = window.Image;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    window.Image = record('Image');
    document.createElement = function (...args) {
        calls.push(`createElement:${args[0]}`);
        return nativeCreateElement.apply(document, args);
    };
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: record('cookie'),
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    try {
        runSnippet('sensors', { server_url: 'https://example.org/sa' });
        window.sensors.quick('autoTrack');
        runRedirect();
        const sensors = window[GLOBAL_NAME];
        sensors.init({ server_url: 'https://example.org/sa', heatmap: { clickmap: 'default' } });
        sensors.quick('autoTrack');
        sensors.track('event', { a: 1 });
        sensors.login('user');
        sensors.setProfile({ a: 1 });
        sensors.bind('$identity_email', 'a@example.org');
        sensors.use('PageLeave', {});
        await sleep(20);

        assert.deepEqual(calls, [], 'no request, cookie, storage or element creation');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        window.Image = nativeImage;
        delete document.createElement;
        delete document.cookie;
    }
});
