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
    assert.expect(7);

    const elementId = 'testElement';
    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };

    const element = document.createElement('div');
    element.setAttribute('id', elementId);
    console.log = function log(...args) {
        const input = args[0];
        const elementArg = args[1];
        // Ignore hit messages with "trace"
        if (input.includes('trace')) {
            return;
        }

        if (input.includes('log-addEventListener Element:')) {
            assert.true(elementArg.matches(`div#${elementId}`), 'target element should matches the element');
        } else {
            assert.ok(input.includes(eventName), 'event name should be logged');
            assert.ok(input.includes(callback.toString()), 'callback should be logged');
            assert.ok(input.includes(`Element: div[id="${elementId}"]`), 'target element should be logged');
            assert.notOk(input.includes(INVALID_MESSAGE_START), 'Invalid message should not be displayed');
        }
        nativeConsole(...args);
    };

    runScriptlet(name);

    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    clearGlobalProps(agLogAddEventListenerProp);
});

test('logs events to console - listener added to window', (assert) => {
    assert.expect(6);

    const agLogAddEventListenerProp = 'agLogAddEventListenerProp';
    const eventName = 'click';
    const callback = function callback() {
        window[agLogAddEventListenerProp] = 'clicked';
    };

    console.log = function log(...args) {
        const input = args[0];
        // Ignore hit messages with "trace"
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(eventName), 'event name should be logged');
        assert.ok(input.includes(callback.toString()), 'callback should be logged');
        assert.ok(input.includes('Element: window'), 'target element should be logged');
        assert.notOk(input.includes(INVALID_MESSAGE_START), 'Invalid message should not be displayed');

        nativeConsole(...args);
    };

    runScriptlet(name);

    window.addEventListener(eventName, callback);
    window.dispatchEvent(new Event(eventName));

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[agLogAddEventListenerProp], 'clicked', 'property should change');
    clearGlobalProps(agLogAddEventListenerProp);
});

test('forwards addEventListener options', (assert) => {
    assert.expect(6);

    const useCaptureElement = document.createElement('div');
    const onceElement = document.createElement('div');
    const passiveCaptureElement = document.createElement('div');
    const combinedOptionsElement = document.createElement('div');
    let useCaptureCallCount = 0;
    let onceCallCount = 0;
    let passiveCaptureCallCount = 0;
    let combinedCallCount = 0;

    runScriptlet(name);

    useCaptureElement.addEventListener('click', () => {
        useCaptureCallCount += 1;
    }, true);

    onceElement.addEventListener('click', () => {
        onceCallCount += 1;
    }, { once: true });

    passiveCaptureElement.addEventListener('click', () => {
        passiveCaptureCallCount += 1;
    }, { capture: true, passive: true });

    combinedOptionsElement.addEventListener('click', () => {
        combinedCallCount += 1;
    }, { capture: true, passive: true, once: true });

    useCaptureElement.click();
    useCaptureElement.click();
    onceElement.click();
    onceElement.click();
    passiveCaptureElement.click();
    combinedOptionsElement.click();
    combinedOptionsElement.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(
        useCaptureCallCount,
        2,
        'boolean capture option should be forwarded to native addEventListener',
    );
    assert.strictEqual(
        onceCallCount,
        1,
        'once option should be forwarded to native addEventListener',
    );
    assert.strictEqual(
        passiveCaptureCallCount,
        1,
        'capture and passive options should be forwarded to native addEventListener',
    );
    assert.strictEqual(
        combinedCallCount,
        1,
        'combined options object should be forwarded to native addEventListener',
    );
    assert.strictEqual(
        typeof onceElement.addEventListener,
        'function',
        'wrapped addEventListener should stay callable',
    );
});

test('noProtect parameter allows subsequent override of addEventListener', (assert) => {
    assert.expect(9);

    const scriptletArgs = ['true'];
    runScriptlet(name, scriptletArgs);

    const elementId = 'noProtectElement';
    const elementProp = 'elementProp';
    const elementEventName = 'click';
    const callback = function callback() {
        window[elementProp] = 'clicked';
    };

    const element = document.createElement('div');
    element.setAttribute('id', elementId);
    console.log = function log(...args) {
        const input = args[0];
        const elementArg = args[1];
        if (input.includes('trace')) {
            return;
        }

        if (input.includes('log-addEventListener Element:')) {
            assert.true(elementArg.matches(`div#${elementId}`), 'target element should match the noProtect element');
        } else {
            assert.ok(input.includes(elementEventName), 'event name should be logged for noProtect');
            assert.ok(input.includes(callback.toString()), 'callback should be logged for noProtect');
            assert.ok(
                input.includes(`Element: div[id="${elementId}"]`),
                'target element should be logged for noProtect',
            );
            assert.notOk(
                input.includes(INVALID_MESSAGE_START),
                'Invalid message should not be displayed for noProtect',
            );
        }

        nativeConsole(...args);
    };

    element.addEventListener(elementEventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[elementProp], 'clicked', 'element listener should still be logged and called');
    clearGlobalProps('hit', elementProp);

    let overrideWorked = false;
    window.EventTarget.prototype.addEventListener = function customWrapper() {
        overrideWorked = true;
    };

    const elementAfterOverride = document.createElement('div');
    elementAfterOverride.addEventListener('click', () => {});

    assert.strictEqual(overrideWorked, true, 'addEventListener should be overridable with noProtect');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('default behavior (no noProtect) protects addEventListener from override', (assert) => {
    assert.expect(12);

    runScriptlet(name);

    const descriptor = Object.getOwnPropertyDescriptor(
        window.EventTarget.prototype,
        'addEventListener',
    );

    assert.strictEqual(typeof descriptor.get, 'function', 'descriptor should have a getter');
    assert.strictEqual(typeof descriptor.set, 'function', 'descriptor should have a setter');
    assert.strictEqual(descriptor.configurable, true, 'descriptor should be configurable');

    const originalWrapper = descriptor.get();

    window.EventTarget.prototype.addEventListener = function maliciousWrapper() {
        throw new Error('This should not be called');
    };

    const currentAddEventListener = window.EventTarget.prototype.addEventListener;
    assert.strictEqual(
        currentAddEventListener,
        originalWrapper,
        'addEventListener should still be the scriptlet wrapper after attempted override',
    );

    assert.strictEqual(
        descriptor.get(),
        originalWrapper,
        'getter should still return original wrapper after setter was called',
    );

    const elementId = 'protectedElement';
    const protectedProp = 'protectedProp';
    const eventName = 'click';
    const callback = function callback() {
        window[protectedProp] = 'clicked';
    };

    const element = document.createElement('div');
    element.setAttribute('id', elementId);
    console.log = function log(...args) {
        const input = args[0];
        const elementArg = args[1];
        if (input.includes('trace')) {
            return;
        }

        if (input.includes('log-addEventListener Element:')) {
            assert.true(elementArg.matches(`div#${elementId}`), 'target element should match the protected element');
        } else {
            assert.ok(input.includes(eventName), 'event name should be logged after blocked override');
            assert.ok(input.includes(callback.toString()), 'callback should be logged after blocked override');
            assert.ok(
                input.includes(`Element: div[id="${elementId}"]`),
                'target element should be logged after blocked override',
            );
            assert.notOk(
                input.includes(INVALID_MESSAGE_START),
                'Invalid message should not be displayed after blocked override',
            );
        }

        nativeConsole(...args);
    };

    element.addEventListener(eventName, callback);
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired after blocked override');
    assert.strictEqual(window[protectedProp], 'clicked', 'listener should still use the original protected wrapper');
    clearGlobalProps(protectedProp);
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
