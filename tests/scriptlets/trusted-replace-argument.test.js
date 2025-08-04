/* eslint-disable no-underscore-dangle, no-console, no-eval */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-argument';

const nativeConsoleLog = window.console.log;
const nativeEval = window.eval;
const nativeArray = window.Array;
const nativeJSONParse = window.JSON.parse;
const nativeDocumentQuerySelector = window.document.querySelector;
const nativeDocumentQuerySelectorAll = window.document.querySelectorAll;
const nativeMutationObserver = window.MutationObserver;
const nativeObjectDefineProperty = window.Object.defineProperty;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    window.console.log = nativeConsoleLog;
    window.eval = nativeEval;
    window.Array = nativeArray;
    window.JSON.parse = nativeJSONParse;
    window.document.querySelector = nativeDocumentQuerySelector;
    window.document.querySelectorAll = nativeDocumentQuerySelectorAll;
    window.MutationObserver = nativeMutationObserver;
    window.Object.defineProperty = nativeObjectDefineProperty;
};

module(name, { beforeEach, afterEach });

test('Replace argument in eval if pattern matches', (assert) => {
    const expected = 'Bar';

    runScriptlet(name, ['eval', '0', '"Bar"', 'Foo']);

    const result = eval('"Foo"');
    const shouldStayIntact = eval('"Test"');

    assert.strictEqual(result, expected, 'The scriptlet should change the method result');
    assert.strictEqual(shouldStayIntact, 'Test', 'The scriptlet should not change the method result');
});

