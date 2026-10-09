/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps, useFirefoxStackTraceFormat } from '../helpers';
import { noopFunc } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'trusted-suppress-native-method';

// eslint-disable-next-line no-unused-vars
const testMatching = (arg1, arg2, arg3) => true;

// Links to the original methods to restore them after each test
const natives = {
    // Methods of storages are replaced in Storage.prototype
    'Storage.prototype.getItem': Storage.prototype.getItem,
    'Storage.prototype.setItem': Storage.prototype.setItem,
    'Object.prototype.hasOwnProperty': Object.prototype.hasOwnProperty,
    'Array.isArray': Array.isArray,
    'Node.prototype.appendChild': Node.prototype.appendChild,
    'Document.prototype.querySelectorAll': Document.prototype.querySelectorAll,
    'Document.prototype.querySelector': Document.prototype.querySelector,
};

const restoreNativeMethod = (path) => {
    const pathChunks = path.split('.');

    switch (pathChunks.length) {
        case 2:
            window[pathChunks[0]][pathChunks[1]] = natives[path];
            break;
        case 3:
            window[pathChunks[0]][pathChunks[1]][pathChunks[2]] = natives[path];
            break;
        default:
            console.error('Unknown path');
    }
};

const beforeEach = () => {
    window.testMatching = testMatching;
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.testMatching = testMatching;
    Object.keys(natives).forEach(restoreNativeMethod);
    clearGlobalProps('hit', '__debug');
    localStorage.clear();
    sessionStorage.clear();
};

module(name, { beforeEach, afterEach });

