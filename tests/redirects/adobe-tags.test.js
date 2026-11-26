/* eslint-disable no-underscore-dangle */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
    trackPageWatchers,
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

// The mock of at.js, which the resource contains, dispatches its events from a timer, and observes the page
// for prehiding styles, each time the resource runs, so they are stopped after each test.
let stopPageWatchers = () => {};

const beforeEach = () => {
    stopPageWatchers = trackPageWatchers();
};

const afterEach = () => {
    stopPageWatchers();
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    PREHIDING_IDS.forEach((id) => {
        const style = document.getElementById(id);
        if (style) {
            style.remove();
        }
    });
};

module(name, { before, beforeEach, afterEach });

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

test('Visitor.getInstance() sets the AMCV cookie only once the page approves ECID', (assert) => {
    const hasCookie = (orgId) => document.cookie.split('; ').some((cookie) => cookie.startsWith(`AMCV_${orgId}=`));
    run();
    window.Visitor.getInstance('TAGS@AdobeOrg');
    // the configuration of the site is not known, so opt-in applies, see the test of adobe.optIn
    assert.false(hasCookie('TAGS@AdobeOrg'), 'not before the consent of the visitor');
    window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
    assert.true(hasCookie('TAGS@AdobeOrg'), 'once the page approves ECID');

    // as by the library, the first decision of the visitor counts for an instance
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const { optIn, OptInCategories } = window.adobe;
    window.Visitor.getInstance('FIRST@AdobeOrg');
    optIn.approve(OptInCategories.TARGET);
    assert.false(hasCookie('FIRST@AdobeOrg'), 'not if another category is approved');
    optIn.approve(OptInCategories.ECID);
    assert.false(hasCookie('FIRST@AdobeOrg'), 'not if ECID is approved after the first decision');
    window.Visitor.getInstance('LATER@AdobeOrg');
    assert.true(hasCookie('LATER@AdobeOrg'), 'at once for an instance created after ECID is approved');
});

