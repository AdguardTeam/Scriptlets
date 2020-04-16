/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'google-analytics-ga';

module(name);

const evalWrapper = eval;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-google-analytics_ga.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AdGuard Syntax _gat', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.ok(window._gat, '_gat object was created');
    assert.notOk(window._gat._createTracker(), '_createTracker returns nothing');

    const tracker = window._gat._getTracker();
    assert.ok(typeof tracker === 'object', '_getTracker returns tracker object');
    assert.notOk(tracker._addIgnoredOrganic(), 'checks _addIgnoredOrganic tracker method');
    assert.notOk(tracker._setCookiePersistence(), 'checks _setCookiePersistence tracker method');

    // hit checking
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit', '_gat');
});

test('AdGuard Syntax _gaq', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.expect(6);

    assert.ok(window._gaq, '_gaq object was created');
    assert.notOk(window._gaq._createAsyncTracker(), '_createAsyncTracker returns nothing');
    window._gaq.push(() => assert.ok(true, 'push with cb runs it'));
    assert.notOk(window._gaq.push([]), 'push with array returns nothing');

    // https://github.com/gorhill/uBlock/issues/2162
    const cb = () => assert.ok(true, 'hitCallback was executed');
    window._gaq.push(['_set', 'hitCallback', cb]);

    // hit checking
    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit', '_gaq');
});
