/* global QUnit */
/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'hit-setTimeout';

const nativeSetTimeout = window.setTimeout;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
    window.setTimeout = nativeSetTimeout;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = () => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('ubo alias setTimeout-logger.js works', (assert) => {
    const done = assert.async();
    const uboSetTimeoutLogger = 'uboSetTimeoutLogger';
    const callback = function callback() {
        window[uboSetTimeoutLogger] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };
    const params = {
        name: 'setTimeout-logger.js',
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const timeoutId = setTimeout(callback, timeout);
    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[uboSetTimeoutLogger], 'changed', 'property changed');
        clearGlobalProps('hit', uboSetTimeoutLogger);
        clearTimeout(timeoutId);
        done();
    }, 20);
});

test('logs events to console', (assert) => {
    const done = assert.async();
    const agLogSetTimeout = 'agLogSetTimeout';
    const callback = function callback() {
        window[agLogSetTimeout] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.hit input');
    };

    runScriptlet();

    const timeoutId = setTimeout(callback, timeout);

    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[agLogSetTimeout], 'changed', 'property changed');
        clearGlobalProps('hit', agLogSetTimeout);
        clearTimeout(timeoutId);
        done();
    }, 20);
});
