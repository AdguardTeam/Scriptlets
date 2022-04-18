import {
    toRegExp,
    getNumberFromString,
    noopPromiseResolve,
} from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

test('Test toRegExp for valid inputs', (assert) => {
    const DEFAULT_VALUE = '.?';
    const defaultRegexp = new RegExp(DEFAULT_VALUE);
    let inputStr;
    let expRegex;

    inputStr = '/abc/';
    expRegex = /abc/;
    assert.deepEqual(toRegExp(inputStr), expRegex);

    inputStr = '/[a-z]{1,9}/';
    expRegex = /[a-z]{1,9}/;
    assert.deepEqual(toRegExp(inputStr), expRegex);

    inputStr = '';
    assert.deepEqual(toRegExp(inputStr), defaultRegexp);
});

test('Test toRegExp for invalid inputs', (assert) => {
    let inputStr;

    assert.throws(() => {
        inputStr = '/\\/';
        toRegExp(inputStr);
    });

    assert.throws(() => {
        inputStr = '/[/';
        toRegExp(inputStr);
    });

    assert.throws(() => {
        inputStr = '/*/';
        toRegExp(inputStr);
    });

    assert.throws(() => {
        inputStr = '/[0-9]++/';
        toRegExp(inputStr);
    });
});

test('Test getNumberFromString for all data types inputs', (assert) => {
    let inputValue;

    // Boolean
    inputValue = true;
    assert.strictEqual(getNumberFromString(inputValue), null);

    // null
    inputValue = null;
    assert.strictEqual(getNumberFromString(inputValue), null);

    // undefined
    inputValue = undefined;
    assert.strictEqual(getNumberFromString(inputValue), null);

    // undefined
    inputValue = undefined;
    assert.strictEqual(getNumberFromString(inputValue), null);

    // number
    inputValue = 123;
    assert.strictEqual(getNumberFromString(inputValue), 123);

    // valid string
    inputValue = '123parsable';
    assert.strictEqual(getNumberFromString(inputValue), 123);

    // invalid string
    inputValue = 'not parsable 123';
    assert.strictEqual(getNumberFromString(inputValue), null);

    // object
    inputValue = { test: 'test' };
    assert.strictEqual(getNumberFromString(inputValue), null);

    // array
    inputValue = ['test'];
    assert.strictEqual(getNumberFromString(inputValue), null);
});

test('Test noopPromiseResolve for valid response.body values', async (assert) => {
    const objResponse = await noopPromiseResolve('emptyObj');
    const objBody = await objResponse.json();

    const arrResponse = await noopPromiseResolve('emptyArr');
    const arrBody = await arrResponse.json();

    assert.ok(typeof objBody === 'object' && !objBody.length);
    assert.ok(Array.isArray(arrBody) && !arrBody.length);
});
