/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
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
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'COMSCORE', '_comscore');
});

test('UBO Syntax', (assert) => {
    const params = {
        name: 'scorecardresearch_beacon.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'COMSCORE', '_comscore');
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'COMSCORE', '_comscore');
});
