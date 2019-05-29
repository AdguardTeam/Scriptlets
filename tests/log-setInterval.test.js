/* global QUnit */
/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'hit-setInterval';

const nativeSetInterval = window.setInterval;
const nativeConsole = console.log;

const afterEach = () => {
    window.setInterval = nativeSetInterval;
    console.log = nativeConsole;
    clearGlobalProps('hit');
};

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
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

test('ubo alias setInterval-logger.js works', (assert) => {
    const done = assert.async();
    const uboSetIntervalLogger = 'uboSetIntervalLogger';
    const callback = function callback() {
        window[uboSetIntervalLogger] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };
    const params = {
        name: 'setInterval-logger.js',
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const timeoutId = setInterval(callback, timeout);
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[uboSetIntervalLogger], 'changed', 'property should change');
        clearInterval(timeoutId);
        clearGlobalProps(uboSetIntervalLogger);
        done();
    }, 20);
});

test('logs events to console', (assert) => {
    const done = assert.async();
    const agLogSetInterval = 'agLogSetInterval';
    const callback = function callback() {
        window[agLogSetInterval] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };

    runScriptlet();

    const intervalId = setInterval(callback, timeout);

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[agLogSetInterval], 'changed', 'property should change');
        clearGlobalProps(agLogSetInterval);
        clearInterval(intervalId);
        done();
    }, 20);
});
