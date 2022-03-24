/* eslint-disable no-underscore-dangle */
import { runRedirect, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'fingerprintjs3';

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
        name: 'ubo-fingerprint3.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Fingerprint3 works', (assert) => {
    runRedirect(name);

    assert.expect(7);

    const { FingerprintJS } = window;

    assert.ok(FingerprintJS, 'FingerprintJS object was created');
    assert.strictEqual(FingerprintJS.hashComponents(), '', 'hashComponents() mocked');
    FingerprintJS.load().then((response) => {
        assert.ok(response, 'load() request fulfilled');
    });
    FingerprintJS.get().then((response) => {
        assert.ok(response, 'get() request fulfilled');
        assert.ok(response.visitorId, 'visitorId mocked');
        assert.strictEqual(typeof response.visitorId, 'string', 'visitorId is a string');
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
});
