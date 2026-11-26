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
        .filter((cookieName) => cookieName.startsWith('AMCV_') || cookieName.startsWith('AMCVS_'))
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
    assert.true(visitor instanceof window.Visitor, 'instance of Visitor, as the library');
    assert.strictEqual(visitor.loadTimeout, 30000, 'default loadTimeout');
    const configured = window.Visitor.getInstance('DEF@AdobeOrg', { loadTimeout: 500, _c: 'other' });
    assert.strictEqual(configured.loadTimeout, 500, 'loadTimeout of the configuration, as the library');
    assert.strictEqual(configured._c, 'Visitor', 'not other properties of the instance');
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
        'getSupplementalDataID',
    ].forEach((method) => {
        assert.strictEqual(visitor[method](), '', `${method}() returns an empty id`);
    });
    assert.strictEqual(visitor.getOptOut(), 'NONE', 'getOptOut(), as the library without an opt-out');
    assert.strictEqual(visitor.isOptedOut(), false, 'isOptedOut(), as the library without an opt-out');
    assert.strictEqual(visitor.isOptedOut(null, window.Visitor.OptOut.GLOBAL), false, 'isOptedOut() of a scope');
    assert.strictEqual(visitor.isClientSideMarketingCloudVisitorID(), null, 'isClientSideMarketingCloudVisitorID()');
    assert.strictEqual(visitor.isAllowed(), true, 'isAllowed()');
    assert.strictEqual(visitor.appendVisitorIDsTo('https://x.org/p?a=1'), 'https://x.org/p?a=1', 'no adobe_mc');
    assert.strictEqual(visitor.appendSupplementalDataIDTo('https://x.org/p', 'sdid'), 'https://x.org/p', 'no sdid');

    const calls = [];
    visitor.getMarketingCloudVisitorID((id) => calls.push(['mcid', id]));
    visitor.getAnalyticsVisitorID((id) => calls.push(['aid', id]));
    visitor.getVisitorValues((values) => calls.push(['values', values]));
    visitor.getVisitorValues((values) => calls.push(['mcmid', values]), [visitor.FIELDS.MCMID]);
    visitor.isOptedOut((optedOut) => calls.push(['optedOut', optedOut]));
    visitor.getOptOut((optOut) => calls.push(['optOut', optOut]));
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
            MCOPTOUT: false,
            MCAID: '',
            MCAAMLH: '',
            MCAAMB: '',
        }],
        ['mcmid', { MCMID: '' }],
        ['optedOut', false],
        ['optOut', 'NONE'],
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

