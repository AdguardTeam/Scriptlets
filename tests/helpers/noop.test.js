/**
 * @file Tests for noop helper functions should be run by QUint,
 * not by Jest because jsdom does not support Request which is needed for noopPromiseResolve()
 */

import {
    noopPromiseResolve,
    noopCallbackFunc,
    noopFunc,
    throwFunc,
} from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects noop helpers';

module(name);

test('Test noopPromiseResolve for valid response props', async (assert) => {
    const TEST_URL = 'url';
    const TEST_TYPE = 'opaque';
    const objResponse = await noopPromiseResolve('{}');
    const objBody = await objResponse.json();

    const arrResponse = await noopPromiseResolve('[]');
    const arrBody = await arrResponse.json();

    const responseWithUrl = await noopPromiseResolve('{}', TEST_URL);
    const responseWithType = await noopPromiseResolve('{}', '', TEST_TYPE);

    assert.ok(responseWithUrl.url === TEST_URL);
    assert.ok(typeof objBody === 'object' && !objBody.length);
    assert.ok(Array.isArray(arrBody) && !arrBody.length);
    assert.strictEqual(responseWithType.type, TEST_TYPE);
});

test('noopCallbackFunc returns noopFunc', async (assert) => {
    const func = noopCallbackFunc();
    assert.ok(typeof func === 'function', 'returns function');
    assert.strictEqual(func.toString(), noopFunc.toString(), 'returns empty function');
    assert.strictEqual(func(), undefined, 'function returns undefined');
});

test('throwFunc throws an error', async (assert) => {
    assert.throws(() => throwFunc(), 'throwFunc throws an error');
});
