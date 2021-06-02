/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log-addEventListener';

const hit = () => {
    window.hit = 'FIRED';
};

const changingProps = ['hit', '__debug'];

const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = hit;
};

const afterEach = () => {
    console.log = nativeConsole;
    window.EventTarget.prototype.addEventListener = nativeAddEventListener;
    clearGlobalProps(...changingProps);
};

const INVALID_MESSAGE_START = 'Invalid event type or listener passed to addEventListener';

const runScriptlet = () => {
    const params = {
        name,
        verbose: true,
    };

    const resultString = window.scriptlets.invoke(params);
    const evalWrapper = eval;
    evalWrapper(resultString);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'aell.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('logs events to console', (assert) => {
    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };
    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `addEventListener("${eventName}", ${callback.toString()})`, 'console.hit input should be equal');
    };

    runScriptlet();

    const element = document.createElement('div');
    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    clearGlobalProps(agLogAddEventListenerProp);
});

test('logs events to console - listener is null', (assert) => {
    const eventName = 'click';
    const listener = null;

    const INVALID_MESSAGE_PART = 'listener: null';

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.indexOf(INVALID_MESSAGE_START) > -1, 'passed invalid args');
        assert.ok(input.indexOf(INVALID_MESSAGE_PART) > -1, 'passed invalid args');
    };

    runScriptlet();

    const element = document.createElement('div');
    element.addEventListener(eventName, listener);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid agrs');
});

test('logs events to console - listener is not a function', (assert) => {
    const eventName = 'click';
    const listener = Object.create(null);

    const INVALID_MESSAGE_PART = 'listener: {}';

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.indexOf(INVALID_MESSAGE_START) > -1, 'passed invalid args');
        assert.ok(input.indexOf(INVALID_MESSAGE_PART) > -1, 'passed invalid args');
    };

    runScriptlet();

    const element = document.createElement('div');
    element.addEventListener(eventName, listener);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid agrs');
});

test('logs events to console - event is undefined', (assert) => {
    const TEST_EVENT_TYPE = window.undefinedEvent; // not defined

    const testPropName = 'test';
    window[testPropName] = 'start';
    const listener = () => {
        window[testPropName] = 'final';
    };

    const INVALID_MESSAGE_PART = 'type: undefined';

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.indexOf(INVALID_MESSAGE_START) > -1, 'passed invalid args');
        assert.ok(input.indexOf(INVALID_MESSAGE_PART) > -1, 'passed invalid args');
    };

    runScriptlet();

    const element = document.createElement('div');
    element.addEventListener(TEST_EVENT_TYPE, listener);
    element.click();

    assert.strictEqual(window[testPropName], 'start', 'property should not change');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid agrs');
});