test('getInstance() sets the AMCV cookie only once the ECID category is approved, as the library', (assert) => {
    // the cases are the ones of the real library 5.5.0, which writes its cookie only then
    const hasCookie = (orgId) => document.cookie.split('; ').some((cookie) => cookie.startsWith(`AMCV_${orgId}=`));
    const check = (orgId, config, steps = []) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        removeAmcvCookies();
        run();
        window.Visitor.getInstance(orgId, config);
        const result = [hasCookie(orgId)];
        const { optIn, OptInCategories } = window.adobe;
        steps.forEach((step) => {
            step(optIn, OptInCategories);
            result.push(hasCookie(orgId));
        });
        window.Visitor.getInstance(orgId, config);
        result.push(hasCookie(orgId));
        return result;
    };
    assert.deepEqual(check('A@AdobeOrg'), [true, true], 'without opt-in');
    assert.deepEqual(check('B@AdobeOrg', { doesOptInApply: true }, []), [false, false], 'not before consent');
    assert.deepEqual(
        check('C@AdobeOrg', { doesOptInApply: true }, [(optIn, C) => optIn.approve(C.ECID)]),
        [false, true, true],
        'once ECID is approved',
    );
    assert.deepEqual(
        check('D@AdobeOrg', { doesOptInApply: true }, [(optIn, C) => optIn.approve(C.TARGET)]),
        [false, false, false],
        'not if another category is approved',
    );
    assert.deepEqual(
        check('E@AdobeOrg', { doesOptInApply: true }, [(optIn) => optIn.approveAll()]),
        [false, true, true],
        'once all categories are approved',
    );
    assert.deepEqual(
        check('F@AdobeOrg', { doesOptInApply: true }, [
            (optIn, C) => optIn.approve(C.ECID, true),
            (optIn) => optIn.complete(),
        ]),
        [false, false, true, true],
        'once a deferred approval is completed',
    );
    assert.deepEqual(
        check('G@AdobeOrg', { doesOptInApply: true, preOptInApprovals: { ecid: true } }, []),
        [true, true],
        'pre-approved',
    );
    assert.deepEqual(
        check('H@AdobeOrg', { doesOptInApply: true, previousPermissions: { ecid: true } }, []),
        [true, true],
        'approved by the saved decision of the visitor',
    );

    assert.deepEqual(
        check('K@AdobeOrg', { doesOptInApply: true }, [
            (optIn, C) => optIn.deny(C.ECID),
            (optIn, C) => optIn.approve(C.ECID),
        ]),
        [false, false, false, false],
        'not if ECID is approved after it has been denied, as the instance is disabled then',
    );
    assert.deepEqual(
        check('L@AdobeOrg', { doesOptInApply: true }, [
            (optIn, C) => optIn.deny(C.ECID),
            (optIn, C) => optIn.approve(C.ECID, true),
            () => window.Visitor.getInstance('L@AdobeOrg', { doesOptInApply: true }),
        ]),
        [false, false, false, false, false],
        'not by getInstance() for an existing instance, also with a deferred approval',
    );
    assert.deepEqual(
        check('M@AdobeOrg', { doesOptInApply: true, isIabContext: true }, [(optIn, C) => optIn.approve(C.ECID)]),
        [false, false, false],
        'not in IAB context, as the consent of the IAB platform is not known',
    );
    assert.deepEqual(
        check('N@AdobeOrg', { doesOptInApply: true, isIabContext: true, preOptInApprovals: { ecid: true } }),
        [false, false],
        'not in IAB context if ECID is pre-approved either',
    );
    assert.deepEqual(check('O@AdobeOrg', { useLocalStorage: true }), [false, false], 'not with useLocalStorage');
    assert.deepEqual(check('P@AdobeOrg', { cookieLifetime: 'none' }), [false, false], 'not with cookieLifetime NONE');

    // an instance created after the visitor has denied ECID is not set later either
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('T@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.deny(window.adobe.OptInCategories.ECID);
    window.Visitor.getInstance('U@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
    assert.false(hasCookie('U@AdobeOrg'), 'not for an instance created after ECID has been denied');

    // an opt-in service of the page without its API is a consent which is not known
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.adobe.optIn = { doesOptInApply: true, permissions: { ecid: false } };
    window.Visitor.getInstance('Q@AdobeOrg');
    assert.false(hasCookie('Q@AdobeOrg'), 'not with an opt-in service without isApproved()');

    // an instance waits for the opt-in service of its creation, but the decision is the one of the current service
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('R@AdobeOrg', { doesOptInApply: true });
    const firstOptIn = window.adobe.optIn;
    delete window.adobe.optIn;
    window.Visitor.getInstance('S@AdobeOrg', { doesOptInApply: true });
    firstOptIn.approve(window.adobe.OptInCategories.ECID);
    assert.false(hasCookie('R@AdobeOrg'), 'not while the current opt-in service is not complete');
    window.adobe.optIn.deny(window.adobe.OptInCategories.ECID);
    firstOptIn.approve(window.adobe.OptInCategories.ECID);
    assert.deepEqual(
        [hasCookie('R@AdobeOrg'), hasCookie('S@AdobeOrg')],
        [false, false],
        'not if the current opt-in service denies ECID',
    );

    // and it waits while the current service is not complete
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('PEND@AdobeOrg', { doesOptInApply: true });
    const pendingOptIn = window.adobe.optIn;
    delete window.adobe.optIn;
    window.Visitor.getInstance('CUR@AdobeOrg', { doesOptInApply: true });
    pendingOptIn.approve(window.adobe.OptInCategories.ECID);
    window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
    assert.false(hasCookie('PEND@AdobeOrg'), 'not by a completion of the current service');
    pendingOptIn.deny(window.adobe.OptInCategories.TARGET);
    assert.true(hasCookie('PEND@AdobeOrg'), 'by the next completion of its service, as the current one approves ECID');

    // the configuration of each instance, as the library
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    // The library writes the id only while ECID is approved by `adobe.optIn`, also for an instance to which
    // opt-in does not apply, whose cookie has no id otherwise; such an instance does not wait for the decision.
    window.Visitor.getInstance('V@AdobeOrg', { doesOptInApply: true });
    window.Visitor.getInstance('W@AdobeOrg', { doesOptInApply: false });
    window.Visitor.getInstance('Y@AdobeOrg');
    window.Visitor.getInstance('Z@AdobeOrg', {
        doesOptInApply() {
            throw new Error('error of the page');
        },
    });
    const orgs = ['V', 'W', 'Y', 'Z'];
    const beforeApproval = orgs.map((org) => hasCookie(`${org}@AdobeOrg`));
    window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
    const afterApproval = orgs.map((org) => hasCookie(`${org}@AdobeOrg`));
    window.Visitor.getInstance('X@AdobeOrg', { doesOptInApply: 'false' });
    assert.deepEqual(beforeApproval, [false, false, false, false], 'no cookie while ECID is not approved');
    assert.deepEqual(
        afterApproval,
        [true, false, false, false],
        'only an instance with opt-in waits for the approval; none if its configuration cannot be read',
    );
    assert.true(hasCookie('X@AdobeOrg'), 'at once for an instance created while ECID is approved');

    // as the library, `isPreApproved()` reads the pre-approvals of the configuration, which the page may change
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    const preOptInApprovals = { ecid: true };
    window.Visitor.getInstance('PRE@AdobeOrg', { doesOptInApply: true, preOptInApprovals });
    preOptInApprovals.ecid = false;
    assert.deepEqual(
        [window.adobe.optIn.isPreApproved('ecid'), window.adobe.optIn.isApproved('ecid')],
        [false, true],
        'isPreApproved() follows the object of the configuration, isApproved() does not',
    );
    assert.deepEqual(
        check('IAB1@AdobeOrg', { doesOptInApply: true, isIabContext: () => false }, [
            (optIn, C) => optIn.approve(C.ECID),
        ]),
        [false, true, true],
        'isIabContext which is a function is called',
    );

    // the decision which the library has stored, e.g. on another page of the site
    const withStored = (orgId, stored, config) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        removeAmcvCookies();
        document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify(stored))}; path=/`;
        run();
        window.Visitor.getInstance(orgId, config);
        const result = [hasCookie(orgId), window.adobe.optIn.status];
        document.cookie = 'adobeujs-optin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return result;
    };
    const storage = { doesOptInApply: true, isOptInStorageEnabled: true };
    assert.deepEqual(
        withStored('ST1@AdobeOrg', { ecid: false }, { ...storage, preOptInApprovals: { ecid: true } }),
        [false, 'complete'],
        'a stored denial overrides a pre-approval',
    );
    assert.deepEqual(
        withStored('ST2@AdobeOrg', { ecid: true }, { ...storage, preOptInApprovals: { ecid: false } }),
        [true, 'complete'],
        'a stored approval',
    );
    assert.deepEqual(
        withStored('ST3@AdobeOrg', { ecid: false }, { ...storage, previousPermissions: { ecid: true } }),
        [false, 'complete'],
        'a stored denial overrides the previous permissions',
    );
    assert.deepEqual(
        withStored('ST4@AdobeOrg', { ecid: true }, { doesOptInApply: true }),
        [false, 'pending'],
        'not read without isOptInStorageEnabled',
    );

    // the decision of the visitor is stored as by the library, so a revocation holds on the next page
    const removeOptInCookies = () => {
        ['adobeujs-optin', 'sale%off'].forEach((cookieName) => {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        });
    };
    const readStored = () => {
        const match = document.cookie.match(/(?:^|; )adobeujs-optin=([^;]*)/);
        return match ? JSON.parse(decodeURIComponent(match[1])) : null;
    };
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true, custom: 1 }))}; path=/`;
    run();
    window.Visitor.getInstance('REV@AdobeOrg', storage);
    window.adobe.optIn.deny('ecid');
    const storedAfterDenial = readStored();
    // the next page
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('REV@AdobeOrg', storage);
    const nextPage = [window.adobe.optIn.isApproved('ecid'), hasCookie('REV@AdobeOrg')];
    removeOptInCookies();
    assert.strictEqual(storedAfterDenial.ecid, false, 'the denial is stored');
    assert.notOk(document.cookie.includes('TEST_AMCV_COOKIE_WRITE'), 'no test cookie of the domain is left');
    assert.strictEqual(storedAfterDenial.custom, 1, 'merged into the stored values, as the library');
    assert.deepEqual(nextPage, [false, false], 'and holds on the next page');
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    run();
    window.Visitor.getInstance('NOSTORE@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.deny('ecid');
    assert.strictEqual(readStored(), null, 'nothing is stored without isOptInStorageEnabled');

    // as the library, the stored decision is read after the function of previousPermissions is called,
    // e.g. one which stores a revocation itself
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: true }))}; path=/`;
    run();
    window.Visitor.getInstance('PROVIDER@AdobeOrg', {
        ...storage,
        previousPermissions: () => {
            document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: false }))}; path=/`;
            return { ecid: false };
        },
    });
    const afterProvider = [window.adobe.optIn.isApproved('ecid'), hasCookie('PROVIDER@AdobeOrg')];
    window.adobe.optIn.approve('target');
    const storedAfterProvider = readStored();
    removeOptInCookies();
    assert.deepEqual(afterProvider, [false, false], 'a decision stored by previousPermissions() is read');
    assert.deepEqual(
        [storedAfterProvider.ecid, storedAfterProvider.target],
        [false, true],
        'and is not replaced by the older one when the next decision is stored',
    );

    // cookies which cannot be read, e.g. in a sandboxed frame: the stored decision is not known, as the library
    // throws then, so a pre-approval of the configuration is not applied
    const getPreApproved = (isReadable) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        removeAmcvCookies();
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
            window.Visitor.getInstance('SANDBOX@AdobeOrg', { ...storage, preOptInApprovals: { ecid: true } });
        } finally {
            delete document.cookie;
        }
        return [window.adobe.optIn.isApproved('ecid'), hasCookie('SANDBOX@AdobeOrg')];
    };
    assert.deepEqual(getPreApproved(true), [true, true], 'pre-approval with cookies which can be read');
    assert.deepEqual(getPreApproved(false), [false, false], 'not with cookies which cannot be read');

    // the next organization while the stored decision cannot be decoded
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    document.cookie = 'adobeujs-optin=%E0%A4%A; path=/';
    run();
    window.Visitor.getInstance('BADA@AdobeOrg', { ...storage, doesOptInApply: false });
    window.Visitor.getInstance('BADB@AdobeOrg', { ...storage, doesOptInApply: false });
    const badOrgs = [hasCookie('BADA@AdobeOrg'), hasCookie('BADB@AdobeOrg')];
    removeOptInCookies();
    assert.deepEqual(badOrgs, [false, false], 'no cookie for any organization while it cannot be decoded');

    // nothing is stored with optInStorageExpiry NONE, as the library
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    run();
    window.Visitor.getInstance('NONE@AdobeOrg', { ...storage, optInStorageExpiry: 'NONE' });
    window.adobe.optIn.deny('ecid');
    assert.strictEqual(readStored(), null, 'nothing stored with optInStorageExpiry NONE');

    // as the library, other fields of the permissions of the configuration are stored with them
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    run();
    window.Visitor.getInstance('EXTRA@AdobeOrg', { ...storage, previousPermissions: { ecid: true, reference: 'r1' } });
    window.adobe.optIn.deny('ecid');
    const storedWithExtra = readStored();
    removeOptInCookies();
    assert.deepEqual(
        [storedWithExtra.ecid, storedWithExtra.reference],
        [false, 'r1'],
        'other fields of the permissions are kept',
    );

    // as the library, each setting of the configuration is read twice, e.g. a getter which fails then
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    let iabReads = 0;
    const withGetter = { doesOptInApply: true };
    Object.defineProperty(withGetter, 'isIabContext', {
        enumerable: true,
        get() {
            iabReads += 1;
            if (iabReads > 2) {
                throw new Error('error of the page');
            }
            return false;
        },
    });
    const visitorOfGetter = window.Visitor.getInstance('GETTER@AdobeOrg', withGetter);
    assert.deepEqual([iabReads, visitorOfGetter.configs.isIabContext], [2, false], 'a getter is read twice');

    // the stored decision is found by its name as it is, and one which cannot be decoded is not known
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    document.cookie = 'sale%off=1; path=/';
    document.cookie = `adobeujs-optin=${encodeURIComponent(JSON.stringify({ ecid: false }))}; path=/`;
    run();
    window.Visitor.getInstance('LOOK@AdobeOrg', { ...storage, preOptInApprovals: { ecid: true } });
    const afterLookAlike = hasCookie('LOOK@AdobeOrg');
    removeOptInCookies();
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    document.cookie = 'adobeujs-optin=%E0%A4%A; path=/';
    run();
    window.Visitor.getInstance('BAD@AdobeOrg', { ...storage, preOptInApprovals: { ecid: true } });
    const afterBadValue = hasCookie('BAD@AdobeOrg');
    removeOptInCookies();
    assert.false(afterLookAlike, 'a stored denial after a cookie whose name cannot be decoded');
    assert.false(afterBadValue, 'no cookie if the stored decision cannot be decoded');

    // an instance keeps the `adobe` object of its creation, as the library
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('NS1@AdobeOrg', { doesOptInApply: true });
    const oldOptIn = window.adobe.optIn;
    window.adobe = {};
    window.Visitor.getInstance('NS2@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.approve('ecid');
    oldOptIn.deny('ecid');
    assert.deepEqual(
        [hasCookie('NS1@AdobeOrg'), hasCookie('NS2@AdobeOrg')],
        [false, true],
        'the opt-in service of the adobe object of the instance',
    );

    // the IAB context of the configuration of the instance when it is decided
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    const iabLater = window.Visitor.getInstance('IAB2@AdobeOrg', { doesOptInApply: true });
    iabLater.configs.isIabContext = true;
    window.adobe.optIn.approve('ecid');
    assert.false(hasCookie('IAB2@AdobeOrg'), 'not in IAB context set before the decision');

    // as the library, the setting is read once, into the copy of the configuration of the instance
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    let iabCalls = 0;
    window.Visitor.getInstance('IAB3@AdobeOrg', {
        doesOptInApply: true,
        isIabContext: () => {
            iabCalls += 1;
            return iabCalls === 1;
        },
    });
    window.adobe.optIn.approve('ecid');
    assert.deepEqual([iabCalls, hasCookie('IAB3@AdobeOrg')], [1, false], 'a function is called once');
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    const options = { doesOptInApply: true, isIabContext: false };
    window.Visitor.getInstance('IAB4@AdobeOrg', options);
    options.isIabContext = true;
    window.adobe.optIn.approve('ecid');
    assert.true(hasCookie('IAB4@AdobeOrg'), 'a change of the options of the page after the call is not read');

    // the settings of the instance when the cookie would be written
    const later = (orgId, setting) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        removeAmcvCookies();
        run();
        const visitor = window.Visitor.getInstance(orgId, { doesOptInApply: true });
        Object.assign(visitor, setting);
        window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
        return hasCookie(orgId);
    };
    assert.false(later('LS@AdobeOrg', { useLocalStorage: true }), 'not with useLocalStorage set later');
    assert.false(later('CL@AdobeOrg', { cookieLifetime: 'NONE' }), 'not with cookieLifetime NONE set later');

    // each organization which has waited for the approval gets its cookie
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    removeAmcvCookies();
    run();
    window.Visitor.getInstance('I@AdobeOrg', { doesOptInApply: true });
    window.Visitor.getInstance('J@AdobeOrg', { doesOptInApply: true });
    window.adobe.optIn.approve(window.adobe.OptInCategories.ECID);
    assert.deepEqual([hasCookie('I@AdobeOrg'), hasCookie('J@AdobeOrg')], [true, true], 'all waiting organizations');
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

