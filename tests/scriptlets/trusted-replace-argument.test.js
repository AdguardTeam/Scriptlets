/* eslint-disable no-underscore-dangle, no-console, no-eval */
import { runScriptlet, clearGlobalProps, saveStorageMethods } from '../helpers';

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
const nativeStringReplace = String.prototype.replace;
const nativeSetAttribute = window.Element.prototype.setAttribute;
const nativeJSONStringify = window.JSON.stringify;

// Scriptlets replace methods of storages in Storage.prototype
const restoreStorage = saveStorageMethods();

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
    window.String.prototype.replace = nativeStringReplace;
    window.Element.prototype.setAttribute = nativeSetAttribute;
    window.JSON.stringify = nativeJSONStringify;
    restoreStorage();
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

test('Replace argument in JSON.parse after earlier error inside the scriptlet', (assert) => {
    // Test to check if the scriptlet works correctly
    // after an error occurred inside the scriptlet code while matching was suspended
    runScriptlet(name, ['JSON.parse', '0', 'replace:/ads/no_ads/g', 'ads']);

    try {
        // String conversion of the argument throws,
        // so the error occurs inside the scriptlet during pattern matching
        const throwingArgument = () => {};
        throwingArgument.toString = () => {
            throw new Error('test error');
        };
        JSON.parse(throwingArgument);
    } catch (error) {
        console.error('An error occurred:', error);
    }

    const jsonString = '{ "ads1": 1, "content": "fooBar" }';
    const result = JSON.parse(jsonString);

    assert.deepEqual(result, { no_ads1: 1, content: 'fooBar' }, 'Replaced "ads" with "no_ads" after the error');
    assert.strictEqual(
        JSON.parse.toString(),
        nativeJSONParse.toString(),
        'JSON.parse.toString() returns the original value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Replace argument in String.prototype.replace to "test" if pattern matches', (assert) => {
    // Test to check if "Maximum call stack size exceeded" error is avoided
    // when the scriptlet uses a property that is also used inside the scriptlet code
    runScriptlet(name, ['String.prototype.replace', '1', 'test', 'foo']);

    const string = 'regex';
    const result = string.replace(/regex/, 'foo bar');

    assert.strictEqual(result, 'test', 'The scriptlet should change the method result');
    assert.strictEqual(
        String.prototype.replace.toString(),
        nativeStringReplace.toString(),
        'String.prototype.replace.toString() returns the original value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Non-string argument stays intact when "replace:" pattern does not match', (assert) => {
    runScriptlet(name, ['Element.prototype.setAttribute', '1', 'replace:/whatever/test/g']);

    const div = document.createElement('div');
    div.setAttribute('data-attr', 1234);

    assert.strictEqual(div.getAttribute('data-attr'), '1234', 'Numeric attribute value should stay intact');
    assert.strictEqual(
        Element.prototype.setAttribute.toString(),
        nativeSetAttribute.toString(),
        'setAttribute.toString() returns the original value',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Non-string argument keeps its type when "replace:" pattern does not match', (assert) => {
    runScriptlet(name, ['JSON.stringify', '0', 'replace:/whatever/test/g']);

    const result = JSON.stringify(1234);

    // Would be '"test"' if the number was blindly replaced with the replacement string,
    // and '"1234"' if the number was coerced to a string despite the non-matching regex
    assert.strictEqual(result, '1234', 'Number argument should keep its value and type');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Non-string argument is replaced when "replace:" pattern matches its string form', (assert) => {
    runScriptlet(name, ['Element.prototype.setAttribute', '1', 'replace:/23/98/']);

    const div = document.createElement('div');
    div.setAttribute('data-attr', 1234);

    assert.strictEqual(div.getAttribute('data-attr'), '1984', 'Matching part of the numeric value is replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Non-string constructor argument stays intact when "replace:" pattern does not match', (assert) => {
    runScriptlet(name, ['Array', '1', 'replace:/whatever/test/g']);

    // eslint-disable-next-line no-array-constructor
    const result = new Array(1, 2, 3);

    assert.deepEqual(result, [1, 2, 3], 'Constructor arguments should stay intact');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: replaces the argument of localStorage.setItem', (assert) => {
    runScriptlet(name, ['localStorage.setItem', '1', 'replace:/true/false/', 'ads']);
    localStorage.setItem('config', '{"ads":true}');
    sessionStorage.setItem('config', '{"ads":true}');

    assert.strictEqual(localStorage.getItem('config'), '{"ads":false}', 'Argument replaced');
    assert.strictEqual(sessionStorage.getItem('config'), '{"ads":true}', 'Argument of sessionStorage not replaced');
    assert.strictEqual(localStorage.getItem('setItem'), null, 'Item named after the method was not stored');
    assert.notOk(Object.prototype.hasOwnProperty.call(localStorage, 'setItem'), 'Storage has no own method');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: does not call the method on another storage again if it throws', (assert) => {
    runScriptlet(name, ['localStorage.setItem', '1', 'replace:/true/false/', 'ads']);

    let keyConversions = 0;
    const key = {
        toString() {
            keyConversions += 1;
            if (keyConversions === 1) {
                throw new Error('Key conversion error');
            }
            return 'config';
        },
    };

    assert.throws(() => sessionStorage.setItem(key, '{"ads":true}'), /Key conversion error/, 'Error thrown');
    assert.strictEqual(keyConversions, 1, 'Method called once');
    assert.strictEqual(sessionStorage.getItem('config'), null, 'Item not stored');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test('calls the intercepted method once if it throws', (assert) => {
    let calls = 0;
    window.throwingFunc = (arg) => {
        calls += 1;
        throw new Error(`Page error: ${arg}`);
    };
    runScriptlet(name, ['throwingFunc', '0', 'replaced']);

    assert.throws(() => window.throwingFunc('original'), /Page error: replaced/, 'Error of the method thrown');
    assert.strictEqual(calls, 1, 'Method called once');

    clearGlobalProps('throwingFunc');
});

test('calls the intercepted constructor once if it throws', (assert) => {
    let calls = 0;
    window.ThrowingConstructor = function ThrowingConstructor() {
        calls += 1;
        throw new Error('Constructor error');
    };
    runScriptlet(name, ['ThrowingConstructor', '0', 'replaced']);

    assert.throws(() => new window.ThrowingConstructor('original'), /Constructor error/, 'Error thrown');
    assert.strictEqual(calls, 1, 'Constructor called once');

    clearGlobalProps('ThrowingConstructor');
});

test('calls the intercepted method once with the original arguments if the replacement fails', (assert) => {
    let calls = 0;
    let receivedArgument;
    window.receivingFunc = (arg) => {
        calls += 1;
        receivedArgument = arg;
        return 'result';
    };
    runScriptlet(name, ['receivingFunc', '0', 'replaced', 'pattern']);

    // Argument cannot be converted to a string to be matched with the pattern
    const throwingArgument = () => {};
    throwingArgument.toString = () => {
        throw new Error('Conversion error');
    };

    assert.strictEqual(window.receivingFunc(throwingArgument), 'result', 'Result of the method returned');
    assert.strictEqual(calls, 1, 'Method called once');
    // QUnit converts the values of `strictEqual()` to strings, which throws for this argument
    assert.ok(receivedArgument === throwingArgument, 'Original argument passed');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');

    clearGlobalProps('receivingFunc');
});
