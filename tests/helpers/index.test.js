import {
    toRegExp,
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
