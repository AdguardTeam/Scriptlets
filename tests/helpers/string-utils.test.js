import { toRegExp, inferValue } from '../../src/helpers';

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

test('Test toRegExp for escaped inputs', (assert) => {
    /**
     * For cases where scriptlet rule argument has escaped quotes
     * e.g #%#//scriptlet('prevent-setTimeout', '.css(\'display\',\'block\');')
     *
     * https://github.com/AdguardTeam/Scriptlets/issues/286
     */

    // Single quotes, escaped
    let inputStr = String.raw`.css(\'display\',\'block\');`;
    let expRegex = /\.css\('display','block'\);/;
    assert.deepEqual(toRegExp(inputStr), expRegex);
    // Single quotes, unescaped
    inputStr = ".css('display','block');";
    assert.deepEqual(toRegExp(inputStr), expRegex);

    // Double quotes, escaped
    inputStr = String.raw`.css(\"display\",\"block\");`;
    expRegex = /\.css\("display","block"\);/;
    assert.deepEqual(toRegExp(inputStr), expRegex);
    // Double quotes, unescaped
    inputStr = '.css("display","block");';
    assert.deepEqual(toRegExp(inputStr), expRegex);
});

test('inferValue works as expected with valid args', (assert) => {
    // convert to number
    let rawString = '1234';
    let expected = 1234;
    let result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to number ok');

    // convert to float
    rawString = '-12.34';
    expected = -12.34;
    result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to float ok');

    // convert to boolean
    rawString = 'false';
    expected = false;
    result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to false ok');

    rawString = 'true';
    expected = true;
    result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to true ok');

    // convert to undefined
    rawString = 'undefined';
    expected = undefined;
    result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to undefined ok');

    // convert to null
    rawString = 'null';
    expected = null;
    result = inferValue(rawString);
    assert.strictEqual(result, expected, 'value to null ok');

    // convert to NaN
    rawString = 'NaN';
    result = inferValue(rawString);
    assert.ok(Number.isNaN(result), 'value to NaN ok');

    // convert to object
    rawString = '{"aaa":123,"bbb":{"ccc":"string"}}';
    expected = {
        aaa: 123,
        bbb: {
            ccc: 'string',
        },
    };
    result = inferValue(rawString);
    assert.deepEqual(result, expected, 'value to object ok');

    // convert to array
    rawString = '[1,2,"string"]';
    expected = [1, 2, 'string'];
    result = inferValue(rawString);
    assert.deepEqual(result, expected, 'value to array ok');
});