test('Basic prevention', (assert) => {
    let item = window.localStorage.getItem('test-key');
    assert.strictEqual(item, null, 'Item is not set');

    runScriptlet(name, ['localStorage.setItem', '/key/|"test-value"', 'prevent']);

    window.localStorage.setItem('test-key', 'test-value-1');
    item = window.localStorage.getItem('test-key');
    assert.strictEqual(item, null, 'Call was prevented');

    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Basic abortion', (assert) => {
    runScriptlet(name, ['sessionStorage.getItem', '"test-value"']);

    assert.throws(
        () => {
            window.sessionStorage.getItem('test-value');
        },
        ' Call was aborted with an error',
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Preventing specific methods', (assert) => {
    const obj = { test: 1 };
    runScriptlet(name, ['Object.prototype.hasOwnProperty', '"test"', 'prevent']);
    // eslint-disable-next-line no-prototype-builtins
    assert.notOk(obj.hasOwnProperty('test'), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');

    // Match html element argument as an object
    const preventedElement = document.createElement('div');
    preventedElement.id = 'prevented-id';
    const skippedElement = document.createElement('div');
    skippedElement.id = 'skipped-id';

    assert.notOk(document.getElementById(preventedElement.id), 'Element 1 is not yet appended to the document');
    assert.notOk(document.getElementById(skippedElement.id), 'Element 2 is not yet appended to the document');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    runScriptlet(name, ['Node.prototype.appendChild', `{ "id": "${preventedElement.id}" }`, 'prevent']);

    document.body.appendChild(skippedElement);
    assert.ok(document.getElementById(skippedElement.id), 'Unmatched element was successfully appended');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    document.body.appendChild(preventedElement);
    assert.notOk(document.getElementById(preventedElement.id), 'Prevented matched element from being appended');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');

    // Prevent calls to document.querySelectorAll
    let divs = document.querySelectorAll('div');
    assert.ok(divs.length, 'Call was not prevented');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    runScriptlet(name, ['Document.prototype.querySelectorAll', '"div"', 'prevent']);

    divs = document.querySelectorAll('div');
    assert.strictEqual(divs, undefined, 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');
});

test('Handling possible infinite recursion when trapping methods which are used by the scriptlet', (assert) => {
    runScriptlet(name, ['Array.isArray', '[]', 'prevent']);

    assert.strictEqual(Array.isArray([]), undefined, 'Call was prevented');

    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');
});

test('Match: string by string and regexp', (assert) => {
    const stringArgument = 'string-arg1234';
    const noMatchArguments = [400, undefined, { test: 1 }, null, false, noopFunc, 'not-the-string'];

    const stringMatcher = 'ng-ar';
    const regexpMatcher = /arg\d+/;

    runScriptlet(name, ['testMatching', `"${stringMatcher}"|${regexpMatcher}`, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(stringArgument, noMatchArguments[0]), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(stringArgument, stringArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: empty string', (assert) => {
    const emptyString = '';
    const noMatchArguments = ['string', 400, undefined, { test: 1 }, null, false, noopFunc, 'not-the-string'];

    runScriptlet(name, ['testMatching', '""|""', 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(emptyString, noMatchArguments[0]), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(emptyString, emptyString), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: number by exact number', (assert) => {
    const numberArgument = 1234;
    const noMatchArguments = ['string', undefined, { test: 1 }, null, false, noopFunc, 400];

    runScriptlet(name, ['testMatching', `${numberArgument}| `, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(noMatchArguments[0], noMatchArguments[1]), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(numberArgument, numberArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: boolean by exact boolean', (assert) => {
    const trueArgument = true;
    const falseArgument = false;
    const noMatchArguments = ['string', undefined, { test: 1 }, null, false, noopFunc, true];

    runScriptlet(name, ['testMatching', `${trueArgument}|${falseArgument}`, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(falseArgument, trueArgument), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(trueArgument, falseArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: undefined by undefined', (assert) => {
    const undefinedArgument = undefined;
    const noMatchArguments = ['string', 400, { test: 1 }, null, false, noopFunc, true];

    runScriptlet(name, ['testMatching', `${undefinedArgument}`, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(noMatchArguments[0], noMatchArguments[1]), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(undefinedArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: null by null', (assert) => {
    const nullArgument = null;
    const noMatchArguments = ['string', 400, { test: 1 }, undefined, false, noopFunc, true];

    runScriptlet(name, ['testMatching', `${nullArgument}`, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(noMatchArguments[0], noMatchArguments[1]), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(nullArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: object by object', (assert) => {
    const objectArgument = {
        test: 1, prop: 'string-test', a: false, b: null,
    };
    const noMatchArguments = ['string', 400, null, undefined, false, noopFunc, true, { c: false }];

    const objectMatcher1 = JSON.stringify({ test: 1 });
    const objectMatcher2 = JSON.stringify({ prop: 'string-test' });

    runScriptlet(name, ['testMatching', `${objectMatcher1}|${objectMatcher2}`, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(objectMatcher1, { c: false }), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));
    // Not preventing single-argument call when multiple arguments are expected
    assert.ok(window.testMatching(objectArgument), 'Unmatched call was not prevented');

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(objectArgument, objectArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: array by array', (assert) => {
    const testObject = { prop: 'name' };
    const testArray = [1, 'string-test', false, null];

    const arrayArgument = [1, 'string-test', false, null, testObject, testArray];
    const noMatchArray = [1, 'string-test', false, null, testObject];
    const noMatchArguments = ['string', 400, null, undefined, false, noopFunc, true, [1, 'string-test', false]];

    const arrayMatcher = JSON.stringify(['string-test', null, testObject, testArray]);

    runScriptlet(name, ['testMatching', `${arrayMatcher}| `, 'prevent']);

    // Not preventing unmatched calls with single and multiple arguments
    assert.ok(window.testMatching(noMatchArray), 'Unmatched call was not prevented');
    noMatchArguments.forEach((arg) => assert.ok(window.testMatching(arg), 'Unmatched call was not prevented'));

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.notOk(window.testMatching(arrayArgument), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Match: not by function', (assert) => {
    const functionArgument = () => {};
    const noMatchArguments = ['string', 400, null, undefined, false, true, { test: 1 }];

    runScriptlet(name, ['testMatching', `${functionArgument}`, 'prevent']);

    noMatchArguments.forEach((arg) => {
        runScriptlet(name, ['testMatching', `${arg}`, 'prevent']);

        assert.ok(window.testMatching(functionArgument), 'Unmatched call was not prevented');

        window.testMatching = testMatching;
    });

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});

test('Match: stack trace', (assert) => {
    const stackArg = name;

    runScriptlet(name, [
        'localStorage.getItem',
        '"test"',
        'prevent',
        'not-a-stack',
    ]);

    assert.ok(testMatching('test'), 'Ignored call with non-matching stack');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    runScriptlet(name, [
        'testMatching',
        '"test"',
        'prevent',
        stackArg,
    ]);

    assert.notOk(window.testMatching('test'), 'Call was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');

    runScriptlet(name, [
        'Document.prototype.querySelector',
        '"body"',
        'prevent',
        'testFunc',
    ]);

    const testFunc = () => document.querySelector('body');
    const result = testFunc();
    assert.strictEqual(result, undefined, 'testFunc should return undefined when prevented');

    const test = () => document.querySelector('body');
    const result2 = test();
    assert.ok(result2 instanceof HTMLElement, 'test should return HTMLElement, stack does not match');

    const testFunc1 = () => document.querySelector('body');
    const result3 = testFunc1();
    assert.strictEqual(result3, undefined, 'testFunc1 should return undefined when prevented');
});

test('Regexp with pipe as signatureStr', (assert) => {
    let item = window.localStorage.getItem('key1');
    assert.strictEqual(item, null, 'Item is not set');

    runScriptlet(name, ['localStorage.setItem', '/(key1|key2)/|"value"', 'prevent']);

    window.localStorage.setItem('key1', 'test-value-1');
    item = window.localStorage.getItem('key1');
    assert.strictEqual(item, null, 'Call with "key" regexp part was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');

    window.localStorage.setItem('key2', 'test-value-2');
    item = window.localStorage.getItem('key2');
    assert.strictEqual(item, null, 'Call with "key2" regexp part was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
    clearGlobalProps('hit');

    window.localStorage.setItem('other3', 'test-value-3');
    item = window.localStorage.getItem('other3');
    assert.strictEqual(item, 'test-value-3', 'Call with "other3" regexp part was not prevented');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    clearGlobalProps('hit');
});

test('Match: stack trace in Firefox stack trace format', (assert) => {
    runScriptlet(name, ['testMatching', '"test"', 'prevent', 'testStackFunction']);
    const testStackFunction = () => window.testMatching('test');
    const otherFunction = () => window.testMatching('test');

    // Stack trace of Firefox and Safari has no error message line,
    // so the frame of the function which calls the method should not be removed as the scriptlet's own one
    const restoreStackTraceFormat = useFirefoxStackTraceFormat();
    let matchingResult;
    let otherResult;
    try {
        otherResult = otherFunction();
        matchingResult = testStackFunction();
    } finally {
        restoreStackTraceFormat();
    }

    assert.ok(otherResult, 'Call with NOT matching stack is not prevented');
    assert.strictEqual(matchingResult, undefined, 'Call with matching stack is prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: does not store an item named after the method', (assert) => {
    runScriptlet(name, ['localStorage.setItem', '/key/|"test-value"', 'prevent']);

    localStorage.setItem('test-key', 'test-value');

    assert.strictEqual(localStorage.getItem('test-key'), null, 'Call was prevented');
    assert.strictEqual(localStorage.getItem('setItem'), null, 'Item named after the method was not stored');
    assert.notOk(Object.prototype.hasOwnProperty.call(localStorage, 'setItem'), 'Storage has no own method');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Storage method: matches only calls on the storage of the rule', (assert) => {
    runScriptlet(name, ['localStorage.setItem', '/key/|"test-value"', 'prevent']);

    sessionStorage.setItem('test-key', 'test-value');
    assert.strictEqual(sessionStorage.getItem('test-key'), 'test-value', 'Call on sessionStorage was not prevented');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    Storage.prototype.setItem.call(localStorage, 'test-key', 'test-value');
    assert.strictEqual(localStorage.getItem('test-key'), null, 'Call on localStorage via the prototype was prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});

test('Storage method: rules for both storages', (assert) => {
    runScriptlet(name, ['localStorage.setItem', '"local-key"', 'prevent']);
    runScriptlet(name, ['sessionStorage.setItem', '"session-key"', 'prevent']);

    localStorage.setItem('local-key', 'value');
    localStorage.setItem('session-key', 'value');
    sessionStorage.setItem('local-key', 'value');
    sessionStorage.setItem('session-key', 'value');

    assert.strictEqual(localStorage.getItem('local-key'), null, 'localStorage rule prevented its call');
    assert.strictEqual(localStorage.getItem('session-key'), 'value', 'sessionStorage rule ignored localStorage');
    assert.strictEqual(sessionStorage.getItem('local-key'), 'value', 'localStorage rule ignored sessionStorage');
    assert.strictEqual(sessionStorage.getItem('session-key'), null, 'sessionStorage rule prevented its call');
});

test('Error during matching does not disable the rule', (assert) => {
    runScriptlet(name, ['testMatching', '{"key":"value"}', 'prevent']);
    const throwingArgument = {
        get key() {
            throw new Error('Getter error');
        },
    };

    assert.ok(window.testMatching(throwingArgument), 'Call which cannot be matched is not prevented');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.notOk(window.testMatching({ key: 'value' }), 'Next matching call is prevented');
    assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
});
