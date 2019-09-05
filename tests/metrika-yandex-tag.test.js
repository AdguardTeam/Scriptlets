/* eslint-disable eqeqeq, no-underscore-dangle, no-eval */

/* global QUnit */
import { clearGlobalProps } from './helpers';


const { test, module } = QUnit;
const name = 'metrika-yandex-tag';

module(name);

const evalWrapper = eval;

test('AdGuard: yandex metrika tag.js', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    assert.expect(6);

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.ym, 'Metrika function was created');

    // init
    assert.notOk(window.ym(1, 'init'), 'init function exists and returns undefined');

    // extLink
    const done = assert.async();
    function extLinkCb() {
        assert.ok(this == 123, 'cb was executed and context changed');
        done();
    }
    window.ym(1, 'extLink', 'params', {
        callback: extLinkCb,
        ctx: 123,
    });

    // getClientID
    const done1 = assert.async();
    function getClientIDCb(data) {
        assert.strictEqual(data, null, 'getClientID returns null');
        done1();
    }
    window.ym(1, 'getClientID', getClientIDCb);

    // reachGoal
    const done2 = assert.async();
    function reachGoalCb() {
        // eslint-disable-next-line eqeqeq
        assert.ok(this == 123, 'context was changed');
        done2();
    }
    window.ym(1, 'reachGoal', 'target', 'params', reachGoalCb, 123);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debugScriptlets', 'hit', 'ym');
});
