/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'scorecardresearch-beacon';

module(name);

const evalWrapper = eval;

test('UBO alias', (assert) => {
    const params = {
        name: 'ubo-scorecardresearch_beacon.js',
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debug', 'hit', 'COMSCORE', '_comscore');
});

test('UBO Syntax', (assert) => {
    const params = {
        name: 'scorecardresearch_beacon.js',
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debug', 'hit', 'COMSCORE', '_comscore');
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debug', 'hit', 'COMSCORE', '_comscore');
});
