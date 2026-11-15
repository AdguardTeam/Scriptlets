/* eslint-disable no-underscore-dangle, no-console, no-eval */
import {
    runScriptlet,
    clearGlobalProps,
    saveStorageMethods,
    useThrowingErrorConstructor,
    getSyncLogs,
} from '../helpers';

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

test('does not convert an error without a message to log it', (assert) => {
    window.receivingFunc = () => 'result';
    runScriptlet(name, ['receivingFunc', '0', 'replaced', 'pattern']);

    let toJSONCalls = 0;
    const pageError = {
        toJSON() {
            toJSONCalls += 1;
            return 'page error';
        },
    };
    const throwingArgument = () => {};
    throwingArgument.toString = () => {
        throw pageError;
    };

    let result;
    getSyncLogs(() => {
        result = window.receivingFunc(throwingArgument);
    });

    assert.strictEqual(result, 'result', 'Result of the method returned');
    assert.strictEqual(toJSONCalls, 0, 'Error not converted by its toJSON()');

    clearGlobalProps('receivingFunc');
});

test('matches an argument by its string value if it cannot be stringified as JSON', (assert) => {
    let receivedArgument;
    window.receivingFunc = (arg) => {
        receivedArgument = arg;
        return 'result';
    };
    runScriptlet(name, ['receivingFunc', '0', 'replaced', 'pattern']);

    // Error which cannot be converted to a string
    const pageError = Object.create(null);
    const argument = {
        toJSON() {
            throw pageError;
        },
        toString() {
            return 'pattern';
        },
    };

    let result;
    getSyncLogs(() => {
        result = window.receivingFunc(argument);
    });

    assert.strictEqual(result, 'result', 'Result of the method returned');
    assert.strictEqual(receivedArgument, 'replaced', 'Argument matched by its string value and replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('receivingFunc');
});

test('calls the intercepted method with the original arguments if the replacement fails with null', (assert) => {
    let calls = 0;
    let receivedArgument;
    window.receivingFunc = (arg) => {
        calls += 1;
        receivedArgument = arg;
        return 'result';
    };
    runScriptlet(name, ['receivingFunc', '0', 'replaced', 'pattern']);

    // `null` has no message to read
    const throwingArgument = () => {};
    throwingArgument.toString = () => {
        // eslint-disable-next-line no-throw-literal
        throw null;
    };

    let result;
    const logs = getSyncLogs(() => {
        result = window.receivingFunc(throwingArgument);
    });

    assert.strictEqual(result, 'result', 'Result of the method returned');
    assert.strictEqual(calls, 1, 'Method called once');
    // QUnit converts the values of `strictEqual()` to strings, which throws for this argument
    assert.ok(receivedArgument === throwingArgument, 'Original argument passed');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.ok(
        logs.includes(`${name}: Unexpected error during argument replacement: null`),
        'Error logged with its message',
    );

    clearGlobalProps('receivingFunc');
});

test('calls the intercepted method with the original arguments if Error replaced by the page throws null', (assert) => {
    let calls = 0;
    window.receivingFunc = (arg) => {
        calls += 1;
        return arg;
    };
    runScriptlet(name, ['receivingFunc', '0', 'replaced', '', 'testStackFunction']);
    const testStackFunction = () => window.receivingFunc('original');

    // Stack trace for `stack` cannot be created, and `null` has no message,
    // so it is converted to a string without creating another error
    let result;
    const logs = getSyncLogs(() => {
        const restoreError = useThrowingErrorConstructor(null);
        try {
            result = testStackFunction();
        } finally {
            restoreError();
        }
    });

    assert.strictEqual(result, 'original', 'Method called with the original argument');
    assert.strictEqual(calls, 1, 'Method called once');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.ok(
        logs.includes(`${name}: Unexpected error during argument replacement: null`),
        'Error logged with its message',
    );
    assert.strictEqual(testStackFunction(), 'replaced', 'Argument replaced for the next matching call');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('receivingFunc');
});

const nativeStringIncludes = String.prototype.includes;
const nativeStringSplit = String.prototype.split;
const nativeRegExpTest = RegExp.prototype.test;
const nativeGetElementById = window.document.getElementById;
const nativeMathMax = Math.max;

const restoreUboTestMethods = () => {
    // eslint-disable-next-line no-extend-native
    String.prototype.includes = nativeStringIncludes;
    // eslint-disable-next-line no-extend-native
    String.prototype.split = nativeStringSplit;
    // eslint-disable-next-line no-extend-native
    RegExp.prototype.test = nativeRegExpTest;
    window.document.getElementById = nativeGetElementById;
    Math.max = nativeMathMax;
    afterEach();
};

// Rules from AdGuard filter lists
module(`${name} with AdGuard rules`, { beforeEach, afterEach: restoreUboTestMethods });

test('replace: in Element.prototype.setAttribute', (assert) => {
    // eslint-disable-next-line max-len
    // buienalarm.nl,…#%#//scriptlet('trusted-replace-argument', 'Element.prototype.setAttribute', '1', 'replace:/.+(error-report|new Promise|:window|&&window,|\|\|window,|void 0\]|html-load\.com[\s\S]*_onerror).+//g')
    runScriptlet(name, [
        'Element.prototype.setAttribute',
        '1',
        // eslint-disable-next-line max-len
        'replace:/.+(error-report|new Promise|:window|&&window,|\\|\\|window,|void 0\\]|html-load\\.com[\\s\\S]*_onerror).+//g',
    ]);
    const element = document.createElement('div');
    element.setAttribute('onload', 'fetch("/error-report", { method: "POST" })');
    element.setAttribute('title', 'Weather');

    assert.strictEqual(element.getAttribute('onload'), '', 'matched value replaced');
    assert.strictEqual(element.getAttribute('title'), 'Weather', 'other value kept');
});

test('number in Math.max', (assert) => {
    // idlixku.com#%#//scriptlet('trusted-replace-argument', 'Math.max', '0', '0', '/^7$/')
    runScriptlet(name, ['Math.max', '0', '0', '/^7$/']);

    assert.strictEqual(Math.max(7, -1), 0, 'matched argument replaced');
    assert.strictEqual(Math.max(8, -1), 8, 'other argument kept');
});

test('text in sessionStorage.getItem', (assert) => {
    // fibwatch.art#%#//scriptlet('trusted-replace-argument', 'sessionStorage.getItem', '0', 'no_ads', 'w2pass_')
    sessionStorage.setItem('no_ads', 'passed');
    runScriptlet(name, ['sessionStorage.getItem', '0', 'no_ads', 'w2pass_']);

    assert.strictEqual(sessionStorage.getItem('w2pass_123'), 'passed', 'key replaced');
    sessionStorage.removeItem('no_ads');
});

test('this in String.prototype.includes', (assert) => {
    // eslint-disable-next-line max-len
    // cap3.*##+js(trusted-replace-argument, String.prototype.includes, this, 'json:"mozilla/5.0 …chrome/145.0.0.0…"', condition, mozilla/5.0),
    // in AdGuard syntax
    runScriptlet(name, ['String.prototype.includes', 'this', 'replace:/firefox/chrome/', 'mozilla/5.0']);

    const isChrome = 'mozilla/5.0 (x11; linux x86_64; rv:130.0) gecko/20100101 firefox/130.0'.includes('chrome');
    const other = 'example firefox'.includes('chrome');
    // eslint-disable-next-line no-extend-native
    String.prototype.includes = nativeStringIncludes;
    assert.strictEqual(isChrome, true, 'object of the call replaced');
    assert.strictEqual(other, false, 'object not matched by the pattern kept');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('this in String.prototype.split', (assert) => {
    // eslint-disable-next-line max-len
    // aether.mom##+js(trusted-replace-argument, String.prototype.split, this, , condition, 'null,http'), in AdGuard syntax,
    // which requires a value, so the matched text is removed by `replace:`
    runScriptlet(name, ['String.prototype.split', 'this', 'replace:/^null,http.*//', 'null,http']);

    const parts = 'null,https://ads.example'.split(',');
    const other = 'a,b'.split(',');
    // eslint-disable-next-line no-extend-native
    String.prototype.split = nativeStringSplit;
    assert.deepEqual(parts, [''], 'object of the call replaced');
    assert.deepEqual(other, ['a', 'b'], 'object not matched by the pattern kept');
});

// Rules from uBO filter lists, converted to AdGuard syntax by AGTree,
// so that their arguments are the same as received by the scriptlet
module(`${name} with uBO arguments`, { beforeEach, afterEach: restoreUboTestMethods });

test('repl: in JSON.parse with condition', (assert) => {
    // eslint-disable-next-line max-len
    // bild.de##+js(trusted-replace-argument, JSON.parse, 0, repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/, condition, adBlockWallEnabled)
    runScriptlet('ubo-trusted-replace-argument', [
        'JSON.parse',
        '0',
        'repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/',
        'condition',
        'adBlockWallEnabled',
    ]);

    assert.deepEqual(JSON.parse('{"adBlockWallEnabled":true}'), { adBlockWallEnabled: false }, 'replaced');
    assert.deepEqual(JSON.parse('{"other":true}'), { other: true }, 'not matched by condition');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('repl: with escaped regular expression in RegExp.prototype.test', (assert) => {
    // mega.nz##+js(trusted-replace-argument, RegExp.prototype.test, 0, repl:/\.mp4$/.mp3/, condition, .mp4)
    runScriptlet('ubo-trusted-replace-argument', [
        'RegExp.prototype.test',
        '0',
        'repl:/\\.mp4$/.mp3/',
        'condition',
        '.mp4',
    ]);

    const isAudio = /\.mp3$/.test('video.mp4');
    // eslint-disable-next-line no-extend-native
    RegExp.prototype.test = nativeRegExpTest;
    assert.strictEqual(isAudio, true, 'argument replaced');
});

test('json: in document.getElementById with regular expression condition', (assert) => {
    // eslint-disable-next-line max-len
    // enternity.gr##+js(trusted-replace-argument, document.getElementById, 0, json:"header", condition, /^[A-Za-z]{12}$/)
    const header = document.createElement('div');
    header.id = 'header';
    document.body.appendChild(header);
    runScriptlet('ubo-trusted-replace-argument', [
        'document.getElementById',
        '0',
        'json:"header"',
        'condition',
        '/^[A-Za-z]{12}$/',
    ]);

    assert.strictEqual(document.getElementById('AbcdefGhijkl'), header, 'random id replaced');
    assert.strictEqual(document.getElementById('missing-id'), null, 'other id kept');
    header.remove();
});

test('null in document.getElementById', (assert) => {
    // copyseeker.net##+js(trusted-replace-argument, document.getElementById, 0, null, condition, adsense-container)
    const container = document.createElement('div');
    container.id = 'adsense-container';
    document.body.appendChild(container);
    runScriptlet('ubo-trusted-replace-argument', [
        'document.getElementById',
        '0',
        'null',
        'condition',
        'adsense-container',
    ]);

    assert.strictEqual(document.getElementById('adsense-container'), null, 'argument replaced with null');
    container.remove();
});

test('{"value": …} in document.querySelector', (assert) => {
    // eslint-disable-next-line max-len
    // purepeople.com##+js(trusted-replace-argument, document.querySelector, 0, {"value": ".ad-placement-interstitial"}, condition, .easyAdsBox)
    const placement = document.createElement('div');
    placement.className = 'ad-placement-interstitial';
    document.body.appendChild(placement);
    runScriptlet('ubo-trusted-replace-argument', [
        'document.querySelector',
        '0',
        '{"value": ".ad-placement-interstitial"}',
        'condition',
        '.easyAdsBox',
    ]);

    assert.strictEqual(document.querySelector('.easyAdsBox'), placement, 'selector replaced');
    placement.remove();
});

test('this in String.prototype.includes', (assert) => {
    // eslint-disable-next-line max-len
    // cap3.*##+js(trusted-replace-argument, String.prototype.includes, this, 'json:"mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/145.0.0.0 safari/537.36"', condition, mozilla/5.0)
    runScriptlet('ubo-trusted-replace-argument', [
        'String.prototype.includes',
        'this',
        // eslint-disable-next-line max-len
        'json:"mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/145.0.0.0 safari/537.36"',
        'condition',
        'mozilla/5.0',
    ]);

    const isChrome = 'mozilla/5.0 (x11; linux x86_64; rv:130.0) gecko/20100101 firefox/130.0'.includes('chrome/145');
    const other = 'example'.includes('chrome/145');
    // eslint-disable-next-line no-extend-native
    String.prototype.includes = nativeStringIncludes;
    assert.strictEqual(isChrome, true, 'object of the call replaced');
    assert.strictEqual(other, false, 'other object kept');
});

test('empty value of this in String.prototype.split', (assert) => {
    // aether.mom##+js(trusted-replace-argument, String.prototype.split, this, , condition, 'null,http')
    runScriptlet('ubo-trusted-replace-argument', ['String.prototype.split', 'this', '', 'condition', 'null,http']);

    const parts = 'null,https://ads.example'.split(',');
    // eslint-disable-next-line no-extend-native
    String.prototype.split = nativeStringSplit;
    assert.deepEqual(parts, [''], 'object of the call replaced with an empty string');
});

test('negative position replaces no argument, as in uBO', (assert) => {
    runScriptlet('ubo-trusted-replace-argument', ['JSON.parse', '-1', 'json:"[1]"']);

    assert.deepEqual(JSON.parse('[0]'), [0], 'argument kept');
});

test('other text is undefined, as in uBO', (assert) => {
    // imagereviser.com##+js(trusted-replace-argument, getComputedStyle, 0, body, condition, getComputedStyle),
    // with document.getElementById instead, as replacing the argument of getComputedStyle with undefined throws
    runScriptlet('ubo-trusted-replace-argument', ['document.getElementById', '0', 'body', 'condition', 'ubo-text']);

    const element = document.createElement('div');
    element.id = 'undefined';
    document.body.appendChild(element);
    assert.strictEqual(document.getElementById('ubo-text'), element, 'argument replaced with undefined');
    element.remove();
});

test.each('uBO names', ['ubo-trusted-replace-argument.js', 'ubo-trusted-replace-argument'], (assert, uboName) => {
    // eslint-disable-next-line max-len
    // bild.de##+js(trusted-replace-argument, JSON.parse, 0, repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/, condition, adBlockWallEnabled)
    runScriptlet(uboName, [
        'JSON.parse',
        '0',
        'repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/',
        'condition',
        'adBlockWallEnabled',
    ]);

    assert.deepEqual(
        JSON.parse('{"adBlockWallEnabled":true}'),
        { adBlockWallEnabled: false },
        'uBO arguments are used',
    );
});