test('The opt-in service gets the storage which the page enables in Visitor.getInstance()', (assert) => {
    const readStored = () => {
        const match = document.cookie.match(/(?:^|; )adobeujs-optin=([^;]*)/);
        return match ? JSON.parse(decodeURIComponent(match[1])) : null;
    };
    const removeStored = () => {
        document.cookie = 'adobeujs-optin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };
    const hasCookie = (orgId) => document.cookie.split('; ').some((cookie) => cookie.startsWith(`AMCV_${orgId}=`));
    const storage = { doesOptInApply: true, isOptInStorageEnabled: true };

    // the decision which the library has stored, e.g. on another page of the site
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true, aa: true }))}; path=/`;
    run();
    const { optIn } = window.adobe;
    const completed = [];
    optIn.on('complete', (permissions) => completed.push(permissions.ecid));
    const statusBefore = optIn.status;
    window.Visitor.getInstance('STORE@AdobeOrg', storage);
    const afterEnabling = [optIn.status, optIn.isApproved('ecid'), optIn.isApproved('aa'), optIn.isApproved('target')];
    const cookieAfterEnabling = hasCookie('STORE@AdobeOrg');
    const storedAfterEnabling = readStored();
    optIn.deny('ecid');
    const storedAfterDenial = readStored();
    removeStored();
    assert.strictEqual(window.adobe.optIn, optIn, 'the opt-in service is kept');
    assert.strictEqual(statusBefore, 'pending', 'pending before the page enables the storage');
    assert.deepEqual(afterEnabling, ['complete', true, true, false], 'the stored decision is applied');
    assert.true(cookieAfterEnabling, 'so the cookie of the instance is set');
    assert.deepEqual(storedAfterEnabling, { ecid: true, aa: true }, 'nothing is stored by applying it');
    assert.deepEqual(completed, [true, false], 'the listeners are kept and notified');
    assert.strictEqual(storedAfterDenial.ecid, false, 'the next decision is stored');
    assert.strictEqual(storedAfterDenial.aa, true, 'with the other stored permissions');

    // a category which the page has changed already is not replaced by the stored one
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true, aa: true }))}; path=/`;
    run();
    window.adobe.optIn.deny('ecid');
    window.Visitor.getInstance('CHANGED@AdobeOrg', storage);
    const afterChange = [window.adobe.optIn.isApproved('ecid'), window.adobe.optIn.isApproved('aa')];
    removeStored();
    assert.deepEqual(afterChange, [false, true], 'a decision of the page is kept');

    // a decision which the page has completed before the storage is enabled is stored over the old one
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true, aa: true }))}; path=/`;
    run();
    window.adobe.optIn.deny('ecid');
    // a deferred decision waits for complete()
    window.adobe.optIn.approve('target', true);
    window.Visitor.getInstance('EARLY@AdobeOrg', storage);
    const earlyStored = readStored();
    removeStored();
    assert.deepEqual([earlyStored.ecid, earlyStored.aa], [false, true], 'a completed denial is stored');
    assert.notOk(earlyStored.target, 'a deferred decision is not stored before it is completed');

    // a deferred change does not replace a stored decision when a completed one is stored
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true }))}; path=/`;
    run();
    window.adobe.optIn.deny('target');
    window.adobe.optIn.approve('ecid', true);
    window.Visitor.getInstance('STAGED@AdobeOrg', storage);
    const stagedStored = readStored();
    removeStored();
    assert.deepEqual(
        [stagedStored.ecid, stagedStored.target],
        [true, false],
        'the stored approval is kept, with the completed denial of another category',
    );

    // an instance is registered before the callbacks which wait for the decision are called
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true }))}; path=/`;
    run();
    const instances = [];
    window.adobe.optIn.fetchPermissions(() => {
        instances.push(window.Visitor.getInstance('ONE@AdobeOrg', storage));
    });
    const outer = window.Visitor.getInstance('ONE@AdobeOrg', storage);
    removeStored();
    assert.strictEqual(instances[0], outer, 'the callback gets the instance of the caller');
    assert.strictEqual(window.s_c_il.filter((v) => v && v.marketingCloudOrgID === 'ONE@AdobeOrg').length, 1, 'once');

    // a stored decision which cannot be decoded is not known, so no cookie is set
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    document.cookie = 'adobeujs-optin=%E0%A4%A; path=/';
    run();
    window.Visitor.getInstance('BAD@AdobeOrg', { doesOptInApply: false, isOptInStorageEnabled: true });
    const badHasCookie = hasCookie('BAD@AdobeOrg');
    window.Visitor.getInstance('BAD2@AdobeOrg', { doesOptInApply: false, isOptInStorageEnabled: true });
    const bad2HasCookie = hasCookie('BAD2@AdobeOrg');
    removeStored();
    assert.false(badHasCookie, 'no cookie if the stored decision cannot be decoded');
    assert.false(bad2HasCookie, 'nor for the next organization');

    // nothing is stored unless the page enables the storage
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    window.Visitor.getInstance('NOSTORE@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.approve('ecid');
    assert.strictEqual(readStored(), null, 'nothing is stored without isOptInStorageEnabled');
});

test('A configuration passed later gives the opt-in service of one created with it, for any calls', (assert) => {
    // The opt-in service of `adobe-tags` exists before the page passes an opt-in configuration
    // to `Visitor.getInstance()`. Whatever the page has called before, it must end as the service of `adobe-visitor`,
    // which is created with the configuration, as by the library, before the same calls: the permissions,
    // the status, the stored decision and the cookie of a new organization.
    const OPERATIONS = [['complete'], ['fetchPermissions', false], ['fetchPermissions', true]];
    ['approve', 'deny'].forEach((method) => {
        ['ecid', 'target'].forEach((category) => {
            [false, true].forEach((shouldWait) => OPERATIONS.push([method, category, shouldWait]));
        });
    });
    const sequences = [[]];
    OPERATIONS.forEach((first) => {
        sequences.push([first]);
        OPERATIONS.forEach((second) => sequences.push([first, second]));
    });
    const STORED = [null, { ecid: true, aa: true }, { ecid: false, aa: true }];
    const CONFIGS = [
        { isOptInStorageEnabled: true },
        { isOptInStorageEnabled: true, preOptInApprovals: { ecid: true, campaign: true } },
        { isOptInStorageEnabled: true, previousPermissions: { ecid: false }, preOptInApprovals: { ecid: true } },
        { previousPermissions: { ecid: true, target: true } },
        { doesOptInApply: false, isOptInStorageEnabled: true, preOptInApprovals: { ecid: false } },
        { doesOptInApply: false },
        {},
    ];
    const removeStored = () => {
        document.cookie = 'adobeujs-optin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };

    /**
     * Returns the state of the opt-in service after the calls of a sequence.
     *
     * @param {string} resource Redirect to run.
     * @param {object} config Opt-in configuration of the `getInstance()` call, besides `doesOptInApply`.
     * @param {object|null} stored Decision stored before.
     * @param {Array} sequence Calls of the page.
     * @param {number} position Number of the calls made before `getInstance()`.
     * @returns {string} State.
     */
    const getState = (resource, config, stored, sequence, position) => {
        clearGlobalProps(...GLOBALS);
        removeTestCookies();
        removeStored();
        if (stored) {
            document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify(stored))}; path=/`;
        }
        run(resource);
        const getConfig = () => JSON.parse(JSON.stringify({ doesOptInApply: true, ...config }));
        // whether each callback of fetchPermissions() has been called
        const called = [];
        const callOptIn = (operations) => operations.forEach((operation) => {
            if (operation[0] === 'complete') {
                window.adobe.optIn.complete();
            } else if (operation[0] === 'fetchPermissions') {
                const index = called.push(false) - 1;
                window.adobe.optIn.fetchPermissions(() => {
                    called[index] = true;
                }, operation[1]);
            } else {
                window.adobe.optIn[operation[0]](operation[1], operation[2]);
            }
        });
        callOptIn(sequence.slice(0, position));
        window.Visitor.getInstance('FIRST@AdobeOrg', getConfig());
        callOptIn(sequence.slice(position));
        window.Visitor.getInstance('NEW@AdobeOrg', getConfig());
        const { optIn } = window.adobe;
        const match = document.cookie.match(/(?:^|; )adobeujs-optin=([^;]*)/);
        const storedNow = match ? JSON.parse(decodeURIComponent(match[1])) : {};
        return JSON.stringify({
            approved: ['ecid', 'target', 'aa', 'campaign'].map((category) => optIn.isApproved(category)),
            isPreApproved: optIn.isPreApproved('ecid'),
            status: optIn.status,
            doesOptInApply: optIn.doesOptInApply,
            called,
            stored: Object.keys(storedNow).sort().map((category) => `${category}:${storedNow[category]}`),
            hasNewCookie: document.cookie.includes('AMCV_NEW@AdobeOrg='),
        });
    };

    let count = 0;
    const different = [];
    CONFIGS.forEach((config) => {
        STORED.forEach((stored) => {
            sequences.forEach((sequence) => {
                // created with the configuration before the calls, as by the library
                const expected = getState('adobe-visitor', config, stored, sequence, 0);
                // the configuration is passed after any number of the calls
                for (let position = 0; position <= sequence.length; position += 1) {
                    count += 1;
                    const actual = getState(name, config, stored, sequence, position);
                    if (expected !== actual) {
                        different.push({
                            config,
                            stored,
                            sequence,
                            position,
                            expected,
                            actual,
                        });
                    }
                }
            });
        });
    });
    removeStored();
    assert.strictEqual(count, 8106, 'number of cases');
    assert.deepEqual(different.slice(0, 5), [], 'the same state in all cases');
});

