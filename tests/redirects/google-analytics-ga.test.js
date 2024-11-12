/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'google-analytics-ga';

const changingProps = ['_gat', '_gaq'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-google-analytics_ga.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AdGuard Syntax _gat', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.ok(window._gat, '_gat object was created');
    assert.notOk(window._gat._createTracker(), '_createTracker returns nothing');

    const tracker = window._gat._getTracker();
    assert.ok(typeof tracker === 'object', '_getTracker returns tracker object');
    assert.notOk(tracker._addIgnoredOrganic(), 'checks _addIgnoredOrganic tracker method');
    assert.notOk(tracker._setCookiePersistence(), 'checks _setCookiePersistence tracker method');
});

test('AdGuard Syntax _gaq', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    assert.expect(5);

    assert.ok(window._gaq, '_gaq object was created');
    assert.notOk(window._gaq._createAsyncTracker(), '_createAsyncTracker returns nothing');
    window._gaq.push(() => assert.ok(true, 'push with cb runs it'));
    assert.notOk(window._gaq.push([]), 'push with array returns nothing');

    // https://github.com/gorhill/uBlock/issues/2162
    const cb = () => assert.ok(true, 'hitCallback was executed');
    window._gaq.push(['_set', 'hitCallback', cb]);
});
