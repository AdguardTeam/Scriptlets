/* eslint-disable no-underscore-dangle */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-visitor';

const ORG = 'ABC123@AdobeOrg';
const GLOBALS = [
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
 * Removes the AMCV cookies which the tests have set.
 */
const removeAmcvCookies = () => {
    document.cookie.split(';').map((cookie) => cookie.split('=')[0].trim())
        .filter((cookieName) => cookieName.startsWith('AMCV_'))
        .forEach((cookieName) => {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
    removeAmcvCookies();
};

module(name, { before, afterEach });

const run = (resource = name) => {
    evalWrapper(redirects.getRedirect(resource).content);
};

test('Installs Visitor; adobe.optIn is created by getInstance(), as by the library', (assert) => {
    run();
    const { Visitor } = window;
    assert.strictEqual(typeof Visitor, 'function', 'Visitor');
    assert.deepEqual(Visitor.AuthState, { UNKNOWN: 0, AUTHENTICATED: 1, LOGGED_OUT: 2 }, 'AuthState');
    assert.deepEqual(Visitor.OptOut, { GLOBAL: 'global' }, 'OptOut');
    assert.strictEqual(window.adobe.OptInCategories.ANALYTICS, 'aa', 'adobe.OptInCategories');
    assert.strictEqual(window.adobe.optIn, undefined, 'no adobe.optIn before getInstance()');
    Visitor.getInstance(ORG);
    assert.strictEqual(typeof window.adobe.optIn, 'object', 'adobe.optIn after getInstance()');
});

test('getInstance() as the library', (assert) => {
    run();
    const appMeasurement = { _c: 's_c' };
    window.s_c_il = [appMeasurement];
    window.s_c_in = 1;
    const visitor = window.Visitor.getInstance('ABC123', { trackingServer: 'metrics.example.org' });
    assert.strictEqual(visitor.marketingCloudOrgID, ORG, '@AdobeOrg appended');
    assert.strictEqual(window.Visitor.getInstance(ORG), visitor, 'same instance for the organization');
    assert.notStrictEqual(window.Visitor.getInstance('XYZ@AdobeOrg'), visitor, 'another organization');
    assert.strictEqual(window.s_c_il[0], appMeasurement, 'other instances kept');
    assert.strictEqual(window.s_c_il[1], visitor, 'registered in s_c_il');
    assert.strictEqual(visitor._c, 'Visitor', '_c');
    assert.strictEqual(visitor.trackingServer, 'metrics.example.org', 'configuration copied');
    assert.deepEqual(Object.keys(visitor.FIELDS), ['MCMID', 'MCOPTOUT', 'MCAID', 'MCAAMLH', 'MCAAMB'], 'FIELDS');
    assert.throws(() => window.Visitor.getInstance(), /Org ID/, 'throws without an organization, as the library');
});

test('Empty ids, also in asynchronous callbacks; URLs unchanged', async (assert) => {
    run();
    const visitor = window.Visitor.getInstance(ORG);
    [
        'getMarketingCloudVisitorID',
        'getAnalyticsVisitorID',
        'getAudienceManagerLocationHint',
        'getAudienceManagerBlob',
        'getLocationHint',
        'getOptOut',
        'getSupplementalDataID',
    ].forEach((method) => {
        assert.strictEqual(visitor[method](), '', `${method}() returns an empty id`);
    });
    assert.strictEqual(visitor.isClientSideMarketingCloudVisitorID(), null, 'isClientSideMarketingCloudVisitorID()');
    assert.strictEqual(visitor.isAllowed(), true, 'isAllowed()');
    assert.strictEqual(visitor.appendVisitorIDsTo('https://x.org/p?a=1'), 'https://x.org/p?a=1', 'no adobe_mc');
    assert.strictEqual(visitor.appendSupplementalDataIDTo('https://x.org/p', 'sdid'), 'https://x.org/p', 'no sdid');

    const calls = [];
    visitor.getMarketingCloudVisitorID((id) => calls.push(['mcid', id]));
    visitor.getAnalyticsVisitorID((id) => calls.push(['aid', id]));
    visitor.getVisitorValues((values) => calls.push(['values', values]));
    visitor.getVisitorValues((values) => calls.push(['mcmid', values]), [visitor.FIELDS.MCMID]);
    assert.strictEqual(visitor.isOptedOut((optedOut) => calls.push(['optedOut', optedOut])), null, 'isOptedOut()');
    visitor.getMarketingCloudVisitorID(() => {
        throw new Error('page callback');
    });
    const receiver = {};
    visitor.getMarketingCloudVisitorID([receiver, function callback(id) {
        calls.push(['pair', this === receiver, id]);
    }]);
    assert.deepEqual(calls, [], 'callbacks not called synchronously');
    await sleep(10);
    assert.deepEqual(calls, [
        ['mcid', ''],
        ['aid', ''],
        ['values', {
            MCMID: '',
            MCOPTOUT: '',
            MCAID: '',
            MCAAMLH: '',
            MCAAMB: '',
        }],
        ['mcmid', { MCMID: '' }],
        ['optedOut', false],
        ['pair', true, ''],
    ], 'empty values, errors of callbacks caught, [receiver, callback] pair as the library');

    // as VisitorAPI 3.3.0 and 5.5.0
    visitor.setCustomerIDs({ userid: 'alice' });
    assert.deepEqual(visitor.getCustomerIDs(), { userid: { id: 'alice', authState: 0 } }, 'string id normalized');
    visitor.setCustomerIDs({ crm: { id: '42' }, sso: { id: '7', authState: window.Visitor.AuthState.AUTHENTICATED } });
    assert.deepEqual(visitor.getCustomerIDs(), {
        userid: { id: 'alice', authState: 0 },
        crm: { id: '42', authState: 0 },
        sso: { id: '7', authState: 1 },
    }, 'ids added to the previous ones');
});

test('adobe.optIn when opt-in does not apply', (assert) => {
    run();
    window.Visitor.getInstance(ORG);
    const { optIn } = window.adobe;
    assert.strictEqual(optIn.doesOptInApply, false, 'doesOptInApply');
    assert.strictEqual(optIn.status, 'pending', 'status');
    assert.ok(optIn.isApproved(optIn.Categories.ANALYTICS), 'all categories approved');
    assert.ok(optIn.isApproved(['aa', 'target']), 'list of categories');
    const fetched = [];
    const unsubscribe = optIn.fetchPermissions((permissions) => fetched.push(permissions.aa), true);
    assert.deepEqual(fetched, [true], 'fetchPermissions() calls back at once');
    assert.strictEqual(typeof unsubscribe, 'function', 'returns a function');
    assert.strictEqual(optIn.approve(['aa']), optIn, 'approve() returns the service');
    assert.throws(() => optIn.approve(['unknown']), /Invalid category/, 'unknown category throws, as the library');
    optIn.deny('aa');
    assert.notOk(optIn.isApproved('aa'), 'deny() is applied');
    assert.strictEqual(optIn.status, 'complete', 'completed at once without waiting');
    // approve() and deny() without waiting complete at once, as the library, so the subscriber is called twice
    assert.deepEqual(fetched, [true, true, false], 'subscribed callback called on each completion');
});

test('adobe.optIn follows the configuration of getInstance(), as the library', (assert) => {
    run();
    // e.g. a site which needs the consent of the visitor
    window.Visitor.getInstance('ABC@AdobeOrg', {
        doesOptInApply: true,
        preOptInApprovals: { ecid: true },
    });
    const { optIn } = window.adobe;
    assert.true(optIn.doesOptInApply, 'doesOptInApply');
    assert.strictEqual(optIn.status, 'pending', 'pending');
    assert.true(optIn.isApproved('ecid'), 'pre-approved category');
    assert.false(optIn.isApproved('aa'), 'other category not approved');
    assert.false(optIn.isApproved(['ecid', 'aa']), 'list with a category not approved');
    optIn.approve('aa');
    assert.true(optIn.isApproved('aa'), 'approved by the page');

    // the first call creates it, as by the library
    window.Visitor.getInstance('DEF@AdobeOrg', { doesOptInApply: false });
    assert.strictEqual(window.adobe.optIn, optIn, 'kept by the next call');
    assert.false(optIn.isApproved('target'), 'configuration of the first call');

    // the saved decision of the visitor overrides the pre-approved categories, and completes the opt-in
    const create = (config) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        run();
        window.Visitor.getInstance('ABC@AdobeOrg', config);
        return window.adobe.optIn;
    };
    let saved = create({
        doesOptInApply: true,
        preOptInApprovals: { aa: true },
        previousPermissions: { aa: false, target: true },
    });
    assert.false(saved.isApproved('aa'), 'category denied by the visitor before');
    assert.true(saved.isApproved('target'), 'category approved by the visitor before');
    assert.true(saved.isPreApproved('aa'), 'isPreApproved() of the configuration');
    assert.false(saved.isPreApproved('target'), 'isPreApproved() of another category');
    assert.strictEqual(saved.status, 'complete', 'complete with a saved decision');
    const completed = [];
    saved.fetchPermissions((permissions) => completed.push(permissions.aa));
    assert.deepEqual(completed, [false], 'permissions are passed at once when they are complete');

    // permissions as JSON, and as a function
    saved = create({
        doesOptInApply: true,
        preOptInApprovals: '{"ecid":true}',
        previousPermissions: () => '{"aa":true}',
    });
    assert.deepEqual(
        [saved.isApproved('ecid'), saved.isPreApproved('ecid'), saved.isApproved('aa'), saved.status],
        [true, true, true, 'complete'],
        'JSON of the permissions',
    );
    const invalid = create({ doesOptInApply: true, previousPermissions: { other: true } });
    assert.strictEqual(invalid.status, 'pending', 'invalid saved decision does not complete the opt-in');

    // `doesOptInApply` as a function or a string
    let calls = 0;
    const applied = create({
        doesOptInApply: () => {
            calls += 1;
            return true;
        },
    });
    assert.deepEqual(
        [calls, applied.doesOptInApply, applied.isApproved('aa')],
        [1, true, false],
        'function is called once',
    );
    assert.true(create({ doesOptInApply: 'true' }).doesOptInApply, 'string true');
    assert.false(create({ doesOptInApply: 'false' }).doesOptInApply, 'string false');

    // a callback waits for the decision if nothing is pre-approved
    const pending = create({ doesOptInApply: true });
    const waiting = [];
    pending.fetchPermissions((permissions) => waiting.push(permissions.aa));
    pending.approve('aa', true);
    assert.deepEqual(waiting, [], 'not called before the decision is completed');
    pending.complete();
    pending.deny('aa');
    assert.deepEqual(waiting, [true], 'called once');
    const preApproved = [];
    create({ doesOptInApply: true, preOptInApprovals: {} }).fetchPermissions((p) => preApproved.push(p.aa));
    assert.deepEqual(preApproved, [false], 'called at once with pre-approved categories');

    // checks without categories, and listeners, as the library
    const service = create({ doesOptInApply: true, preOptInApprovals: { aa: true } });
    assert.false(service.isApproved(), 'not all categories are approved');
    assert.true(service.isPreApproved(), 'all pre-approved categories');
    service.approveAll();
    assert.true(service.isApproved(), 'all categories are approved');
    const listened = [];
    const listener = (permissions) => listened.push(permissions.aa);
    service.on('complete', listener);
    service.off('complete');
    service.deny('aa');
    service.off('complete', listener);
    service.approve('aa');
    assert.deepEqual(listened, [false], 'off() removes only the listener which is passed');
    assert.throws(() => service.on('complete', 'not a function'), /Callback should be a function/, 'on() throws');

    // `"false"` is no pre-approvals, and `approveAll(true)` is deferred, as the library
    const notPreApproved = create({ doesOptInApply: true, preOptInApprovals: 'false' });
    const deferred = [];
    notPreApproved.fetchPermissions((permissions) => deferred.push(permissions.aa));
    assert.deepEqual(deferred, [], 'callback waits for the decision');
    notPreApproved.approveAll(true);
    assert.deepEqual([notPreApproved.status, notPreApproved.isApproved('aa')], ['changed', false], 'approveAll(true)');
    notPreApproved.deny('aa', true);
    notPreApproved.complete();
    assert.deepEqual(deferred, [false], 'decision completed after the batch');
    assert.true(notPreApproved.isApproved('target'), 'other categories are approved');
    notPreApproved.denyAll(true);
    assert.strictEqual(notPreApproved.status, 'changed', 'denyAll(true)');

    // a provider of the page which throws: the decision of the visitor is not known, so nothing is approved,
    // while the library throws
    const failing = () => {
        throw new Error('error of the page');
    };
    let failed = create({ doesOptInApply: failing, preOptInApprovals: { aa: true } });
    assert.deepEqual(
        [failed.doesOptInApply, failed.isApproved('aa'), failed.isApproved('ecid'), failed.status],
        [true, false, false, 'pending'],
        'doesOptInApply() which throws',
    );
    failed = create({ doesOptInApply: true, preOptInApprovals: { aa: true }, previousPermissions: failing });
    assert.deepEqual(
        [failed.doesOptInApply, failed.isApproved('aa'), failed.status],
        [true, false, 'pending'],
        'previousPermissions() which throws, also for a pre-approved category',
    );
    // as the library, which then throws as well: the getter is read again for the instance
    const config = {};
    Object.defineProperty(config, 'doesOptInApply', { enumerable: true, get: failing });
    assert.throws(() => create(config), /error of the page/, 'getter of the configuration which throws');
    assert.false(window.adobe.optIn.isApproved('aa'), 'nothing is approved then');

    // as the library, only own enumerable properties of the configuration are read
    class Config {
        // eslint-disable-next-line class-methods-use-this
        previousPermissions() {
            return { aa: true };
        }
    }
    const instance = new Config();
    instance.doesOptInApply = true;
    const inherited = create(instance);
    assert.deepEqual([inherited.isApproved('aa'), inherited.status], [false, 'pending'], 'method of the prototype');
    assert.false(create(Object.create({ doesOptInApply: true })).doesOptInApply, 'inherited property');
    const hidden = {};
    Object.defineProperty(hidden, 'doesOptInApply', { value: true });
    assert.false(create(hidden).doesOptInApply, 'property which is not enumerable');
});

test('adobe.optIn: deferred changes, listeners', (assert) => {
    run();
    window.Visitor.getInstance(ORG);
    const { optIn } = window.adobe;
    const state = () => [optIn.permissions.aa, optIn.status, optIn.isPending, optIn.isComplete];
    assert.deepEqual(state(), [true, 'pending', true, false], 'initial state of VisitorAPI 5.5.0');
    optIn.deny('aa', true);
    assert.deepEqual(state(), [true, 'changed', false, false], 'deferred: not applied, not pending, not complete');
    optIn.complete();
    assert.deepEqual(state(), [false, 'complete', false, true], 'applied by complete()');
    optIn.approve('aa', true);
    // as the library, whose permissions are the changed ones after the first completion
    assert.deepEqual(state(), [true, 'changed', false, false], 'another deferred change is not complete');
    optIn.complete();
    assert.deepEqual(state(), [true, 'complete', false, true], 'applied by complete()');

    const calls = [];
    const removeFirst = optIn.on('complete', () => {
        calls.push('first');
        removeFirst();
    });
    optIn.on('complete', () => calls.push('second'));
    const context = {};
    optIn.on('complete', function listener() {
        calls.push(this === context ? 'context' : 'no context');
    }, context);
    optIn.deny('target');
    assert.deepEqual(calls, ['first', 'second', 'context'], 'all listeners called, also after one removes itself');
    optIn.approve('target');
    assert.deepEqual(calls.slice(3), ['second', 'context'], 'removed listener not called again');
});

test('Works with AppMeasurement, which reads the visitor and opt-in', async (assert) => {
    run();
    run('adobe-analytics');
    const s = window.s_gi('rsid');
    s.visitor = window.Visitor.getInstance(ORG);
    assert.ok(s.isReadyToTrack(), 'ready to track');
    assert.strictEqual(s.visitor, window.s_c_il.find((item) => item._c === 'Visitor'), 'one visitor in s_c_il');
    assert.strictEqual(window.s_gi('rsid'), s, 's_gi() skips the visitor in s_c_il');
    await sleep(10);
});

test('Keeps the real library and other parts of window.adobe, in any order with adobe-target', (assert) => {
    const RealVisitor = function RealVisitor() {};
    window.Visitor = RealVisitor;
    window.adobe = { OptInCategories: { custom: 'x' } };
    run();
    assert.strictEqual(window.Visitor, RealVisitor, 'Visitor kept');
    assert.deepEqual(window.adobe.OptInCategories, { custom: 'x' }, 'OptInCategories kept');

    clearGlobalProps(...GLOBALS);
    run('adobe-target');
    run();
    window.Visitor.getInstance(ORG);
    assert.strictEqual(typeof window.adobe.target.getOffer, 'function', 'adobe.target kept, target first');
    assert.strictEqual(typeof window.adobe.optIn.isApproved, 'function', 'optIn added');

    clearGlobalProps(...GLOBALS);
    run();
    window.Visitor.getInstance(ORG);
    const { optIn } = window.adobe;
    run('adobe-target');
    assert.strictEqual(window.adobe.optIn, optIn, 'optIn kept, visitor first');
    assert.strictEqual(typeof window.adobe.target.getOffer, 'function', 'target added');

    const first = window.Visitor;
    run();
    assert.strictEqual(window.Visitor, first, 'second run keeps the first Visitor');
});

test('getInstance() sets a session AMCV cookie with a dummy id, not taken over by the library', (assert) => {
    removeAmcvCookies();
    run();
    const DUMMY = `MCMID|${'0'.repeat(38)}`;
    window.Visitor.getInstance(ORG);
    assert.ok(document.cookie.split('; ').includes(`AMCV_${ORG}=${DUMMY}`), 'raw name, dummy id');
    assert.strictEqual(window.Visitor.getInstance(ORG).getMarketingCloudVisitorID(), '', 'the id stays empty');

    // cookies of the organization are kept, also the one of the library with the encoded name
    removeAmcvCookies();
    document.cookie = `AMCV_${encodeURIComponent('XYZ@AdobeOrg')}=123%7CMCMID%7C42; path=/`;
    window.Visitor.getInstance('XYZ@AdobeOrg');
    assert.notOk(document.cookie.includes('AMCV_XYZ@AdobeOrg='), 'not set if the library has set its cookie');
    document.cookie = 'AMCV_QRS@AdobeOrg=MCMID|7; path=/';
    window.Visitor.getInstance('QRS@AdobeOrg');
    assert.ok(document.cookie.split('; ').includes('AMCV_QRS@AdobeOrg=MCMID|7'), 'an existing one is not replaced');
});

test('No requests, cookies or storage items, except the dummy AMCV cookie', async (assert) => {
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
        const visitor = window.Visitor.getInstance(ORG, { trackingServer: 'metrics.example.org' });
        visitor.getMarketingCloudVisitorID(() => {});
        visitor.getVisitorValues(() => {});
        visitor.idSyncByURL({ url: 'https://example.org/' });
        visitor.setCustomerIDs({ u: { id: '1' } });
        visitor.cookieWrite('c', 'v');
        visitor.resetState();
        window.adobe.optIn.approveAll();
        await sleep(20);

        assert.deepEqual(calls, [
            `cookie:AMCV_${ORG}=MCMID|${'0'.repeat(38)}; path=/`,
        ], 'only the session cookie with the dummy id, no request, storage or element creation');
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
