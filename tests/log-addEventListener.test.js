/* global QUnit */
/* eslint-disable no-eval, no-console */
const { test, module } = QUnit;
const name = 'log-addEventListener';

module(name);

const evalWrapper = eval;

const runScriptlet = (event, func, hit) => {
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

const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
const nativeConsole = console.log;

const hit = () => {
    window.hit = 'FIRED';
};

test('ubo alias addEventListener-logger.js works', (assert) => {
    const uboAddEventListenerLog = 'uboAddEventListenerLog';
    const eventName = 'click';
    const callback = function callback() {
        window[uboAddEventListenerLog] = 'clicked';
    };
    console.log = function log(input) {
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.log input should be equal');
    };
    const params = {
        name: 'addEventListener-logger.js',
        hit,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[uboAddEventListenerLog], 'clicked', 'property should be applied correctly');
    // return native functions
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    console.log = nativeConsole;
    clearProperties('hit', uboAddEventListenerLog);
});

test('logs events to console', (assert) => {
    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };
    console.log = function log(input) {
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.log input should be equal');
    };
    runScriptlet('click', 'clicked', hit);

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    // return native functions
    console.log = nativeConsole;
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    clearProperties('hit', agLogAddEventListenerProp);
});
