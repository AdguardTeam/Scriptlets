/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'amazon-apstag';

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
    runRedirect(name);

    assert.ok(window.apstag, 'window.apstag exists');
    assert.ok(window.apstag.fetchBids, 'apstag.fetchBids exists');
    assert.equal(window.apstag.init(), undefined, 'apstag.init() is mocked');
    assert.equal(window.apstag.setDisplayBids(), undefined, 'apstag.setDisplayBids() is mocked');
    assert.equal(window.apstag.targetingKeys(), undefined, 'apstag.targetingKeys() is mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
