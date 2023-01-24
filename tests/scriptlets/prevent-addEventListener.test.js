/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-addEventListener';

const nativeDescriptor = Object.getOwnPropertyDescriptor(window.EventTarget.prototype, 'addEventListener');

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('__debug', 'hit');
    Object.defineProperty(window.EventTarget.prototype, 'addEventListener', nativeDescriptor);
    Object.defineProperty(window, 'addEventListener', nativeDescriptor);
    Object.defineProperty(document, 'addEventListener', nativeDescriptor);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const aliasParams = {
        name: 'ubo-addEventListener-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAliasParams = window.scriptlets.invoke(aliasParams);

    assert.strictEqual(codeByAdgParams, codeByAliasParams);
});

test('should not prevent addEventListener if listener is null', (assert) => {
    const TEST_EVENT_NAME = 'testPassive';
    const TEST_CALLBACK_MATCH = 'clicked';
    runScriptlet(name, [TEST_EVENT_NAME, TEST_CALLBACK_MATCH]);

    const element = document.createElement('div');
    element.addEventListener(TEST_EVENT_NAME, null);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
});

test('should not prevent addEventListener if listener is invalid object', (assert) => {
    const TEST_EVENT_NAME = 'testPassive';
    const TEST_CALLBACK_MATCH = 'clicked';
    runScriptlet(name, [TEST_EVENT_NAME, TEST_CALLBACK_MATCH]);

    const element = document.createElement('div');
    const invalidListener = Object.create(null);
    element.addEventListener(TEST_EVENT_NAME, invalidListener);
    element.click();

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
});

test('should not prevent addEventListener if event is undefined', (assert) => {
    const TEST_EVENT_NAME = window.undefinedEvent; // not defined
    const TEST_CALLBACK_MATCH = 'clicked';

    runScriptlet(name, [TEST_EVENT_NAME, TEST_CALLBACK_MATCH]);

    const testProp = 'test';
    window[testProp] = 'start';
    const element = document.createElement('div');
    element.addEventListener(TEST_EVENT_NAME, () => {
        window[testProp] = 'final';
    });

    assert.strictEqual(window.hit, undefined, 'hit should not be fired');
    assert.strictEqual(window[testProp], 'start', 'property should not be changed');
    clearGlobalProps(testProp);
});

test('does not allow to add event listener', (assert) => {
    const scriptletArgs = ['click', 'clicked'];
    runScriptlet(name, scriptletArgs);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = 'clicked';
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearGlobalProps(testProp);
});

test('event listeners not corresponding to scriptlet arguments should be added correctly', (assert) => {
    const scriptletArgs = ['click', undefined];
    runScriptlet(name, scriptletArgs);

    const focusProp = 'focusProp';
    const element = document.createElement('div');
    element.addEventListener('focus', () => {
        window[focusProp] = 'focused';
    });

    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
    assert.strictEqual(window[focusProp], 'focused', 'property should change');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked';
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearGlobalProps(clickProp, focusProp);
});

test('event listeners with handlers matched with regexp not added', (assert) => {
    const scriptletArgs = [undefined, '/click/'];
    runScriptlet(name, scriptletArgs);

    const element = document.createElement('div');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked'; // this string matches with regex
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should not fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearGlobalProps('hit');

    const focusProp = 'focusProp';
    element.addEventListener('focus', () => {
        window[focusProp] = 'clicked'; // this string matches with regex
    });
    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, 'FIRED', 'hit function not fired');
    assert.strictEqual(window[focusProp], undefined, 'property should be undefined');
    clearGlobalProps('hit');

    // this event listener should work correctly
    element.addEventListener('click', () => {
        window[focusProp] = 'focus'; // this string doesn't match with regex
    });
    element.click();
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(window[focusProp], 'focus', 'property should change');

    clearGlobalProps(clickProp, focusProp);
});

test('event listeners should be added correctly -- invalid event regexp pattern', (assert) => {
    const scriptletArgs = ['/*/', undefined];
    runScriptlet(name, scriptletArgs, false);

    const focusProp = 'focusProp';
    const element = document.createElement('div');
    element.addEventListener('focus', () => {
        window[focusProp] = 'focused';
    });

    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
    assert.strictEqual(window[focusProp], 'focused', 'property should change');
});

test('event listeners should be added correctly -- invalid func regexp pattern', (assert) => {
    const scriptletArgs = ['focus', '/\\/'];
    runScriptlet(name, scriptletArgs, false);

    const focusProp = 'focusProp';
    const element = document.createElement('div');
    element.addEventListener('focus', () => {
        window[focusProp] = 'focused';
    });

    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
    assert.strictEqual(window[focusProp], 'focused', 'property should change');
});

test('match simple single quote mark', (assert) => {
    const scriptletArgs = ['click', 'single\'quote'];
    runScriptlet(name, scriptletArgs);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = "single'quote";
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearGlobalProps(testProp);
});

test('match single quote mark with one backslash before it', (assert) => {
    // eslint-disable-next-line no-useless-escape
    const scriptletArgs = ['click', "single\'quote"];
    runScriptlet(name, scriptletArgs);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = "single'quote";
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearGlobalProps(testProp);
});

test('match escaped quote mark', (assert) => {
    const scriptletArgs = ['click', "\\'quote"];
    runScriptlet(name, scriptletArgs);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = "escaped\\'quote";
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearGlobalProps(testProp);
});