test('Honors the opt-out of the visitor saved in the cookie of the organization, as the library', async (assert) => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const past = Math.floor(Date.now() / 1000) - 86400;
    // as the library writes it: the name and the value are encoded
    const saveCookie = (orgId, value) => {
        document.cookie = `AMCV_${encodeURIComponent(orgId)}=${encodeURIComponent(value)}; path=/`;
    };
    const check = (orgId, config) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        run();
        const visitor = window.Visitor.getInstance(orgId, config);
        const values = [];
        visitor.getVisitorValues((fields) => values.push(fields.MCOPTOUT));
        return {
            visitor,
            values,
            state: [visitor.getOptOut(), visitor.isOptedOut(), visitor.isOptedOut(null, 'target')],
        };
    };

    saveCookie('OUT@AdobeOrg', `-1124106680|MCMID|123|MCOPTOUT-${future}s|global|vVersion|5.5.0`);
    document.cookie = `AMCVS_${encodeURIComponent('OUT@AdobeOrg')}=1; path=/`;
    const optedOut = check('OUT@AdobeOrg');
    assert.deepEqual(optedOut.state, ['global', true, true], 'global opt-out');
    const calls = [];
    optedOut.visitor.isOptedOut((value) => calls.push(value));
    optedOut.visitor.getOptOut((value) => calls.push(value));
    await sleep(10);
    assert.deepEqual(optedOut.values, [true], 'MCOPTOUT of getVisitorValues()');
    assert.deepEqual(calls, [true, 'global'], 'callbacks');

    saveCookie('SCOPE@AdobeOrg', `MCOPTOUT-${future}|aam,target|vVersion|5.5.0`);
    assert.deepEqual(check('SCOPE@AdobeOrg').state, ['aam,target', false, true], 'opt-out of some scopes');

    saveCookie('NOEXPIRY@AdobeOrg', 'MCOPTOUT|global');
    assert.deepEqual(check('NOEXPIRY@AdobeOrg').state, ['global', true, true], 'without an expiry');

    // ignored, as by the library
    saveCookie('EXPIRED@AdobeOrg', `MCOPTOUT-${past}|global`);
    assert.deepEqual(check('EXPIRED@AdobeOrg').state, ['NONE', false, false], 'expired');
    saveCookie('SESSION@AdobeOrg', `MCOPTOUT-${future}s|global`);
    assert.deepEqual(check('SESSION@AdobeOrg').state, ['NONE', false, false], 'expired with the session');
    saveCookie('NONE@AdobeOrg', `MCOPTOUT-${future}|NONE`);
    const notOptedOut = check('NONE@AdobeOrg');
    await sleep(10);
    assert.deepEqual([notOptedOut.state, notOptedOut.values], [['NONE', false, false], [false]], 'NONE');
    assert.deepEqual(check('OTHER@AdobeOrg').state, ['NONE', false, false], 'cookie of another organization');
    document.cookie = 'AMCV_RAW@AdobeOrg=MCOPTOUT|global; path=/';
    assert.deepEqual(check('RAW@AdobeOrg').state, ['NONE', false, false], 'name which is not encoded');

    // an opt-out saved after the instance is created, e.g. while the consent of the visitor is pending
    const late = check('LATE@AdobeOrg', { doesOptInApply: true });
    assert.deepEqual(late.state, ['NONE', false, false], 'no opt-out yet');
    saveCookie('LATE@AdobeOrg', `MCOPTOUT-${future}|global`);
    window.adobe.optIn.approveAll();
    assert.deepEqual(
        [late.visitor.getOptOut(), late.visitor.isOptedOut()],
        ['global', true],
        'opt-out saved later is honored',
    );
    const lateValues = [];
    late.visitor.getVisitorValues((fields) => lateValues.push(fields.MCOPTOUT));
    await sleep(10);
    assert.deepEqual(lateValues, [true], 'MCOPTOUT of an opt-out saved later');

    // as in the library, an opt-out which has been read is kept while the page is open
    const removeCookie = (orgId) => {
        document.cookie = `AMCV_${encodeURIComponent(orgId)}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    };
    const stateOf = (visitor) => [visitor.getOptOut(), visitor.isOptedOut(), visitor.isOptedOut(null, 'target')];
    saveCookie('KEPT@AdobeOrg', `MCOPTOUT-${future}|global`);
    const kept = check('KEPT@AdobeOrg');
    removeCookie('KEPT@AdobeOrg');
    assert.deepEqual(stateOf(kept.visitor), ['global', true, true], 'kept after its cookie is removed');
    saveCookie('KEPT@AdobeOrg', `MCOPTOUT-${future}|NONE`);
    assert.deepEqual(stateOf(kept.visitor), ['global', true, true], 'kept after it is replaced by NONE');
    saveCookie('KEPT@AdobeOrg', `MCOPTOUT-${future}|aam`);
    assert.deepEqual(stateOf(kept.visitor), ['global', true, true], 'not narrowed');
    // as the library, the opt-out is read when the instance is created, not only when the page asks for it
    saveCookie('CREATED@AdobeOrg', `MCOPTOUT-${future}|global`);
    clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
    run();
    const created = window.Visitor.getInstance('CREATED@AdobeOrg');
    removeCookie('CREATED@AdobeOrg');
    assert.deepEqual(stateOf(created), ['global', true, true], 'read before its cookie is removed');

    saveCookie('WIDER@AdobeOrg', `MCOPTOUT-${future}|aam`);
    const wider = check('WIDER@AdobeOrg');
    assert.deepEqual(stateOf(wider.visitor), ['aam', false, false], 'opt-out of a scope');
    saveCookie('WIDER@AdobeOrg', `MCOPTOUT-${future}|target`);
    assert.deepEqual(stateOf(wider.visitor), ['aam,target', false, true], 'scopes are added');
    assert.deepEqual(
        [wider.visitor.getOptOut(), wider.visitor.getOptOut()],
        ['aam,target', 'aam,target'],
        'each scope is added once',
    );
    saveCookie('WIDER@AdobeOrg', `MCOPTOUT-${future}|target,aam,campaign`);
    assert.strictEqual(wider.visitor.getOptOut(), 'aam,target,campaign', 'only new scopes of a list are added');
    saveCookie('WIDER@AdobeOrg', `MCOPTOUT-${future}|global`);
    assert.deepEqual(stateOf(wider.visitor), ['global', true, true], 'widened to the global one');

    // names of the configuration, as the library
    document.cookie = `AMCV_test_visitor=${encodeURIComponent(`MCOPTOUT-${future}s|global`)}; path=/`;
    document.cookie = 'AMCVS_test_session=1; path=/';
    const names = { cookieName: 'AMCV_test_visitor', sessionCookieName: 'AMCVS_test_session' };
    const named = check('NAMED@AdobeOrg', names);
    assert.deepEqual(named.state, ['global', true, true], 'cookieName and sessionCookieName of the configuration');
    assert.deepEqual(
        [named.visitor.cookieName, named.visitor.sessionCookieName],
        ['AMCV_test_visitor', 'AMCVS_test_session'],
        'names of the instance',
    );
    assert.deepEqual(
        check('NAMED@AdobeOrg', { cookieName: 'AMCV_test_visitor' }).state,
        ['NONE', false, false],
        'expired without the session cookie of the default name',
    );
    assert.strictEqual(check('NAMED@AdobeOrg', { cookieName: 5 }).visitor.cookieName, 'AMCV_NAMED@AdobeOrg', 'default');

    // names inherited from the prototype, e.g. set by the page, are not used, as by the library
    const checkInherited = (setting, value) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        run();
        window.Visitor.prototype[setting] = value;
        try {
            const visitor = window.Visitor.getInstance('OUT@AdobeOrg');
            return [visitor.getOptOut(), visitor.isOptedOut(), visitor[setting]];
        } finally {
            delete window.Visitor.prototype[setting];
        }
    };
    assert.deepEqual(
        checkInherited('cookieName', 'AMCV_inherited'),
        ['global', true, 'AMCV_OUT@AdobeOrg'],
        'cookieName of the prototype',
    );
    assert.deepEqual(
        checkInherited('sessionCookieName', 'AMCVS_inherited'),
        ['global', true, 'AMCVS_OUT@AdobeOrg'],
        'sessionCookieName of the prototype, i.e. a session opt-out',
    );

    // names of the configuration, also if a setter of the prototype stores them elsewhere
    const checkSetter = (setting, change = (value) => value) => {
        clearGlobalProps('Visitor', 'adobe', 's_c_il', 's_c_in');
        run();
        Object.defineProperty(window.Visitor.prototype, setting, {
            configurable: true,
            get() {
                return this[`stored_${setting}`];
            },
            set(value) {
                this[`stored_${setting}`] = change(value);
            },
        });
        try {
            const visitor = window.Visitor.getInstance('NAMED@AdobeOrg', names);
            return [visitor.getOptOut(), visitor.isOptedOut()];
        } finally {
            delete window.Visitor.prototype[setting];
        }
    };
    assert.deepEqual(checkSetter('cookieName'), ['global', true], 'cookieName of a setter of the prototype');
    assert.deepEqual(checkSetter('sessionCookieName'), ['global', true], 'sessionCookieName of a setter');
    // a setter which changes the name, e.g. to lower case: the name of the instance is read, as by the library,
    // so the opt-out is found only in the cookie of the changed name
    document.cookie = 'AMCV_test_visitor=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `amcv_test_visitor=${encodeURIComponent(`MCOPTOUT-${future}s|global`)}; path=/`;
    document.cookie = 'amcvs_test_session=1; path=/';
    assert.deepEqual(
        checkSetter('cookieName', (value) => value.toLowerCase()),
        ['global', true],
        'cookieName changed by a setter',
    );
    // the session cookie of the default name is missing, so the opt-out is found only with the changed one
    document.cookie = `AMCV_test_visitor=${encodeURIComponent(`MCOPTOUT-${future}s|global`)}; path=/`;
    document.cookie = 'AMCVS_test_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    assert.deepEqual(
        checkSetter('sessionCookieName', (value) => value.toLowerCase()),
        ['global', true],
        'sessionCookieName changed by a setter',
    );
    ['amcv_test_visitor', 'amcvs_test_session'].forEach((cookieName) => {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });

    // `useLocalStorage`: the storages instead of cookies, as the library
    const storedName = 'AMCV_STORED@AdobeOrg';
    const storedSessionName = 'AMCVS_STORED@AdobeOrg';
    try {
        window.localStorage.setItem(storedName, `MCOPTOUT-${future}s|global|vVersion|5.5.0`);
        assert.deepEqual(
            check('STORED@AdobeOrg', { useLocalStorage: true }).state,
            ['NONE', false, false],
            'expired without the item of the session',
        );
        window.sessionStorage.setItem(storedSessionName, '1');
        assert.deepEqual(check('STORED@AdobeOrg', { useLocalStorage: true }).state, ['global', true, true], 'storages');
        assert.deepEqual(check('STORED@AdobeOrg', { useLocalStorage: 'true' }).state, ['global', true, true], 'string');
        let calls = 0;
        const fromFunction = check('STORED@AdobeOrg', {
            useLocalStorage: () => {
                calls += 1;
                return true;
            },
        });
        assert.deepEqual(fromFunction.state, ['global', true, true], 'function, as the library');
        assert.deepEqual([calls, fromFunction.visitor.useLocalStorage], [1, true], 'called once, result kept');
        assert.deepEqual(check('STORED@AdobeOrg', { useLocalStorage: 1 }).state, ['global', true, true], 'truthy');
        assert.deepEqual(
            check('STORED@AdobeOrg', { useLocalStorage: 'false' }).state,
            ['NONE', false, false],
            'string false is cookies',
        );
        const failing = check('STORED@AdobeOrg', {
            useLocalStorage: () => {
                throw new Error('error of the page');
            },
        });
        assert.deepEqual(failing.state, ['NONE', false, false], 'function which throws is cookies');
        assert.deepEqual(check('STORED@AdobeOrg').state, ['NONE', false, false], 'storages are not read otherwise');
        saveCookie('COOKIE@AdobeOrg', `MCOPTOUT-${future}|global`);
        assert.deepEqual(
            check('COOKIE@AdobeOrg', { useLocalStorage: true }).state,
            ['NONE', false, false],
            'cookies are not read with useLocalStorage',
        );
        assert.strictEqual(window.localStorage.length, 1, 'nothing is written to the storage');
    } finally {
        window.localStorage.removeItem(storedName);
        window.sessionStorage.removeItem(storedSessionName);
    }
});
