/* eslint-disable no-console, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log-addEventListener';

const hit = () => {
    window.hit = 'FIRED';
};

const changingProps = ['hit', '__debug'];

const nativeConsole = console.log;
const nativeDescriptor = Object.getOwnPropertyDescriptor(window.EventTarget.prototype, 'addEventListener');

const beforeEach = () => {
    window.__debug = hit;
};

const afterEach = () => {
    console.log = nativeConsole;
    Object.defineProperty(window.EventTarget.prototype, 'addEventListener', nativeDescriptor);
    Object.defineProperty(window, 'addEventListener', nativeDescriptor);
    Object.defineProperty(document, 'addEventListener', nativeDescriptor);
    clearGlobalProps(...changingProps);
};

const INVALID_MESSAGE_START = 'Invalid event type or listener passed to addEventListener';

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
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(eventName), 'console.hit input should be equal');
        assert.ok(input.includes(callback.toString()), 'console.hit input should be equal');
        assert.notOk(input.includes(INVALID_MESSAGE_START), 'Invalid message should not be displayed');
    };

    runScriptlet(name);

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
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(INVALID_MESSAGE_START), 'passed invalid args');
        assert.ok(input.includes(INVALID_MESSAGE_PART), 'passed invalid args');
    };

    runScriptlet(name);

    const element = document.createElement('div');
    element.addEventListener(eventName, listener);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid args');
});

test('logs events to console - listener is not a function', (assert) => {
    let isCalled = false;

    // Firefox 52 can not call handleEvent of empty object listener
    // and fails with error "TypeError: Property 'handleEvent' is not callable."
    // so we have to mock addEventListener to avoid browserstack tests run fail
    window.EventTarget.prototype.addEventListener = () => {
        isCalled = true;
    };

    const eventName = 'click';
    const listener = Object.create(null);

    const INVALID_MESSAGE_PART = 'listener: {}';

    console.log = function log(input) {
        // Ignore hit messages with "trace"
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(INVALID_MESSAGE_START), 'passed invalid args');
        assert.ok(input.includes(INVALID_MESSAGE_PART), 'passed invalid args');
    };

    runScriptlet(name);

    const element = document.createElement('div');
    element.addEventListener(eventName, listener);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid args');
    assert.strictEqual(isCalled, true, 'mocked addEventListener was called eventually');
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
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(INVALID_MESSAGE_START), 'passed invalid args');
        assert.ok(input.includes(INVALID_MESSAGE_PART), 'passed invalid args');
    };

    runScriptlet(name);

    const element = document.createElement('div');
    element.addEventListener(TEST_EVENT_TYPE, listener);
    element.click();

    assert.strictEqual(window[testPropName], 'start', 'property should not change');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire on invalid args');
});
