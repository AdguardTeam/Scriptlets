/* global QUnit */
/* eslint-disable no-eval, no-console */
const { test, module } = QUnit;
const name = 'log-setTimeout';

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

const clearProperties = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};

const nativeSetTimeout = window.setTimeout;
const nativeConsole = console.log;

const hit = () => {
    window.hit = 'FIRED';
};

test('ubo alias setTimeout-logger.js works', (assert) => {
    const done = assert.async();
    const uboSetTimeoutLogger = 'uboSetTimeoutLogger';
    const callback = function callback() {
        window[uboSetTimeoutLogger] = 'changed';
    };
    const timeout = 10;
    console.log = function log(input) {
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.log input should be equal');
    };
    const params = {
        name: 'setTimeout-logger.js',
        hit,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const timeoutId = setTimeout(callback, timeout);
    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[uboSetTimeoutLogger], 'changed', 'property changed');
        // return native functions
        window.setTimeout = nativeSetTimeout;
        console.log = nativeConsole;
        clearProperties('hit', uboSetTimeoutLogger);
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
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.log input');
    };

    runScriptlet(hit);

    const timeoutId = setTimeout(callback, timeout);

    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(window[agLogSetTimeout], 'changed', 'property changed');
        // return native functions
        console.log = nativeConsole;
        window.setTimeout = nativeSetTimeout;
        clearProperties('hit', agLogSetTimeout);
        clearTimeout(timeoutId);
        done();
    }, 20);
});