test('The opt-in configuration of the page is applied as by the library', (assert) => {
    const hasCookie = (orgId) => document.cookie.split('; ').some((cookie) => cookie.startsWith(`AMCV_${orgId}=`));
    const readStored = () => {
        const match = document.cookie.match(/(?:^|; )adobeujs-optin=([^;]*)/);
        return match ? JSON.parse(decodeURIComponent(match[1])) : null;
    };
    const removeStored = () => {
        document.cookie = 'adobeujs-optin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };

    // the configuration of a call whose function of previousPermissions calls getInstance() itself
    run();
    window.Visitor.getInstance('OUTER@AdobeOrg', {
        doesOptInApply: true,
        isOptInStorageEnabled: true,
        previousPermissions: () => {
            window.Visitor.getInstance('INNER@AdobeOrg', {
                doesOptInApply: true,
                isOptInStorageEnabled: true,
                preOptInApprovals: { ecid: true },
            });
            return { ecid: false };
        },
    });
    const nested = [window.adobe.optIn.isApproved('ecid'), hasCookie('OUTER@AdobeOrg')];
    window.adobe.optIn.approve('target');
    const storedAfterNested = readStored();
    removeStored();
    assert.deepEqual(nested, [false, false], 'the denial of the outer call is applied');
    assert.strictEqual(storedAfterNested.ecid, false, 'and stored');

    // doesOptInApply of the configuration
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const { optIn } = window.adobe;
    const before = [optIn.doesOptInApply, optIn.isApproved('ecid')];
    window.Visitor.getInstance('NOOPTIN@AdobeOrg', { doesOptInApply: false, isOptInStorageEnabled: true });
    const after = [optIn.doesOptInApply, optIn.isApproved('ecid'), hasCookie('NOOPTIN@AdobeOrg')];
    optIn.approve('target');
    const storedWithoutOptIn = readStored();
    removeStored();
    assert.deepEqual(before, [true, false], 'opt-in applies before the page passes a configuration');
    assert.deepEqual(after, [false, true, true], 'opt-in does not apply once the page says so');
    assert.strictEqual(storedWithoutOptIn.ecid, true, 'and ECID is stored as approved');

    // callbacks of fetchPermissions() which wait when the configuration has pre-approvals
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const log = [];
    window.adobe.optIn.fetchPermissions((permissions) => log.push(`once:${permissions.ecid}`));
    window.adobe.optIn.fetchPermissions((permissions) => log.push(`subscribed:${permissions.ecid}`), true);
    const unsubscribe = window.adobe.optIn.fetchPermissions(() => log.push('unsubscribed'), true);
    unsubscribe();
    window.Visitor.getInstance('WAIT@AdobeOrg', { doesOptInApply: true, preOptInApprovals: { ecid: true } });
    const logAfterConfiguration = log.slice();
    const statusAfterConfiguration = window.adobe.optIn.status;
    window.adobe.optIn.deny('ecid');
    assert.deepEqual(logAfterConfiguration, ['once:true', 'subscribed:true'], 'called with the pre-approvals');
    assert.strictEqual(statusAfterConfiguration, 'pending', 'the opt-in stays pending');
    assert.deepEqual(log, ['once:true', 'subscribed:true', 'subscribed:false'], 'the subscribed one is kept');

    // a subscription which the page cancels, and makes again with the same function, is called once
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const resubscribed = [];
    const listener = (permissions) => resubscribed.push(permissions.ecid);
    window.adobe.optIn.fetchPermissions(listener, true)();
    window.adobe.optIn.fetchPermissions(listener, true);
    const removedByOff = () => resubscribed.push('removed by off()');
    window.adobe.optIn.fetchPermissions(removedByOff, true);
    window.adobe.optIn.off('complete', removedByOff);
    window.Visitor.getInstance('AGAIN@AdobeOrg', { doesOptInApply: true, preOptInApprovals: { ecid: true } });
    assert.deepEqual(resubscribed, [true], 'only the subscription which is left is called, once');

    // a subscribed callback which waits is called once when the permissions are completed
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const completions = [];
    window.adobe.optIn.fetchPermissions((permissions) => completions.push(permissions.ecid), true);
    window.adobe.optIn.approve('ecid');
    assert.deepEqual(completions, [true], 'called once at the completion');

    // cookies which cannot be read, e.g. in a sandboxed frame: the stored decision is not known, as the library
    // throws then, so a pre-approval of the configuration is not applied
    const getPreApproved = (isReadable) => {
        clearGlobalProps(...GLOBALS);
        removeTestCookies();
        run();
        if (!isReadable) {
            Object.defineProperty(document, 'cookie', {
                configurable: true,
                get() {
                    throw new DOMException('The document is sandboxed', 'SecurityError');
                },
                set() {
                    throw new DOMException('The document is sandboxed', 'SecurityError');
                },
            });
        }
        try {
            window.Visitor.getInstance('SANDBOX@AdobeOrg', {
                doesOptInApply: true,
                isOptInStorageEnabled: true,
                preOptInApprovals: { ecid: true },
            });
        } finally {
            delete document.cookie;
        }
        return [window.adobe.optIn.isApproved('ecid'), hasCookie('SANDBOX@AdobeOrg')];
    };
    assert.deepEqual(getPreApproved(true), [true, true], 'pre-approval with cookies which can be read');
    assert.deepEqual(getPreApproved(false), [false, false], 'not with cookies which cannot be read');

    // a call which throws, as the library, does not use up the configuration
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    const throwing = { doesOptInApply: true, preOptInApprovals: { ecid: true } };
    let reads = 0;
    Object.defineProperty(throwing, 'cookieLifetime', {
        enumerable: true,
        get() {
            reads += 1;
            throw new Error('error of the page');
        },
    });
    assert.throws(() => window.Visitor.getInstance('THROWS@AdobeOrg', throwing), /error of the page/, 'throws');
    window.Visitor.getInstance('NEXT@AdobeOrg', { doesOptInApply: true, preOptInApprovals: { ecid: true } });
    assert.deepEqual(
        [reads > 0, window.adobe.optIn.isApproved('ecid')],
        [true, true],
        'the configuration of the next call is applied',
    );

    // as by the library, only the configuration of the first call is applied
    clearGlobalProps(...GLOBALS);
    removeTestCookies();
    run();
    window.Visitor.getInstance('FIRST@AdobeOrg', { doesOptInApply: true, preOptInApprovals: { ecid: true } });
    window.Visitor.getInstance('SECOND@AdobeOrg', {
        doesOptInApply: false,
        previousPermissions: { ecid: false },
        preOptInApprovals: { ecid: false, target: true },
    });
    assert.deepEqual(
        [
            window.adobe.optIn.isApproved('ecid'),
            window.adobe.optIn.isApproved('target'),
            window.adobe.optIn.doesOptInApply,
            window.adobe.optIn.status,
        ],
        [true, false, true, 'pending'],
        'the configuration of the next call is not applied',
    );
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
