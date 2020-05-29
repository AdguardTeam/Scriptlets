/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'googletagmanager-gtm';

module(name);

const evalWrapper = eval;

const mockGoogleTagManagerApi = (endCallback) => {
    window.dataLayer = {
        hide: {
            end() {
                endCallback();
            },
        },
        push() {},
    };
    window.google_optimize = {
        get: () => { return true; },
    };

    return window.dataLayer;
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-googletagmanager_gtm.js',
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

    assert.expect(4);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    const done = assert.async();
    dataLayer.push({
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    });

    assert.strictEqual(window.google_optimize.get(), undefined, 'google_optimize.get has been mocked');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debug', 'hit');
});
