/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
import { clearGlobalProps } from './helpers';

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

    return window.dataLayer;
};

test('UBO alias', (assert) => {
    const params = {
        name: 'ubo-googletagmanager_gtm.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();
    dataLayer.push({
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debugScriptlets', 'hit');
});

test('UBO Syntax', (assert) => {
    const params = {
        name: 'googletagmanager_gtm.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();
    dataLayer.push({
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debugScriptlets', 'hit');
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    assert.expect(3);

    const endCallback = () => {
        assert.ok(true, 'hide.end() was executed');
    };
    // emulate API
    const dataLayer = mockGoogleTagManagerApi(endCallback);

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();
    dataLayer.push({
        eventCallback() {
            assert.ok(true, 'Event callback was executed');
            done();
        },
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');

    clearGlobalProps('__debugScriptlets', 'hit');
});
