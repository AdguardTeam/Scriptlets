/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'amazon-apstag';

module(name);

const evalWrapper = eval;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-amazon_apstag.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('amazon-apstag: works', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    assert.ok(window.apstag, 'window.apstag exists');
    assert.ok(window.apstag.fetchBids, 'apstag.fetchBids exists');
    assert.equal(window.apstag.init(), undefined, 'apstag.init() is mocked');
    assert.equal(window.apstag.setDisplayBids(), undefined, 'apstag.setDisplayBids() is mocked');
    assert.equal(window.apstag.targetingKeys(), undefined, 'apstag.targetingKeys() is mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    clearGlobalProps('__debug', 'hit');
});
