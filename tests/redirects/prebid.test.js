import { evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'prebid';

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { before });

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
