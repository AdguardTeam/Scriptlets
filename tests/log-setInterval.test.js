/* global QUnit */
/* eslint-disable no-eval, no-console */
import { clearProperties } from './helpers';

const { test, module } = QUnit;
const name = 'log-setInterval';

module(name);

const evalWrapper = eval;

const runScriptlet = (hit) => {
    const params = {
        name,
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

const nativeSetInterval = window.setInterval;
const nativeConsole = console.log;

const hit = () => {
    window.hit = 'FIRED';
};

test('ubo alias setInterval-logger.js works', (assert) => {
    const done = assert.async();
    const uboSetIntervalLogger = 'uboSetIntervalLogger';
    const callback = function callback() {
        window[uboSetIntervalLogger] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.log input should be equal');
    };
    const params = {
        name: 'setInterval-logger.js',
        hit,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const timeoutId = setInterval(callback, timeout);
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[uboSetIntervalLogger], 'changed', 'property should change');
        // return native functions
        window.setInterval = nativeSetInterval;
        console.log = nativeConsole;
        clearInterval(timeoutId);
        clearProperties('hit', uboSetIntervalLogger);
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
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.log input should be equal');
    };

    runScriptlet(hit);

    const intervalId = setInterval(callback, timeout);

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[agLogSetInterval], 'changed', 'property should change');
        // return native functions
        console.log = nativeConsole;
        window.setInterval = nativeSetInterval;
        clearProperties('hit', agLogSetInterval);
        clearInterval(intervalId);
        done();
    }, 20);
});
