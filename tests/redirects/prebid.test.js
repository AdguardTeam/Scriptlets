import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'prebid';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps('pbjs');
};

module(name, { before, afterEach });

test('Prebid mocked', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const { pbjs } = window;

    assert.ok(pbjs, 'window.pbjs exists');
    assert.ok(pbjs.cmd, 'pbjs.cmd exists');
    assert.ok(pbjs.que, 'pbjs.que exists');

    assert.strictEqual(typeof pbjs.addAdUnits, 'function', 'addAdUnits mocked');
    assert.strictEqual(pbjs.adServers.dfp.buildVideoUrl(), '', 'buildVideoUrl mocked');
    assert.ok(Array.isArray(pbjs.adUnits), 'adUnits mocked');
    assert.strictEqual(typeof pbjs.aliasBidder, 'function', 'aliasBidder mocked');
    assert.ok(Array.isArray(pbjs.cmd), 'cmd mocked');
    assert.strictEqual(typeof pbjs.cmd.push, 'function', 'cmd.push mocked');
    assert.strictEqual(typeof pbjs.enableAnalytics, 'function', 'enableAnalytics mocked');
    assert.ok(Array.isArray(pbjs.getHighestCpmBids()), 'getHighestCpmBids mocked');
    assert.true(pbjs.libLoaded, 'libLoaded mocked');
    assert.ok(Array.isArray(pbjs.que), 'que mocked');
    assert.strictEqual(typeof pbjs.que.push, 'function', 'que.push mocked');
    assert.strictEqual(typeof pbjs.requestBids, 'function', 'requestBids mocked');
    assert.strictEqual(typeof pbjs.removeAdUnit, 'function', 'removeAdUnit mocked');
    assert.strictEqual(typeof pbjs.setBidderConfig, 'function', 'setBidderConfig mocked');
    assert.strictEqual(typeof pbjs.setConfig, 'function', 'setConfig mocked');
    assert.strictEqual(typeof pbjs.setTargetingForGPTAsync, 'function', 'setTargetingForGPTAsync mocked');

    const bid = {
        bidsBackHandler() {
            assert.true(true, 'requestBids callback mocked');
        },
    };
    pbjs.requestBids(bid);
});

test('Mocks pbjs.rp of the Magnite wrapper, so that video players are started', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const { rp } = window.pbjs;

    // as the players of tyla.com and worldsurfleague.com, which are started in the callback
    const calls = [];
    rp.requestVideoBids({
        adSlotName: '/1234/site/video',
        playerSize: [640, 360],
        callback(...args) {
            calls.push(args.length);
        },
    });
    assert.deepEqual(calls, [0], 'callback is called once, without an ad');

    rp.requestVideoBids({
        callback() {
            throw new Error('error of the page');
        },
    });
    rp.requestVideoBids({ callback: 'not a function' });

    // as the player of worldsurfleague.com, from its frame: an object of another window
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const frameArg = frame.contentWindow.eval('({ adSlotName: "/1234/site/video", playerSize: [640, 360] })');
    frameArg.callback = () => calls.push('frame');
    rp.requestVideoBids(frameArg);
    frame.remove();
    assert.deepEqual(calls, [0, 'frame'], 'callback of an object of another window is called');
    rp.requestVideoBids();
    rp.requestVideoBids(null);
    assert.ok(true, 'errors of the page and invalid arguments are ignored');

    ['requestBids', 'onEvent', 'offEvent', 'addAdunitPatterns', 'addSizeMappings', 'setCustomMappingFunction',
        'setCustomPbAdSlotFunction'].forEach((method) => {
        assert.strictEqual(rp[method](), undefined, `rp.${method}() does nothing`);
    });
});

test('Runs the commands pushed to the queues', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const { pbjs } = window;
    const calls = [];
    // as pages: `pbjs.que.push(function () { pbjs.setConfig(…); })`
    pbjs.que.push(() => calls.push('que'));
    pbjs.cmd.push(() => calls.push('cmd'));
    pbjs.que.push(() => {
        throw new Error('error of the page');
    });
    pbjs.que.push('not a function');
    pbjs.que.push(() => calls.push('after error'));
    assert.deepEqual(calls, ['que', 'cmd', 'after error'], 'commands are run at once, errors of the page are caught');
    assert.strictEqual(pbjs.que.push.length, 1, 'que.push.length');
    assert.strictEqual(pbjs.cmd.push.length, 1, 'cmd.push.length');
});

