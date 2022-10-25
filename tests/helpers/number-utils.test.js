import { getNumberFromString } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

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