test('Replace argument in eval to "trueFunc" if pattern matches', (assert) => {
    runScriptlet(name, ['eval', '0', 'trueFunc', 'false']);

    const evalFunc = eval('()=>false');
    const result = evalFunc();

    assert.strictEqual(result, true, 'The scriptlet should change the method result');
    assert.strictEqual(eval.toString(), nativeEval.toString(), 'eval.toString() returns the original value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace argument in Array on position "1" to value 100 if stack matches', (assert) => {
    const expectedArrayForCreateArray = [1, 100, 3];
    const expectedArrayForAnotherArray = [1, 2, 3];

    runScriptlet(name, ['Array', '1', '100', '', 'createArray']);

    const createArray = () => {
        // eslint-disable-next-line no-array-constructor
        const arr = new Array(1, 2, 3);
        return arr;
    };

    const result = createArray();

    const anotherArray = () => {
        // eslint-disable-next-line no-array-constructor
        const arr = new Array(1, 2, 3);
        return arr;
    };

    const anotherResult = anotherArray();

    assert.deepEqual(result, expectedArrayForCreateArray, 'Argument on position "1" should be replaced with 100');
    assert.deepEqual(anotherResult, expectedArrayForAnotherArray, 'Arguments should not be replaced');
    assert.strictEqual(Array.toString(), nativeArray.toString(), 'Array.toString() returns the original value');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace part of the argument in JSON.parse if pattern matches', (assert) => {
    const expectedObject = {
        adblock: false,
        content: 'fooBar',
    };

    runScriptlet(name, ['JSON.parse', '0', 'replace:/"adblock": true/"adblock": false/', 'adblock']);

    const jsonString = '{ "adblock": true, "content": "fooBar" }';
    const result = JSON.parse(jsonString);

    assert.deepEqual(result, expectedObject, 'Replaced `"adblock": true` with `"adblock": false`');
    assert.strictEqual(
        JSON.parse.toString(),
        nativeJSONParse.toString(),
        'JSON.parse.toString() returns the original value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace part of the argument in JSON.parse if pattern matches - regex with "g" flag', (assert) => {
    const expectedObject = {
        no_ads1: 1,
        no_ads2: 2,
        content: 'fooBar',
        no_ads3: 3,
    };

    runScriptlet(name, ['JSON.parse', '0', 'replace:/ads/no_ads/g', 'ads']);

    const jsonString = '{ "ads1": 1, "ads2": 2, "content": "fooBar", "ads3": 3 }';
    const result = JSON.parse(jsonString);

    assert.deepEqual(result, expectedObject, 'Replaced "ads" with "no_ads"');
    assert.strictEqual(
        JSON.parse.toString(),
        nativeJSONParse.toString(),
        'JSON.parse.toString() returns the original value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace argument in document.querySelector to "body" if pattern matches', (assert) => {
    const expected = 'body';
    runScriptlet(name, ['document.querySelector', '0', 'body', 'div']);

    const result = document.querySelector('div');

    assert.strictEqual(result.tagName.toLowerCase(), expected, `"tagName" should be "${expected}"`);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Log arguments only before replacing', (assert) => {
    assert.expect(3);
    const expected = 'body';
    let testPassed1 = false;

    // Override console.log to check if the log contains the expected messages
    const wrapperLog = (target, thisArg, args) => {
        const logContent = args[0];
        if (logContent.includes('document.querySelector original arguments:')) {
            testPassed1 = true;
        }
        return Reflect.apply(target, thisArg, args);
    };
    const handlerLog = {
        apply: wrapperLog,
    };
    window.console.log = new Proxy(window.console.log, handlerLog);

    runScriptlet(name, ['document.querySelector', '', '', '', '', 'true']);

    const result = document.querySelector('body');

    assert.strictEqual(result.tagName.toLowerCase(), expected, `"tagName" should be "${expected}"`);
    assert.ok(testPassed1, 'Log should contain "document.querySelector original arguments:"');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('Log arguments before and after replacing', (assert) => {
    assert.expect(4);
    const expected = 'body';
    let testPassed1 = false;
    let testPassed2 = false;

    // Override console.log to check if the log contains the expected messages
    const wrapperLog = (target, thisArg, args) => {
        const logContent = args[0];
        if (logContent.includes('document.querySelector original arguments:')) {
            testPassed1 = true;
        }
        if (logContent.includes('document.querySelector modified arguments:')) {
            testPassed2 = true;
        }
        return Reflect.apply(target, thisArg, args);
    };
    const handlerLog = {
        apply: wrapperLog,
    };
    window.console.log = new Proxy(window.console.log, handlerLog);

    runScriptlet(name, ['document.querySelector', '0', 'body', 'a', '', 'true']);

    const result = document.querySelector('a');

    assert.strictEqual(result.tagName.toLowerCase(), expected, `"tagName" should be "${expected}"`);
    assert.ok(testPassed1, 'Log should contain "document.querySelector original arguments:"');
    assert.ok(testPassed2, 'Log should contain "document.querySelector modified arguments:"');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace argument in MutationObserver constructor to "noopFunc" if pattern matches', (assert) => {
    assert.expect(3);
    const done = assert.async();

    runScriptlet(name, ['MutationObserver', '0', 'noopFunc', 'valueShouldNotChange']);

    let valueShouldNotChange = true;
    const mutationCallbackToPrevent = () => {
        valueShouldNotChange = false;
    };
    const observerToPrevent = new MutationObserver(mutationCallbackToPrevent);
    observerToPrevent.observe(document.body, { childList: true });

    let valueShouldChange = true;
    const mutationCallback = () => {
        valueShouldChange = false;
    };
    const observer = new MutationObserver(mutationCallback);
    observer.observe(document.body, { childList: true });

    document.body.appendChild(document.createElement('div'));

    // Callback in MutationObserver is not invoked immediately, so it's necessary to use setTimeout
    setTimeout(() => {
        observerToPrevent.disconnect();
        observer.disconnect();
        assert.strictEqual(valueShouldChange, false, '"valueShouldChange" should be "false"');
        assert.strictEqual(valueShouldNotChange, true, '"valueShouldNotChange" should be "true"');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    }, 100);
});

test('Replace argument in Object.defineProperty if pattern matches, test for "json:"', (assert) => {
    const expected = 'disabled';
    const objectIntact = {};
    const objectToReplace = {};

    runScriptlet(name, ['Object.defineProperty', '2', 'json:{"value": "disabled"}', 'enabled']);

    Object.defineProperty(objectIntact, 'foo', { value: 'bar' });
    Object.defineProperty(objectToReplace, 'adblock', { value: 'enabled' });

    assert.strictEqual(objectIntact.foo, 'bar', "The property 'foo' should be 'bar'");
    assert.strictEqual(objectToReplace.adblock, expected, `"The property 'adblock' should be '${expected}'`);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});
