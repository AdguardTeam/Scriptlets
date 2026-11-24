/* eslint-disable no-underscore-dangle */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-tags';

const ORG = 'ABC123@AdobeOrg';
const PREHIDING_IDS = ['at-body-style', 'alloy-prehiding'];
const GLOBALS = [
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

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

/**
 * Removes the cookies which the tests have set.
 */
const removeTestCookies = () => {
    document.cookie.split(';').map((cookie) => cookie.split('=')[0].trim())
        .filter((cookieName) => cookieName.startsWith('AMCV_') || cookieName.startsWith('tags_test'))
        .forEach((cookieName) => {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    PREHIDING_IDS.forEach((id) => {
        const style = document.getElementById(id);
        if (style) {
            style.remove();
        }
    });
};

module(name, { before, afterEach });

const run = (resource = name) => {
    evalWrapper(redirects.getRedirect(resource).content);
};

test('Installs _satellite and the libraries which a Tags library contains', async (assert) => {
    run();
    const satellite = window._satellite;
    [
        'track',
        'getVar',
        'setVar',
        'getVisitorId',
        'notify',
        'readCookie',
        'setCookie',
        'removeCookie',
        'pageBottom',
        'setDebug',
    ].forEach((method) => {
        assert.strictEqual(typeof satellite[method], 'function', `_satellite.${method}()`);
    });
    ['log', 'info', 'debug', 'warn', 'error'].forEach((method) => {
        assert.strictEqual(typeof satellite.logger[method], 'function', `_satellite.logger.${method}()`);
    });
    ['get', 'set', 'remove'].forEach((method) => {
        assert.strictEqual(typeof satellite.cookie[method], 'function', `_satellite.cookie.${method}()`);
    });
    assert.strictEqual(typeof satellite.buildInfo.turbineVersion, 'string', 'buildInfo');
    assert.strictEqual(satellite.environment.stage, 'production', 'environment');
    assert.deepEqual(satellite.property, { id: '', name: '' }, 'property');
    assert.strictEqual(satellite.company.orgId, '', 'company');
    assert.strictEqual(window.__satelliteLoaded, true, '__satelliteLoaded, as set by the library');

    assert.strictEqual(typeof window.Visitor.getInstance, 'function', 'Visitor');
    assert.strictEqual(typeof window.AppMeasurement, 'function', 'AppMeasurement');
    assert.strictEqual(typeof window.s_gi, 'function', 's_gi');
    assert.strictEqual(typeof window.adobe.target.getOffer, 'function', 'adobe.target');
    assert.strictEqual(typeof window.adobe.OptInCategories, 'object', 'adobe.OptInCategories');
    assert.strictEqual(window.s, undefined, 'no tracker s, as it is created by the rules of the site');
    await sleep(10);
});

test('Page calls do not throw and do nothing', (assert) => {
    run();
    const satellite = window._satellite;
    assert.strictEqual(satellite.track.length, 2, 'track() declares its parameters, as pages check its length');
    assert.strictEqual(satellite.track('event', { a: 1 }), undefined, 'track()');
    assert.strictEqual(satellite.pageBottom(), undefined, 'pageBottom()');
    satellite.logger.error('message');
    satellite.notify('message', 5);
    satellite.setDebug(true);
    assert.ok(true, 'logger, notify() and setDebug() do not throw');

    // pages copy it, e.g. `{ ...window._satellite, events }`
    const copy = { ...satellite };
    assert.strictEqual(copy.track, satellite.track, 'members are own enumerable properties');
});

test('getVar() and setVar() as the library without data elements', (assert) => {
    run();
    const { getVar, setVar } = window._satellite;
    assert.strictEqual(getVar('missing'), undefined, 'unknown variable');
    setVar('name', 'value');
    assert.strictEqual(getVar('name'), 'value', 'setVar(name, value)');
    setVar({ obj: { nested: { deep: 1 } }, other: 2 });
    assert.strictEqual(getVar('obj.nested.deep'), 1, 'setVar(object), path of properties');
    assert.strictEqual(getVar('other'), 2, 'each property of the object');
    assert.strictEqual(getVar('obj.missing.deep'), undefined, 'missing part of the path');
    assert.strictEqual(getVar('toString'), undefined, 'inherited names are not variables');
    assert.strictEqual(getVar(undefined), undefined, 'not a string');

    const element = document.createElement('a');
    element.id = 'link';
    element.href = 'https://example.org/';
    element.textContent = '  some \n text ';
    const event = { type: 'click', element, target: element };
    assert.strictEqual(getVar('event.type', event), 'click', 'event.<path>');
    assert.strictEqual(getVar('this.id', event), 'link', 'this.<path>');
    assert.strictEqual(getVar('this.getAttribute(href)', event), 'https://example.org/', 'getAttribute()');
    assert.strictEqual(getVar('this.@text', event), '  some \n text ', '@text');
    assert.strictEqual(getVar('this.@cleanText', event), 'some text', '@cleanText');
    assert.strictEqual(getVar('target.href', event), 'https://example.org/', 'target.<path>');
    assert.strictEqual(getVar('event.type'), undefined, 'no event');
});

test('Cookies are read but not written', (assert) => {
    document.cookie = 'tags_test_a=1%202; path=/';
    document.cookie = 'tags_test_b="quoted"; path=/';
    run();
    const satellite = window._satellite;
    assert.strictEqual(satellite.cookie.get('tags_test_a'), '1 2', 'decoded value, as js-cookie');
    assert.strictEqual(satellite.cookie.get('tags_test_b'), 'quoted', 'quotes removed');
    assert.strictEqual(satellite.cookie.get('tags_test_missing'), undefined, 'missing cookie');
    assert.strictEqual(satellite.cookie.get().tags_test_a, '1 2', 'all cookies without a name');
    assert.strictEqual(satellite.readCookie('tags_test_a'), '1 2', 'readCookie()');

    satellite.cookie.set('tags_test_c', 'x');
    satellite.setCookie('tags_test_d', 'x', 1);
    satellite.cookie.remove('tags_test_a');
    satellite.removeCookie('tags_test_b');
    assert.notOk(document.cookie.includes('tags_test_c'), 'cookie.set() writes nothing');
    assert.notOk(document.cookie.includes('tags_test_d'), 'setCookie() writes nothing');
    assert.ok(document.cookie.includes('tags_test_a'), 'cookie.remove() removes nothing');
    assert.ok(document.cookie.includes('tags_test_b'), 'removeCookie() removes nothing');
});

test('getVisitorId() returns an instance of the Visitor API', async (assert) => {
    run();
    const visitor = window._satellite.getVisitorId();
    assert.strictEqual(visitor.getMarketingCloudVisitorID(), '', 'empty id');
    assert.strictEqual(visitor.marketingCloudOrgID, '', 'no organization, as it is not known');
    assert.strictEqual(window._satellite.getVisitorId(), visitor, 'the same instance');
    const registered = Array.isArray(window.s_c_il) ? window.s_c_il : [];
    assert.notOk(registered.includes(visitor), 'not registered in s_c_il');
    assert.notOk(document.cookie.includes('AMCV_'), 'no AMCV cookie for it');

    const done = assert.async();
    visitor.getMarketingCloudVisitorID((id) => {
        assert.strictEqual(id, '', 'empty id in the callback');
        done();
    });
    await sleep(10);

    const pageVisitor = window.Visitor.getInstance(ORG);
    assert.notStrictEqual(pageVisitor, visitor, 'the page gets its own instance');
    assert.strictEqual(window._satellite.getVisitorId(), pageVisitor, 'then the instance of the page is returned');
});

test('Completes a _satellite object of the page in place, keeps the real library', (assert) => {
    const pageSatellite = { custom: 1 };
    window._satellite = pageSatellite;
    run();
    assert.strictEqual(window._satellite, pageSatellite, 'the same object, as the library');
    assert.strictEqual(pageSatellite.custom, 1, 'its properties kept');
    assert.strictEqual(typeof pageSatellite.track, 'function', 'completed');

    clearGlobalProps(...GLOBALS);
    const realTrack = () => {};
    const real = { track: realTrack };
    window._satellite = real;
    run();
    assert.strictEqual(window._satellite, real, 'real library kept');
    assert.strictEqual(real.track, realTrack, 'its track() kept');
    assert.strictEqual(real.getVar, undefined, 'nothing added to it');
    assert.strictEqual(window.__satelliteLoaded, undefined, '__satelliteLoaded not set');

    const first = window._satellite;
    run();
    assert.strictEqual(window._satellite, first, 'second run keeps it');
});

test('Each library is mocked once, in any order with the other Adobe resources', (assert) => {
    run('adobe-target');
    const { target } = window.adobe;
    run('adobe-visitor');
    const { Visitor } = window;
    run('adobe-analytics');
    const { AppMeasurement } = window;
    run();
    assert.strictEqual(window.adobe.target, target, 'adobe.target kept');
    assert.strictEqual(window.Visitor, Visitor, 'Visitor kept');
    assert.strictEqual(window.AppMeasurement, AppMeasurement, 'AppMeasurement kept');
    assert.strictEqual(typeof window._satellite.track, 'function', '_satellite added');

    clearGlobalProps(...GLOBALS);
    run();
    const tags = {
        target: window.adobe.target,
        Visitor: window.Visitor,
        AppMeasurement: window.AppMeasurement,
        satellite: window._satellite,
    };
    run('adobe-target');
    run('adobe-visitor');
    run('adobe-analytics');
    run();
    assert.strictEqual(window.adobe.target, tags.target, 'adobe.target of adobe-tags kept');
    assert.strictEqual(window.Visitor, tags.Visitor, 'Visitor of adobe-tags kept');
    assert.strictEqual(window.AppMeasurement, tags.AppMeasurement, 'AppMeasurement of adobe-tags kept');
    assert.strictEqual(window._satellite, tags.satellite, '_satellite kept');
});

test('Removes the prehiding styles of Adobe Target and of the Web SDK', (assert) => {
    PREHIDING_IDS.forEach((id) => {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = 'body { opacity: 0 !important }';
        document.head.appendChild(style);
    });
    run();
    PREHIDING_IDS.forEach((id) => {
        assert.strictEqual(document.getElementById(id), null, `${id} removed`);
    });
});

test('No requests, cookies or storage items', async (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeCreateElement = document.createElement;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    document.createElement = function createElement(...args) {
        calls.push(`createElement:${args[0]}`);
        return nativeCreateElement.apply(document, args);
    };
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: (value) => {
            calls.push(`cookie:${value}`);
        },
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    try {
        run();
        const satellite = window._satellite;
        satellite.track('event');
        satellite.pageBottom();
        satellite.setDebug(true);
        satellite.cookie.set('c', 'v');
        satellite.setCookie('c', 'v', 1);
        satellite.cookie.remove('c');
        satellite.getVisitorId().getVisitorValues(() => {});
        window.adobe.target.getOffer({ mbox: 'm' });
        window.s_gi('rsid').t();
        await sleep(20);

        assert.deepEqual(calls, [], 'no request, cookie, storage or element creation');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        delete document.createElement;
        delete document.cookie;
    }
});

test('Creates adobe.optIn at once, as the Experience Cloud ID extension of the library', (assert) => {
    run();
    const { optIn, OptInCategories } = window.adobe;
    assert.strictEqual(typeof optIn, 'object', 'adobe.optIn before Visitor.getInstance()');
    // the configuration of the site is not known, so no consent is assumed
    assert.true(optIn.doesOptInApply, 'opt-in applies');
    assert.strictEqual(optIn.status, 'pending', 'pending');
    assert.false(optIn.isApproved(OptInCategories.ANALYTICS), 'not approved');
    assert.false(optIn.isApproved(OptInCategories.ECID), 'no category is approved');
    // as the library, a callback waits for the decision of the visitor
    const fetched = [];
    optIn.fetchPermissions((permissions) => fetched.push(permissions.aa));
    assert.deepEqual(fetched, [], 'permissions are not passed before the decision');
    // e.g. a consent manager of the page
    optIn.approve([OptInCategories.ANALYTICS, OptInCategories.TARGET], true);
    optIn.complete();
    assert.true(optIn.isApproved(OptInCategories.ANALYTICS), 'approved by the page');
    assert.false(optIn.isApproved(OptInCategories.AAM), 'other categories not approved');
    assert.deepEqual(fetched, [true], 'permissions are passed once the decision is completed');
    optIn.deny(OptInCategories.ANALYTICS);
    assert.deepEqual(fetched, [true], 'only once');
    window.Visitor.getInstance('ABC@AdobeOrg');
    assert.strictEqual(window.adobe.optIn, optIn, 'kept by getInstance()');

    // the Visitor API of the page creates its own adobe.optIn
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    const pageVisitor = function Visitor() {};
    pageVisitor.getInstance = () => ({});
    window.Visitor = pageVisitor;
    run();
    assert.strictEqual(window.Visitor, pageVisitor, 'Visitor of the page is kept');
    assert.strictEqual(window.adobe.optIn, undefined, 'no adobe.optIn of the mock with the Visitor of the page');

    // the adobe-visitor resource alone creates it by getInstance(), as VisitorAPI.js
    clearGlobalProps(...GLOBALS);
    run('adobe-visitor');
    assert.strictEqual(window.adobe.optIn, undefined, 'adobe-visitor: not before getInstance()');
});

test('Mocks _satellite also if another library cannot be mocked', (assert) => {
    // e.g. a global of the page which cannot be changed
    Object.defineProperty(window, 'adobe', {
        configurable: true,
        get: () => {
            throw new Error('error of the page');
        },
    });
    try {
        run();
        assert.strictEqual(typeof window._satellite.track, 'function', '_satellite is mocked');
        assert.strictEqual(typeof window.AppMeasurement, 'function', 'AppMeasurement is mocked');
    } finally {
        delete window.adobe;
    }
});
