/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'fingerprintjs2';

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
        // original ubo name
        name: 'fingerprint2.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Fingerprint2 works', (assert) => {
    runRedirect(name);

    const done = assert.async();

    assert.ok(window.Fingerprint2, 'Fingerprint2 object was created');
    assert.notOk(window.Fingerprint2.get(), 'getter returns nothing');

    const cb = () => {
        assert.ok(true, 'callback was executed');
        done();
    };
    window.Fingerprint2.get([], cb);

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
