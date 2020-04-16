/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'scorecardresearch-beacon';

module(name);

const evalWrapper = eval;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-scorecardresearch_beacon.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
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