test('Keeps the object of the page and runs the commands queued before, as Prebid.js', (assert) => {
    const calls = [];
    // as pages, before Prebid.js is loaded
    window.pbjs = window.pbjs || {};
    const { pbjs } = window;
    pbjs.que = pbjs.que || [];
    pbjs.cmd = pbjs.cmd || [];
    pbjs.pageValue = 'value';
    const adUnits = [{ code: 'ad' }];
    pbjs.adUnits = adUnits;
    const { que, cmd } = pbjs;
    const first = () => {
        calls.push('que');
        pbjs.que.push(() => calls.push('pushed by a command'));
        pbjs.requestBids({ bidsBackHandler: (...args) => calls.push(`bidsBackHandler ${args.length}`) });
    };
    pbjs.que.push(first);
    pbjs.cmd.push(() => calls.push('cmd'));
    pbjs.que.push(() => {
        throw new Error('error of the page');
    });
    pbjs.que.push('not a function');
    pbjs.que.push(() => calls.push('after error'));
    pbjs.que.push(first);

    evalWrapper(redirects.getRedirect(name).content);
    assert.deepEqual(calls, [
        'que',
        'bidsBackHandler 3',
        'after error',
        'cmd',
        'pushed by a command',
    ], 'commands are run in order, once, errors of the page are caught, pushed ones after them');
    assert.strictEqual(window.pbjs, pbjs, 'object of the page is kept');
    assert.strictEqual(pbjs.pageValue, 'value', 'with its properties');
    assert.strictEqual(pbjs.que, que, 'que is kept');
    assert.strictEqual(pbjs.cmd, cmd, 'cmd is kept');
    assert.strictEqual(pbjs.adUnits, adUnits, 'ad units are kept');
    assert.true(first.called, 'command is marked as called, as by Prebid.js');
    assert.true(pbjs.libLoaded, 'libLoaded');

    pbjs.cmd.push(() => calls.push('pushed later'));
    assert.strictEqual(calls[calls.length - 1], 'pushed later', 'command pushed later is run at once');
});

test('Runs commands pushed while starting in the order in which they were pushed', (assert) => {
    const calls = [];
    window.pbjs = { que: [], cmd: [] };
    window.pbjs.que.push(() => {
        calls.push('init');
        window.pbjs.que.push(() => {
            calls.push('A');
            window.pbjs.que.push(() => calls.push('C'));
        });
        window.pbjs.que.push(() => calls.push('B'));
    });
    evalWrapper(redirects.getRedirect(name).content);
    assert.deepEqual(calls, ['init', 'A', 'B', 'C'], 'as Prebid.js');
});

test('Runs a command of the same que and cmd once', (assert) => {
    const calls = [];
    const queue = [() => calls.push('command')];
    window.pbjs = { que: queue, cmd: queue };
    evalWrapper(redirects.getRedirect(name).content);
    assert.deepEqual(calls, ['command'], 'command is run once');
});

test('requestBids() calls bidsBackHandler of an object of another frame and returns a promise', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const frameArg = frame.contentWindow.eval('({})');
    frameArg.bidsBackHandler = (...args) => calls.push(args);
    const result = window.pbjs.requestBids(frameArg);
    frame.remove();
    assert.deepEqual(calls, [[undefined, undefined, undefined]], 'bidsBackHandler is called without bids');
    assert.deepEqual(await result, {
        bids: undefined,
        timedOut: undefined,
        auctionId: undefined,
    }, 'promise is resolved as by Prebid.js without ad units');

    // e.g. a function with options as its properties
    const callable = () => {};
    callable.bidsBackHandler = () => calls.push('callable');
    window.pbjs.requestBids(callable);
    assert.strictEqual(calls[1], 'callable', 'bidsBackHandler of a function is called, as by Prebid.js');

    window.pbjs.requestBids();
    window.pbjs.requestBids(null);
    window.pbjs.requestBids({
        bidsBackHandler() {
            throw new Error('error of the page');
        },
    });
    assert.ok(true, 'errors of the page and invalid arguments are ignored');
});

