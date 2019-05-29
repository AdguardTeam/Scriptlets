/* global QUnit */
/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'log-addEventListener';

const hit = () => {
    window.hit = 'FIRED';
};

const changingProps = ['hit', '__debugScriptlets'];

const beforeEach = () => {
    window.__debugScriptlets = hit;
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
const nativeConsole = console.log;

test('ubo alias addEventListener-logger.js works', (assert) => {
    const uboAddEventListenerLog = 'uboAddEventListenerLog';
    const eventName = 'click';
    const callback = function callback() {
        window[uboAddEventListenerLog] = 'clicked';
    };
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.log input should be equal');
    };
    const params = {
        name: 'addEventListener-logger.js',
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[uboAddEventListenerLog], 'clicked', 'property should be applied correctly');
    // revert native functions
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    console.log = nativeConsole;
    clearGlobalProps(uboAddEventListenerLog);
});

test('logs events to console', (assert) => {
    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };
    console.log = function log(input) {
        // Ignore log messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.log input should be equal');
    };

    const params = {
        name,
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    // revert native functions
    console.log = nativeConsole;
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    clearGlobalProps(agLogAddEventListenerProp);
});
