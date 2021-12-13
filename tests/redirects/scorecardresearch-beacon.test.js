/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'scorecardresearch-beacon';

const changingProps = ['hit', '__debug', 'COMSCORE', '_comscore'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

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
    runRedirect(name);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(window.COMSCORE, 'COMSCORE object was created');
    window.COMSCORE.purge();
    assert.strictEqual(window._comscore.length, 0, 'purge function reset _compscore var to []');
    assert.notOk(window.COMSCORE.beacon(), 'becacon function was mocked');
});
