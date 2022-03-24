/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prebid';

const changingProps = ['hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('Prebid mocked', (assert) => {
    runRedirect(name);

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

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
