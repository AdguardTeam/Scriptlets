/* eslint-disable no-underscore-dangle, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-analytics';

const GLOBALS = [
    'AppMeasurement',
    'AppMeasurement_Module_ActivityMap',
    'AppMeasurement_Module_Test',
    's_gi',
    's_pgicq',
    's_giq',
    's_objectID',
    's_c_il',
    's_c_in',
    's',
];

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

test('Installs the globals of AppMeasurement, not the tracker s', (assert) => {
    runRedirect();
    assert.strictEqual(typeof window.AppMeasurement, 'function', 'AppMeasurement');
    assert.strictEqual(window.AppMeasurement.getInstance, window.s_gi, 'AppMeasurement.getInstance is s_gi');
    assert.strictEqual(typeof window.s_pgicq, 'function', 's_pgicq');
    assert.strictEqual(window.s_objectID, 0, 's_objectID');
    assert.strictEqual(typeof window.AppMeasurement_Module_ActivityMap, 'function', 'ActivityMap module');
    assert.strictEqual(window.s, undefined, 'no global s, as the library does not create it');
});

test('Instances as AppMeasurement 2.22', (assert) => {
    // VisitorAPI registers its instance in the same list
    const visitor = { _c: 'Visitor' };
    window.s_c_il = [visitor];
    window.s_c_in = 1;
    runRedirect();

    const s = new window.AppMeasurement('rsid1,rsid2');
    assert.strictEqual(window.s_c_il[0], visitor, 'other instances are kept');
    assert.strictEqual(window.s_c_il[1], s, 'registered after them');
    assert.strictEqual(s._in, 1, '_in');
    assert.strictEqual(s._il, window.s_c_il, '_il');
    assert.strictEqual(window.s_c_in, 2, 's_c_in');
    assert.strictEqual(s._c, 's_c', '_c');
    assert.strictEqual(s.version, '2.22.1', 'version');
    assert.strictEqual(s.account, 'rsid1,rsid2', 'account');
    assert.deepEqual(s.allAccounts, ['rsid1', 'rsid2'], 'allAccounts');
    assert.deepEqual(s.contextData, {}, 'contextData, which plugins write to');
    assert.strictEqual(typeof s.ActivityMap, 'object', 'ActivityMap module loaded');
    assert.deepEqual(
        Object.keys(s.Util).sort(),
        ['cookieRead', 'cookieWrite', 'getIeVersion', 'getQueryParam', 'urlDecode', 'urlEncode'],
        'Util',
    );
    assert.strictEqual(s.t(), undefined, 't()');
    assert.strictEqual(s.track(), undefined, 'track()');
    assert.strictEqual(s.tl(true, 'o', 'name'), undefined, 'tl()');
    assert.strictEqual(s.trackLight('p', 1, 1), undefined, 'trackLight()');
    assert.strictEqual(s.isReadyToTrack(), true, 'isReadyToTrack()');
    assert.strictEqual(s.sa, s.setAccount, 'sa() alias');
    ['bufferRequests', 'delayReady', 'doPostbacks', 'foreachVar', 'log'].forEach((method) => {
        assert.strictEqual(s[method](), undefined, `${method}() of the library does nothing`);
    });
    assert.strictEqual(s.Util.getIeVersion(), null, 'getIeVersion()');
    assert.strictEqual(s.escape("a b+~!*()'"), 'a%20b%2B%7E%21%2A%28%29%27', 'escape()');
    assert.strictEqual(s.unescape('a+b%20c'), 'a b c', 'unescape()');
    assert.strictEqual(s.replace('a-b-c', '-', '+'), 'a+b+c', 'replace()');
});

test('s_gi() returns the instance of the report suite', (assert) => {
    runRedirect();
    const first = window.s_gi('rsid1');
    assert.ok(first instanceof window.AppMeasurement, 'new instance');
    assert.strictEqual(window.s_gi('rsid1'), first, 'same account');
    assert.strictEqual(window.s_gi('rsid1,rsid3'), first, 'common report suite');
    assert.strictEqual(first.account, 'rsid1,rsid3', 'account updated, as by the real one');
    assert.notStrictEqual(window.s_gi('other'), first, 'another report suite');
    assert.strictEqual(window.AppMeasurement.getInstance('rsid3'), first, 'getInstance()');

    // as AppMeasurement 2.22.1 and 2.27.0: the report suites of previous accounts are kept
    const s = window.s_gi('a,b');
    assert.strictEqual(window.s_gi('b'), s, 'one of the report suites');
    assert.strictEqual(window.s_gi('a'), s, 'a report suite of a previous account');
    assert.strictEqual(s.account, 'a', 'account');
    assert.deepEqual(s.allAccounts, ['a', 'b'], 'allAccounts: sorted, without duplicates');
    s.sa('c,a');
    assert.strictEqual(s.account, 'c,a', 'sa() is setAccount()');
    assert.deepEqual(s.allAccounts, ['a', 'b', 'c'], 'sa() keeps the previous report suites');
});

test('tl() runs its done action after the hit, as the real one', async (assert) => {
    runRedirect();
    const s = window.s_gi('rsid');
    const calls = [];
    s.tl({ href: 'https://example.org/' }, 'o', 'name', null, () => calls.push('done'));
    assert.deepEqual(calls, [], 'not synchronously');
    s.tl(true, 'o', 'name', null, () => {
        throw new Error('page callback');
    });
    await sleep(10);
    assert.deepEqual(calls, ['done'], 'function called, errors caught');
    assert.strictEqual(s.linkName, 'name', 'link variables are set');

    const hashBefore = window.location.hash;
    s.tl({ href: '#adobe-analytics-navigate' }, 'e', 'link', null, 'navigate');
    assert.strictEqual(window.location.hash, hashBefore, 'not followed synchronously');
    await sleep(10);
    assert.strictEqual(window.location.hash, '#adobe-analytics-navigate', 'other done action follows the link');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashBefore}`);
    s.tl(true, 'e', 'link', null, 'navigate');
    await sleep(10);
    assert.strictEqual(window.location.hash, hashBefore, 'nothing to follow without href');
});

test('callbackWhenReadyToTrack() calls the callback with the receiver', async (assert) => {
    runRedirect();
    const s = window.s_gi('rsid');
    const receiver = {};
    const calls = [];
    s.callbackWhenReadyToTrack(receiver, function (...args) {
        calls.push([this, args]);
    }, ['a', 1]);
    s.callbackWhenReadyToTrack(receiver, () => {
        throw new Error('page callback');
    }, []);
    s.callbackWhenReadyToTrack(receiver, 'not a function', []);
    assert.deepEqual(calls, [], 'not synchronously');
    await sleep(10);
    assert.strictEqual(calls.length, 1, 'called once');
    assert.strictEqual(calls[0][0], receiver, 'receiver');
    assert.deepEqual(calls[0][1], ['a', 1], 'arguments');
});

test('loadModule() and onLoad, as the real one', (assert) => {
    runRedirect();
    const created = [];
    window.AppMeasurement_Module_Test = function (tracker) {
        created.push(tracker);
        this.custom = true;
    };
    const s = window.s_gi('rsid');
    const loaded = [];
    s.loadModule('Test', (tracker, mod) => loaded.push([tracker, mod]));
    assert.strictEqual(created[0], s, 'module constructor of the page gets the instance');
    assert.ok(s.Test.custom, 'module stored on the instance');
    assert.deepEqual(loaded, [[s, s.Test]], 'onLoad argument called at once');
    s.loadModule('Test');
    assert.strictEqual(created.length, 1, 'loaded once');

    const assigned = [];
    s.ActivityMap.onLoad = (tracker, mod) => assigned.push([tracker, mod]);
    assert.deepEqual(assigned, [[s, s.ActivityMap]], 'onLoad setter called at once');

    window.AppMeasurement_Module_Broken = () => {
        throw new Error('needs the real library');
    };
    s.loadModule('Broken');
    assert.deepEqual(Object.keys(s.Broken), [], 'empty module if the constructor throws');
    delete window.AppMeasurement_Module_Broken;
    s.loadModule('Missing');
    assert.strictEqual(typeof s.Missing, 'object', 'empty module if there is no constructor');
});

test('clearVars() clears the variables of a hit', (assert) => {
    runRedirect();
    const s = window.s_gi('rsid');
    Object.assign(s, {
        eVar1: 'a',
        prop12: 'b',
        hier1: 'c',
        list2: 'd',
        events: 'event1',
        products: ';p',
        campaign: 'c',
        pageName: 'home',
    });
    s.clearVars();
    ['eVar1', 'prop12', 'hier1', 'list2', 'events', 'products', 'campaign'].forEach((key) => {
        assert.strictEqual(s[key], undefined, `${key} cleared`);
    });
    assert.strictEqual(s.pageName, 'home', 'pageName kept');
});

test('Cookies are read but not written; getQueryParam() as the real one', (assert) => {
    runRedirect();
    const s = window.s_gi('rsid');
    document.cookie = 'aa_test_cookie=v%20x+y; path=/';
    document.cookie = 'aa_test_empty=%5B%5BB%5D%5D; path=/';
    try {
        assert.strictEqual(s.cookieRead('aa_test_cookie'), 'v x y', 'cookieRead() reads the real cookie');
        assert.strictEqual(s.Util.cookieRead('aa_test_cookie'), 'v x y', 'Util.cookieRead()');
        assert.strictEqual(s.c_r('aa_test_empty'), '', 'empty value of the library');
        assert.strictEqual(s.cookieRead('aa_missing'), '', 'missing cookie');
        assert.strictEqual(s.cookieWrite('aa_test_written', 'x'), false, 'cookieWrite() returns false');
        assert.strictEqual(s.Util.cookieWrite('aa_test_written', 'x'), false, 'Util.cookieWrite()');
        assert.strictEqual(document.cookie.indexOf('aa_test_written'), -1, 'no cookie written');
    } finally {
        document.cookie = 'aa_test_cookie=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'aa_test_empty=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    assert.strictEqual(s.Util.getQueryParam('a', 'https://x.org/p#x?a=1'), '1', 'string algorithm of the library');
    s.pageURL = 'https://x.org/p?cid=from-page-url';
    assert.strictEqual(s.Util.getQueryParam('cid'), 'from-page-url', 'pageURL by default');
    delete s.pageURL;
    assert.strictEqual(s.Util.getQueryParam('adobe-analytics-missing'), '', 'location by default');
});

test('Runs the queue of the legacy H code', (assert) => {
    window.s_giq = [{ oun: 'rsid', un: 'rsid,rollup', tagContainerName: 'tc' }];
    runRedirect();
    assert.strictEqual(window.s_giq, 0, 'queue emptied');
    assert.strictEqual(window.s_gi('rsid').account, 'rsid', 'instance of the queue, account set by s_gi() again');
    assert.deepEqual(window.s_c_il.length, 1, 'one instance');
});

test('s_gi() and s_pgicq() call the methods of a tracker of the page as methods, as the real one', (assert) => {
    // e.g. a tracker of another implementation, whose methods use `this`
    const calls = [];
    const tracker = {
        _c: 's_c',
        account: 'rsid',
        setAccount(account) {
            calls.push(['setAccount', this === tracker, account]);
            this.account = account;
        },
        setTagContainer(name) {
            calls.push(['setTagContainer', this === tracker, name]);
        },
    };
    window.s_c_il = [tracker];
    window.s_c_in = 1;
    window.s_giq = [{ oun: 'rsid', un: 'rsid,rollup', tagContainerName: 'tc' }];
    runRedirect();
    assert.deepEqual(calls, [
        ['setAccount', true, 'rsid'],
        ['setAccount', true, 'rsid,rollup'],
        ['setTagContainer', true, 'tc'],
    ], 'queue of the legacy H code');
    assert.strictEqual(window.s_gi('rsid,rollup'), tracker, 's_gi() returns the tracker');
    assert.deepEqual(calls[3], ['setAccount', true, 'rsid,rollup'], 'with the tracker as the receiver');

    tracker.setAccount = () => {
        throw new Error('error of the page');
    };
    assert.strictEqual(window.s_gi('rsid,rollup'), tracker, 'error of the tracker is caught');
});

test('Keeps the real library and installs only the missing parts', (assert) => {
    const RealAppMeasurement = function () {};
    window.AppMeasurement = RealAppMeasurement;
    window.s_gi = () => 'real';
    runRedirect();
    assert.strictEqual(window.AppMeasurement, RealAppMeasurement, 'AppMeasurement kept');
    assert.strictEqual(window.s_gi(), 'real', 's_gi kept');
    assert.strictEqual(typeof window.AppMeasurement_Module_ActivityMap, 'function', 'missing module installed');

    clearGlobalProps(...GLOBALS);
    runRedirect();
    const first = window.AppMeasurement;
    const firstModule = window.AppMeasurement_Module_ActivityMap;
    runRedirect();
    assert.strictEqual(window.AppMeasurement, first, 'second run keeps the first constructor');
    assert.strictEqual(window.AppMeasurement_Module_ActivityMap, firstModule, 'and the first module');
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
        runRedirect();
        const s = window.s_gi('rsid');
        s.pageName = 'home';
        s.t();
        s.tl(true, 'o', 'link');
        s.trackLight('p', 1, 1);
        s.cookieWrite('c', 'v');
        s.cookieRead('c');
        s.loadModule('Media');
        s.clearVars();
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