test('Does nothing if pbjs is already loaded, e.g. by a scriptlet', (assert) => {
    const calls = [];
    window.pbjs = { que: [() => calls.push('command')] };
    evalWrapper(redirects.getRedirect(name).content);
    const { pbjs } = window;
    const { requestBids } = pbjs;
    pbjs.que.push(() => calls.push('pushed'));

    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(window.pbjs, pbjs, 'object is kept');
    assert.strictEqual(window.pbjs.requestBids, requestBids, 'methods are kept');
    assert.deepEqual(calls, ['command', 'pushed'], 'commands are not run again');
});

test('requestBids() with ad units resolves empty bids of an auction, as Prebid.js without bids', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const { pbjs } = window;
    const calls = [];
    const unit = (code) => ({
        code,
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        bids: [{ bidder: 'appnexus', params: { placementId: 1 } }],
    });
    pbjs.addAdUnits([unit('div-1'), unit('div-2')]);
    pbjs.addAdUnits(unit('div-3'));
    assert.deepEqual(pbjs.adUnits.map((u) => u.code), ['div-1', 'div-2', 'div-3'], 'ad units are added');
    // e.g. the page passes the ad units of pbjs, as Prebid.js
    pbjs.addAdUnits(pbjs.adUnits);
    assert.strictEqual(pbjs.adUnits.length, 6, 'ad units of pbjs are added once');
    pbjs.adUnits.length = 3;

    const result = await pbjs.requestBids({
        bidsBackHandler: (bids, timedOut, auctionId) => calls.push([bids, timedOut, typeof auctionId]),
    });
    assert.deepEqual(calls, [[{}, false, 'string']], 'bidsBackHandler gets empty bids of an auction');
    assert.deepEqual(result.bids, {}, 'empty bids');
    assert.false(result.timedOut, 'not timed out');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.ok(uuid.test(result.auctionId), 'auction id');
    // e.g. on an `http:` page, which is not a secure context
    const descriptor = Object.getOwnPropertyDescriptor(Crypto.prototype, 'randomUUID');
    delete Crypto.prototype.randomUUID;
    let ids;
    try {
        ids = await Promise.all([1, 2, 3].map(() => pbjs.requestBids().then((r) => r.auctionId)));
    } finally {
        Object.defineProperty(Crypto.prototype, 'randomUUID', descriptor);
    }
    assert.true(ids.every((id) => uuid.test(id)), 'auction id without crypto.randomUUID()');
    assert.strictEqual(new Set(ids).size, 3, 'random ones');

    const filtered = await pbjs.requestBids({ adUnitCodes: ['other'] });
    assert.strictEqual(filtered.bids, undefined, 'no ad unit of the codes');
    const allCodes = await pbjs.requestBids({ adUnitCodes: [] });
    assert.deepEqual(allCodes.bids, {}, 'empty list of codes selects all ad units, as Prebid.js');
    const ownId = [];
    const withId = await pbjs.requestBids({ auctionId: 'page-id', bidsBackHandler: (b, t, id) => ownId.push(id) });
    assert.deepEqual([ownId[0], withId.auctionId], ['page-id', 'page-id'], 'auction id of the page is kept');

    pbjs.removeAdUnit(['div-1', 'div-3']);
    assert.deepEqual(pbjs.adUnits.map((u) => u.code), ['div-2'], 'ad units are removed');
    pbjs.removeAdUnit();
    assert.deepEqual(pbjs.adUnits, [], 'all ad units are removed');
    const none = await pbjs.requestBids();
    assert.strictEqual(none.bids, undefined, 'without ad units');
    const explicit = await pbjs.requestBids({ adUnits: [unit('div-4')] });
    assert.deepEqual(explicit.bids, {}, 'with ad units of the call');
});
